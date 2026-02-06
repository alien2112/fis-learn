'use client';

import { motion } from 'framer-motion';
import { Target, Heart, Users, Globe, Shield, Sparkles } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { useTranslations } from 'next-intl';

export function ValuesSection() {
    const t = useTranslations('about.values');
    const values = [
        { icon: Target, titleKey: 'excellence.title', descKey: 'excellence.description' },
        { icon: Heart, titleKey: 'passion.title', descKey: 'passion.description' },
        { icon: Users, titleKey: 'community.title', descKey: 'community.description' },
        { icon: Globe, titleKey: 'inclusivity.title', descKey: 'inclusivity.description' },
        { icon: Shield, titleKey: 'integrity.title', descKey: 'integrity.description' },
        { icon: Sparkles, titleKey: 'innovation.title', descKey: 'innovation.description' },
    ];

    return (
        <section className="py-24 bg-secondary/20">
            <div className="container">
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <motion.h2
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-3xl md:text-4xl font-bold tracking-tight mb-4"
                    >
                        {t('title')}
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-lg text-muted-foreground"
                    >
                        {t('subtitle')}
                    </motion.p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {values.map((value, index) => (
                        <motion.div
                            key={value.titleKey}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <GlassCard hoverEffect className="h-full p-8 flex flex-col items-start bg-background/60">
                                <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center mb-6 text-primary">
                                    <value.icon className="h-6 w-6" />
                                </div>
                                <h3 className="text-xl font-bold mb-3">{t(value.titleKey)}</h3>
                                <p className="text-muted-foreground leading-relaxed">
                                    {t(value.descKey)}
                                </p>
                            </GlassCard>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
