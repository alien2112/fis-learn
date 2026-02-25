'use client';

import { motion } from 'framer-motion';
import { Linkedin, Twitter, Mail } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface TeamImages {
    sarah?: string;
    michael?: string;
    emily?: string;
    david?: string;
}

interface TeamSectionProps {
    teamImages?: TeamImages;
}

export function TeamSection({ teamImages }: TeamSectionProps) {
    const t = useTranslations('about.team');
    const team = [
        { nameKey: 'sarah.name', roleKey: 'sarah.role', image: teamImages?.sarah || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=1976&auto=format&fit=crop', bioKey: 'sarah.bio' },
        { nameKey: 'michael.name', roleKey: 'michael.role', image: teamImages?.michael || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=2070&auto=format&fit=crop', bioKey: 'michael.bio' },
        { nameKey: 'emily.name', roleKey: 'emily.role', image: teamImages?.emily || 'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=1961&auto=format&fit=crop', bioKey: 'emily.bio' },
        { nameKey: 'david.name', roleKey: 'david.role', image: teamImages?.david || 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=1974&auto=format&fit=crop', bioKey: 'david.bio' },
    ];

    const companies = [
        'Google', 'Microsoft', 'Spotify', 'Amazon', 'Netflix', 'Airbnb', 'Uber', 'Adobe'
    ];

    return (
        <section className="py-24 bg-secondary/20 overflow-hidden">
            <div className="container">
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">{t('title')}</h2>
                    <p className="text-lg text-muted-foreground">
                        {t('subtitle')}
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-24">
                    {team.map((member, index) => (
                        <motion.div
                            key={member.nameKey}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className="group relative"
                        >
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-primary/5 rounded-2xl transform transition-transform duration-300 group-hover:scale-105 -z-10" />
                            <div className="bg-background border border-border/50 rounded-2xl overflow-hidden hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300">
                                <div className="aspect-square relative overflow-hidden bg-muted">
                                    <img
                                        src={member.image}
                                        alt={t(member.nameKey)}
                                        className="object-cover w-full h-full grayscale group-hover:grayscale-0 transition-all duration-700 scale-100 group-hover:scale-110"
                                    />

                                    <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-300 flex justify-center gap-4">
                                        <a href="#" className="p-2 bg-white/20 backdrop-blur-md rounded-full hover:bg-white text-white hover:text-primary transition-colors"><Linkedin className="h-4 w-4" /></a>
                                        <a href="#" className="p-2 bg-white/20 backdrop-blur-md rounded-full hover:bg-white text-white hover:text-primary transition-colors"><Twitter className="h-4 w-4" /></a>
                                        <a href="#" className="p-2 bg-white/20 backdrop-blur-md rounded-full hover:bg-white text-white hover:text-primary transition-colors"><Mail className="h-4 w-4" /></a>
                                    </div>
                                </div>

                                <div className="p-6 text-center relative z-10 bg-background/80 backdrop-blur-sm">
                                    <h3 className="font-bold text-lg mb-1">{t(member.nameKey)}</h3>
                                    <p className="text-primary text-sm font-medium mb-3">{t(member.roleKey)}</p>
                                    <p className="text-muted-foreground text-sm line-clamp-3">
                                        {t(member.bioKey)}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Alumni/Partners Marquee */}
                <div className="border-t border-border/50 pt-16">
                    <p className="text-center text-sm font-medium text-muted-foreground uppercase tracking-widest mb-10">
                        {t('alumniTitle')}
                    </p>
                    <div className="flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black,transparent)]">
                        <motion.div
                            animate={{ x: "-50%" }}
                            transition={{
                                duration: 25,
                                repeat: Infinity,
                                ease: "linear",
                            }}
                            className="flex gap-16 pr-16 whitespace-nowrap opacity-60 hover:opacity-100 transition-opacity duration-300"
                        >
                            {[...companies, ...companies].map((company, index) => (
                                <span
                                    key={index}
                                    className="text-2xl md:text-3xl font-bold text-foreground/20 hover:text-primary transition-colors cursor-default"
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
