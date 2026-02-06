
'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, ArrowRight } from 'lucide-react';

import { useTranslations } from 'next-intl';

export function Newsletter() {
    const t = useTranslations('blog.newsletter');
    return (
        <section className="py-24">
            <div className="container">
                <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-16 sm:px-12 xl:py-20 text-center">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] opacity-[0.1]" />

                    <div className="relative z-10 max-w-2xl mx-auto space-y-8">
                        <div className="inline-flex items-center justify-center p-3 rounded-xl bg-white/10 text-white mb-4">
                            <Mail className="h-6 w-6" />
                        </div>

                        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                            {t('title')}
                        </h2>

                        <p className="text-lg text-primary-foreground/80">
                            {t('subtitle')}
                        </p>

                        <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto" onSubmit={(e) => e.preventDefault()}>
                            <Input
                                type="email"
                                placeholder={t('placeholder')}
                                className="bg-white/10 text-white placeholder:text-white/60 border-white/20 h-12 focus-visible:ring-offset-0 focus-visible:ring-white/50"
                            />
                            <Button variant="secondary" size="lg" className="h-12 w-full sm:w-auto">
                                {t('button')} <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </form>

                        <p className="text-xs text-primary-foreground/60">
                            لما تشترك، إنت موافق على الشروط والسياسات بتاعتنا.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
