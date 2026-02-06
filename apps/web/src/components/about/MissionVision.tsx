'use client';

import { motion } from 'framer-motion';
import { Target, Eye } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function MissionVision() {
    const t = useTranslations('about');

    return (
        <section className="py-24 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] -z-10" />

            <div className="container">
                <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="space-y-6"
                    >
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center rotate-3 hover:rotate-6 transition-transform">
                            <Target className="h-8 w-8 text-primary" />
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold tracking-tight">{t('mission.title')}</h2>
                        <p className="text-lg text-muted-foreground leading-relaxed">
                            {t('mission.description')}
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="relative"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-secondary to-background rounded-3xl -z-10 transform rotate-2" />
                        <div className="bg-background border border-border/50 p-8 rounded-3xl shadow-sm space-y-6">
                            <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center">
                                <Eye className="h-8 w-8 text-purple-600" />
                            </div>
                            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">{t('vision.title')}</h2>
                            <p className="text-lg text-muted-foreground leading-relaxed">
                                {t('vision.description')}
                            </p>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
