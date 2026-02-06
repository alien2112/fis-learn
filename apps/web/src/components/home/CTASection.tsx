'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/auth-context';
import { useTranslations } from 'next-intl';

export function CTASection() {
    const { user, isLoading } = useAuth();
    const t = useTranslations('cta');

    return (
        <section className="py-16 md:py-24 px-4 sm:px-6">
            <div className="container relative rounded-3xl overflow-hidden bg-primary px-6 py-12 md:py-20 text-center sm:px-12 lg:px-20">
                {/* Background Patterns */}
                <div className="absolute inset-0 -z-10 bg-[linear-gradient(110deg,#6366f1,45%,#8b5cf6,55%,#6366f1)] opacity-20" />
                <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />

                <div className="relative mx-auto max-w-3xl space-y-8">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-3xl font-bold tracking-tight text-white sm:text-5xl"
                    >
                        {t('title')}
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-lg text-primary-foreground/90 max-w-2xl mx-auto"
                    >
                        {t('subtitle')}
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="flex flex-col sm:flex-row gap-4 justify-center"
                    >
                        {isLoading ? null : user ? (
                            <Button size="lg" variant="secondary" className="h-14 px-8 text-lg font-semibold rounded-full" asChild>
                                <Link href="/dashboard">
                                    {t('dashboard')} <ArrowRight className="ml-2 h-5 w-5" />
                                </Link>
                            </Button>
                        ) : (
                            <Button size="lg" variant="secondary" className="h-14 px-8 text-lg font-semibold rounded-full" asChild>
                                <Link href="/register">
                                    {t('button')} <ArrowRight className="ml-2 h-5 w-5" />
                                </Link>
                            </Button>
                        )}
                        <Button size="lg" variant="outline" className="h-14 px-8 text-lg bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10 hover:text-white rounded-full" asChild>
                            <Link href="/pricing">
                                {t('pricing')}
                            </Link>
                        </Button>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.4 }}
                        className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-6 text-primary-foreground/80 text-sm"
                    >
                        <div className="flex items-center">
                            <CheckCircle2 className="mr-2 h-4 w-4 text-white" />
                            <span>{t('no-credit-card')}</span>
                        </div>
                        <div className="flex items-center">
                            <CheckCircle2 className="mr-2 h-4 w-4 text-white" />
                            <span>{t('free-trial')}</span>
                        </div>
                        <div className="flex items-center">
                            <CheckCircle2 className="mr-2 h-4 w-4 text-white" />
                            <span>{t('cancel-anytime')}</span>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
