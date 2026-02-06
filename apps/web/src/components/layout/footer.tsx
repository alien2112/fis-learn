import Link from 'next/link';
import { GraduationCap, Facebook, Twitter, Linkedin, Youtube } from 'lucide-react';
import { useTranslations } from 'next-intl';

const socialIcons = {
  facebook: Facebook,
  twitter: Twitter,
  linkedin: Linkedin,
  youtube: Youtube,
};

export function Footer() {
  const t = useTranslations('footer');

  const footerSections = [
    {
      title: t('platform'),
      links: [
        { href: '/courses', label: t('browseCourses') },
        { href: '/instructors', label: t('becomeInstructor') },
        { href: '/pricing', label: t('pricing') },
        { href: '/enterprise', label: t('forEnterprise') },
      ],
    },
    {
      title: t('company'),
      links: [
        { href: '/about', label: t('aboutUs') },
        { href: '/careers', label: t('careers') },
        { href: '/blog', label: t('blog') },
        { href: '/press', label: t('press') },
      ],
    },
    {
      title: t('support'),
      links: [
        { href: '/contact', label: t('contactUs') },
        { href: '/help', label: t('helpCenter') },
        { href: '/faq', label: t('faq') },
        { href: '/community', label: t('community') },
      ],
    },
    {
      title: t('legal'),
      links: [
        { href: '/privacy', label: t('privacy') },
        { href: '/terms', label: t('terms') },
        { href: '/cookies', label: t('cookiePolicy') },
      ],
    },
  ];

  const socialLinks = [
    { href: 'https://facebook.com', icon: 'facebook', label: t('facebook') },
    { href: 'https://twitter.com', icon: 'twitter', label: t('twitter') },
    { href: 'https://linkedin.com', icon: 'linkedin', label: t('linkedin') },
    { href: 'https://youtube.com', icon: 'youtube', label: t('youtube') },
  ];

  return (
    <footer className="bg-muted/40 border-t">
      <div className="container py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center space-x-2">
              <GraduationCap className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">FIS Learn</span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground">{t('tagline')}</p>
            <div className="flex space-x-4 mt-6">
              {socialLinks.map((social) => {
                const Icon = socialIcons[social.icon as keyof typeof socialIcons];
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors"
                    aria-label={social.label}
                  >
                    <Icon className="h-5 w-5" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Footer Sections */}
          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className="font-semibold mb-4">{section.title}</h3>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} FIS Learn. {t('rights')}.
            </p>
            <p className="text-sm text-muted-foreground">{t('madeWith')}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
