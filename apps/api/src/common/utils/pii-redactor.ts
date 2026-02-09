/**
 * PII Redaction utility for logging
 * Strips sensitive data (tokens, emails, passwords, JWTs, card numbers, MFA codes)
 * from strings before they are logged.
 */

const BODY_PII_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /"password"\s*:\s*"[^"]*"/gi, replacement: '"password":"[REDACTED]"' },
  { pattern: /"currentPassword"\s*:\s*"[^"]*"/gi, replacement: '"currentPassword":"[REDACTED]"' },
  { pattern: /"newPassword"\s*:\s*"[^"]*"/gi, replacement: '"newPassword":"[REDACTED]"' },
  { pattern: /"refreshToken"\s*:\s*"[^"]*"/gi, replacement: '"refreshToken":"[REDACTED]"' },
  { pattern: /"accessToken"\s*:\s*"[^"]*"/gi, replacement: '"accessToken":"[REDACTED]"' },
  { pattern: /"mfaSecret"\s*:\s*"[^"]*"/gi, replacement: '"mfaSecret":"[REDACTED]"' },
  { pattern: /"code"\s*:\s*"\d{4,8}"/g, replacement: '"code":"[REDACTED]"' },
  { pattern: /\b\d{13,19}\b/g, replacement: '[CARD_REDACTED]' },
  { pattern: /eyJ[\w\-\.]{20,}/g, replacement: '[JWT_REDACTED]' },
];

const SENSITIVE_QUERY_KEYS = ['token', 'code', 'key', 'secret', 'password', 'reset', 'verify'];

/**
 * Redacts sensitive query parameters from a URL path.
 */
export function redactUrl(url: string): string {
  const qIndex = url.indexOf('?');
  if (qIndex === -1) return url;

  const path = url.substring(0, qIndex);
  const queryString = url.substring(qIndex + 1);
  const params = queryString.split('&').map((param) => {
    const eqIndex = param.indexOf('=');
    if (eqIndex === -1) return param;
    const key = param.substring(0, eqIndex).toLowerCase();
    if (SENSITIVE_QUERY_KEYS.some((sk) => key.includes(sk))) {
      return `${param.substring(0, eqIndex)}=[REDACTED]`;
    }
    return param;
  });

  return `${path}?${params.join('&')}`;
}

/**
 * Redacts PII patterns from a string (typically a serialized request body or log message).
 */
export function redactPii(input: string): string {
  let result = input;
  for (const { pattern, replacement } of BODY_PII_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}
