'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

const companies = [
    'Google', 'Microsoft', 'Spotify', 'Amazon', 'Netflix', 'Airbnb', 'Uber', 'Adobe'
];

// Pre-doubled so the JSX render never allocates a new array
const MARQUEE_COMPANIES = [...companies, ...companies];

export function StatsSection() {
    const t = useTranslations('stats');

    const stats = [
        { value: '10k+', label: t('students') },
        { value: '500+', label: t('courses') },
        { value: '100+', label: t('instructors') },
        { value: '4.9', label: t('satisfaction') },
    ];

    return (
        <section className="py-12 border-y bg-background relative z-10">
            <div className="container space-y-12">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                    {stats.map((stat, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1, duration: 0.5 }}
                            className="flex flex-col items-center justify-center text-center space-y-2 group cursor-default"
                        >
                            <div className="text-4xl md:text-5xl font-extrabold text-foreground tracking-tight group-hover:text-primary transition-colors duration-300">
                                {stat.value}
                            </div>
                            <div className="text-sm md:text-base font-medium text-muted-foreground uppercase tracking-wider">
                                {stat.label}
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Trusted By Marquee */}
                <div className="pt-12 border-t">
                    <p className="text-center text-sm font-medium text-muted-foreground uppercase tracking-widest mb-8">
                        {t('trustedBy')}
                    </p>
                    <div className="flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black,transparent)]">
                        <motion.div
                            animate={{ x: "-50%" }}
                            transition={{
                                duration: 20,
                                repeat: Infinity,
                                ease: "linear",
                            }}
                            className="flex gap-16 pr-16 whitespace-nowrap"
                        >
                            {MARQUEE_COMPANIES.map((company, index) => (
                                <span
                                    key={index}
                                    className="text-xl md:text-2xl font-bold text-muted-foreground/40 hover:text-foreground transition-colors cursor-default"
                                >
                                    {company}
                                </span>
                            ))}
                        </motion.div>
                    </div>
                </div>
            </div>
        </section>
    );
}
