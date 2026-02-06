'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

export function TimelineSection() {
    const t = useTranslations('about.journey');
    const milestones = [
        { year: '2020', titleKey: '2020.title', descKey: '2020.description' },
        { year: '2021', titleKey: '2021.title', descKey: '2021.description' },
        { year: '2022', titleKey: '2022.title', descKey: '2022.description' },
        { year: '2023', titleKey: '2023.title', descKey: '2023.description' },
        { year: '2024', titleKey: '2024.title', descKey: '2024.description' },
    ];

    return (
        <section className="py-24 relative">
            <div className="container">
                <div className="text-center max-w-2xl mx-auto mb-20">
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">{t('title')}</h2>
                    <p className="text-lg text-muted-foreground">{t('subtitle')}</p>
                </div>

                <div className="relative max-w-4xl mx-auto">
                    <div className="absolute left-[20px] md:left-1/2 top-0 bottom-0 w-px bg-border md:-translate-x-1/2" />

                    <div className="space-y-12">
                        {milestones.map((milestone, index) => (
                            <motion.div
                                key={milestone.year}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                                className={`relative flex flex-col md:flex-row gap-8 items-start md:items-center ${index % 2 === 0 ? 'md:flex-row-reverse' : ''
                                    }`}
                            >
                                <div className="absolute left-[20px] md:left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-primary ring-4 ring-background" />

                                <div className="pl-12 md:pl-0 md:w-1/2 flex flex-col items-start gap-1">
                                    <div className={`${index % 2 === 0 ? 'md:items-start md:text-left' : 'md:items-end md:text-right'} w-full flex flex-col`}>
                                        <span className="text-primary font-bold text-2xl mb-1 block">{milestone.year}</span>
                                        <h3 className="text-lg font-bold text-foreground">{t(milestone.titleKey)}</h3>
                                        <p className="text-muted-foreground mt-1 text-base leading-relaxed md:max-w-xs">{t(milestone.descKey)}</p>
                                    </div>
                                </div>

                                <div className="hidden md:block md:w-1/2" />
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
