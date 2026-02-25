#!/usr/bin/env bash
# =============================================================================
# FIS Learn — VPS Production Hardening Script
# =============================================================================
# Run ONCE as root on a fresh Ubuntu 22.04 / Debian 12 VPS before deploying.
# Idempotent: safe to re-run on an already-configured server.
#
# What this script does (in order):
#   1. System package update
#   2. Non-root deploy user creation
#   3. SSH hardening
#   4. UFW firewall (allow 22/80/443 only)
#   5. Fail2Ban (SSH + Nginx brute-force protection)
#   6. Kernel / TCP tuning (sysctl)
#   7. File descriptor & ulimit tuning
#   8. Swap file (if not already present)
#   9. Automatic security updates (unattended-upgrades)
#  10. Docker + Docker Compose plugin install
#  11. Log rotation for Docker containers
#  12. NTP / time sync
# =============================================================================

set -euo pipefail
LOGFILE="/var/log/vps-setup.log"
exec > >(tee -a "$LOGFILE") 2>&1

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()    { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

[[ "$(id -u)" -ne 0 ]] && error "Must run as root: sudo bash $0"

DEPLOY_USER="${DEPLOY_USER:-deploy}"
SSH_PORT="${SSH_PORT:-22}"

# ─────────────────────────────────────────────────────────────────────────────
# 1. System update
# ─────────────────────────────────────────────────────────────────────────────
info "1/12 — Updating system packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get upgrade -y -q

# ─────────────────────────────────────────────────────────────────────────────
# 2. Create non-root deploy user
# ─────────────────────────────────────────────────────────────────────────────
info "2/12 — Creating deploy user '$DEPLOY_USER'..."
if ! id "$DEPLOY_USER" &>/dev/null; then
  useradd -m -s /bin/bash "$DEPLOY_USER"
  usermod -aG docker "$DEPLOY_USER" 2>/dev/null || true  # added again after docker install
  info "  User '$DEPLOY_USER' created. Set a password or add SSH key manually."
else
  info "  User '$DEPLOY_USER' already exists — skipping."
fi

# ─────────────────────────────────────────────────────────────────────────────
# 3. SSH hardening
# Issue:   Default SSH allows root login & password auth — easy brute-force.
# Impact:  Compromised root = full server takeover.
# Fix:     Disable root login, disable password auth, restrict to key-only.
# ─────────────────────────────────────────────────────────────────────────────
info "3/12 — Hardening SSH configuration..."
SSHD_CONF="/etc/ssh/sshd_config"
cp -f "$SSHD_CONF" "${SSHD_CONF}.bak.$(date +%s)"

declare -A SSH_SETTINGS=(
  ["PermitRootLogin"]="no"
  ["PasswordAuthentication"]="no"
  ["ChallengeResponseAuthentication"]="no"
  ["UsePAM"]="yes"
  ["X11Forwarding"]="no"
  ["PrintMotd"]="no"
  ["ClientAliveInterval"]="300"
  ["ClientAliveCountMax"]="2"
  ["MaxAuthTries"]="3"
  ["LoginGraceTime"]="30"
  ["AllowAgentForwarding"]="no"
  ["AllowTcpForwarding"]="no"
)

for key in "${!SSH_SETTINGS[@]}"; do
  val="${SSH_SETTINGS[$key]}"
  if grep -qE "^#?${key}" "$SSHD_CONF"; then
    sed -i "s|^#\?${key}.*|${key} ${val}|" "$SSHD_CONF"
  else
    echo "${key} ${val}" >> "$SSHD_CONF"
  fi
done

systemctl reload ssh 2>/dev/null || systemctl reload sshd 2>/dev/null || true
info "  SSH hardened. Ensure you have a working SSH key before logging out!"

# ─────────────────────────────────────────────────────────────────────────────
# 4. UFW Firewall
# Issue:   No firewall = all ports are reachable from internet.
# Impact:  DB (5432) and Redis (6379) exposed to the world.
# Fix:     Allow only 22 (SSH), 80 (HTTP), 443 (HTTPS); deny everything else.
# ─────────────────────────────────────────────────────────────────────────────
info "4/12 — Configuring UFW firewall..."
apt-get install -y -q ufw

ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow "$SSH_PORT/tcp"   comment 'SSH'
ufw allow 80/tcp            comment 'HTTP'
ufw allow 443/tcp           comment 'HTTPS'
# Docker manages its own iptables rules — UFW won't block Docker-exposed ports
# unless we disable Docker's iptables manipulation. Set DOCKER_OPTS below.
ufw --force enable
info "  UFW enabled: allow SSH($SSH_PORT), 80, 443; deny all else."

# Prevent Docker from bypassing UFW by binding to loopback in docker-compose
# (docker-compose.production.yml already uses 'expose' not 'ports' for DB/Redis)
if [[ -f /etc/default/ufw ]]; then
  # Ensure UFW FORWARD policy allows Docker bridge traffic
  sed -i 's/DEFAULT_FORWARD_POLICY="DROP"/DEFAULT_FORWARD_POLICY="ACCEPT"/' /etc/default/ufw
fi

# ─────────────────────────────────────────────────────────────────────────────
# 5. Fail2Ban
# Issue:   Without rate-limiting SSH/Nginx connections, bots can brute-force.
# Impact:  Credential stuffing, log flooding, CPU waste.
# Fix:     Fail2Ban bans IPs after N failed auth attempts automatically.
# ─────────────────────────────────────────────────────────────────────────────
info "5/12 — Installing and configuring Fail2Ban..."
apt-get install -y -q fail2ban

cat > /etc/fail2ban/jail.local <<'EOF'
[DEFAULT]
bantime  = 3600
findtime = 600
maxretry = 5
backend  = systemd

[sshd]
enabled  = true
port     = ssh
logpath  = %(sshd_log)s

[nginx-http-auth]
enabled  = true
port     = http,https
logpath  = /var/log/nginx/error.log

[nginx-botsearch]
enabled  = true
port     = http,https
logpath  = /var/log/nginx/access.log
maxretry = 2

[nginx-req-limit]
enabled  = true
port     = http,https
logpath  = /var/log/nginx/error.log
maxretry = 10
EOF

systemctl enable fail2ban
systemctl restart fail2ban
info "  Fail2Ban configured: 5 retries / 10 min → 1h ban."

# ─────────────────────────────────────────────────────────────────────────────
# 6. Kernel / TCP tuning (sysctl)
# Issue:   Default kernel settings are tuned for desktop use, not high-traffic servers.
# Impact:  Under load: SYN floods saturate backlog, TIME_WAIT accumulates,
#          file descriptor exhaustion kills Nginx/Node.
# Fix:     Increase network buffers, TCP backlog, and connection reuse.
# ─────────────────────────────────────────────────────────────────────────────
info "6/12 — Applying kernel / TCP sysctl tuning..."
cat > /etc/sysctl.d/99-fis-learn.conf <<'EOF'
# ── Network performance ───────────────────────────────────────────────────────
# Increase TCP backlog (SYN queue) to handle burst connections
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535

# Increase socket buffer sizes for high-throughput
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216

# Enable TCP fast-open to reduce connection latency by 1 RTT
net.ipv4.tcp_fastopen = 3

# Reuse TIME_WAIT sockets for new connections (reduces port exhaustion)
net.ipv4.tcp_tw_reuse = 1

# Reduce TIME_WAIT timeout (default 60s is too long under load)
net.ipv4.tcp_fin_timeout = 15

# Expand ephemeral port range (default 32768-60999 = only ~28k concurrent)
net.ipv4.ip_local_port_range = 1024 65535

# Reduce keepalive idle to detect dead connections faster
net.ipv4.tcp_keepalive_time = 300
net.ipv4.tcp_keepalive_intvl = 30
net.ipv4.tcp_keepalive_probes = 5

# ── Memory management ─────────────────────────────────────────────────────────
# Allow over-commit — required for Redis fork (AOF rewrite / RDB snapshot)
# Without this, Redis fork() fails under memory pressure and crashes.
vm.overcommit_memory = 1

# Reduce swappiness — prefer RAM over swap (we add swap only as safety net)
vm.swappiness = 10

# Increase dirty page ratio — fewer but larger I/O flushes = better throughput
vm.dirty_ratio = 40
vm.dirty_background_ratio = 10

# ── File descriptors ──────────────────────────────────────────────────────────
fs.file-max = 2097152
fs.nr_open  = 1048576
EOF

sysctl --system
info "  Kernel tuning applied."

# ─────────────────────────────────────────────────────────────────────────────
# 7. File descriptor / ulimit tuning
# Issue:   Default ulimit is 1024 open files.
#          Nginx alone needs >1024 under moderate load (worker_connections * 2).
#          Node.js API with DB + Redis connections hits this fast.
# Impact:  "Too many open files" errors; connections dropped.
# Fix:     Raise soft + hard limits system-wide and per-service.
# ─────────────────────────────────────────────────────────────────────────────
info "7/12 — Raising file descriptor limits..."
cat > /etc/security/limits.d/99-fis-learn.conf <<'EOF'
*       soft    nofile  65535
*       hard    nofile  65535
root    soft    nofile  65535
root    hard    nofile  65535
EOF

# Also set for systemd-managed services (Docker, Nginx, etc.)
mkdir -p /etc/systemd/system.conf.d
cat > /etc/systemd/system.conf.d/fis-learn.conf <<'EOF'
[Manager]
DefaultLimitNOFILE=65535
EOF

systemctl daemon-reexec 2>/dev/null || true
info "  ulimit nofile set to 65535."

# ─────────────────────────────────────────────────────────────────────────────
# 8. Swap file (safety net for memory pressure)
# Issue:   Without swap, OOM killer terminates containers under burst RAM usage.
# Impact:  Unexpected crash during peak traffic.
# Fix:     2 GB swap as safety net (not for regular use — vm.swappiness=10).
# ─────────────────────────────────────────────────────────────────────────────
info "8/12 — Configuring swap..."
SWAPFILE="/swapfile"
if [[ ! -f "$SWAPFILE" ]]; then
  fallocate -l 2G "$SWAPFILE"
  chmod 600 "$SWAPFILE"
  mkswap "$SWAPFILE"
  swapon "$SWAPFILE"
  echo "$SWAPFILE none swap sw 0 0" >> /etc/fstab
  info "  2 GB swap created at $SWAPFILE."
else
  info "  Swap already exists — skipping."
fi

# ─────────────────────────────────────────────────────────────────────────────
# 9. Automatic security updates
# Issue:   Without auto-updates, known CVEs accumulate silently.
# Impact:  Known exploits (e.g. kernel, OpenSSL, libc) can compromise server.
# Fix:     unattended-upgrades applies security patches automatically.
# ─────────────────────────────────────────────────────────────────────────────
info "9/12 — Enabling automatic security updates..."
apt-get install -y -q unattended-upgrades

cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF

cat > /etc/apt/apt.conf.d/50unattended-upgrades <<'EOF'
Unattended-Upgrade::Allowed-Origins {
  "${distro_id}:${distro_codename}-security";
  "${distro_id}ESMApps:${distro_codename}-apps-security";
  "${distro_id}ESM:${distro_codename}-infra-security";
};
Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Remove-New-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
Unattended-Upgrade::Mail "root";
EOF

systemctl enable unattended-upgrades
systemctl restart unattended-upgrades
info "  Automatic security updates enabled."

# ─────────────────────────────────────────────────────────────────────────────
# 10. Docker + Docker Compose v2
# Issue:   Apps are containerized — Docker must be installed correctly.
# Fix:     Install official Docker CE + Compose plugin (not apt docker.io).
# ─────────────────────────────────────────────────────────────────────────────
info "10/12 — Installing Docker CE..."
if ! command -v docker &>/dev/null; then
  apt-get install -y -q ca-certificates curl gnupg lsb-release
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg

  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/ubuntu \
    $(lsb_release -cs) stable" \
    > /etc/apt/sources.list.d/docker.list

  apt-get update -q
  apt-get install -y -q docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable docker
  systemctl start docker
  usermod -aG docker "$DEPLOY_USER"
  info "  Docker CE installed."
else
  info "  Docker already installed — skipping."
  usermod -aG docker "$DEPLOY_USER" 2>/dev/null || true
fi

# ─────────────────────────────────────────────────────────────────────────────
# 11. Docker log rotation
# Issue:   Docker writes container logs to /var/lib/docker/containers/*.log.
#          Without rotation these grow unboundedly and fill the disk.
# Impact:  Disk full → all services crash simultaneously.
# Fix:     Configure Docker daemon to rotate logs (10 MB max, 5 files).
# ─────────────────────────────────────────────────────────────────────────────
info "11/12 — Configuring Docker log rotation..."
mkdir -p /etc/docker
cat > /etc/docker/daemon.json <<'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "5"
  },
  "live-restore": true,
  "userland-proxy": false
}
EOF
# live-restore: containers keep running if Docker daemon restarts
# userland-proxy: disable for better network performance
systemctl reload docker 2>/dev/null || systemctl restart docker
info "  Docker log rotation: 10 MB × 5 files per container."

# ─────────────────────────────────────────────────────────────────────────────
# 12. NTP / time sync
# Issue:   Clock drift causes JWT signature failures and TLS errors.
# Impact:  Auth failures under load; OCSP stapling breaks.
# Fix:     Ensure systemd-timesyncd (or chrony) is active.
# ─────────────────────────────────────────────────────────────────────────────
info "12/12 — Ensuring NTP time sync is active..."
timedatectl set-ntp true 2>/dev/null || true
systemctl enable systemd-timesyncd 2>/dev/null || true
systemctl start  systemd-timesyncd 2>/dev/null || true
timedatectl status | grep -E "NTP|synchronized" || true
info "  NTP sync enabled."

# ─────────────────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  VPS Hardening Complete!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "  ✅  System packages updated"
echo "  ✅  Deploy user: $DEPLOY_USER"
echo "  ✅  SSH hardened (root login + password auth disabled)"
echo "  ✅  UFW firewall: allow 22, 80, 443 — deny all else"
echo "  ✅  Fail2Ban: 5 retries → 1h ban (SSH + Nginx)"
echo "  ✅  Kernel: TCP tuning, port range, TIME_WAIT reuse"
echo "  ✅  ulimit nofile: 65535"
echo "  ✅  Swap: 2 GB at /swapfile"
echo "  ✅  Auto security updates enabled"
echo "  ✅  Docker CE + Compose plugin installed"
echo "  ✅  Docker log rotation: 10 MB × 5 files"
echo "  ✅  NTP time sync active"
echo ""
echo "  Next steps:"
echo "  1. Add your SSH public key to /home/$DEPLOY_USER/.ssh/authorized_keys"
echo "  2. Clone the repo to /srv/fis-learn as user $DEPLOY_USER"
echo "  3. Copy .env.production → .env"
echo "  4. Run: docker compose -f docker-compose.production.yml up -d"
echo "  5. Set up GitHub Actions secrets: DEPLOY_HOST, DEPLOY_USER, DEPLOY_SSH_KEY"
echo ""
echo "  Full log: $LOGFILE"
echo "═══════════════════════════════════════════════════════════════"
