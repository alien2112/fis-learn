'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Check, ArrowRight, Zap, Target, Users } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

const icons = {
    Zap,
    Users,
    Target,
};

export function FeatureSection() {
    const t = useTranslations('home.features');

    const features = [
        {
            key: 'ownPace',
            icon: 'Zap',
            align: 'right',
            image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=2070&auto=format&fit=crop",
        },
        {
            key: 'mentorship',
            icon: 'Users',
            align: 'left',
            image: "https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=2070&auto=format&fit=crop",
        },
        {
            key: 'projectBased',
            icon: 'Target',
            align: 'right',
            image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop",
        }
    ];

    return (
        <section className="py-16 md:py-24 lg:py-32 relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-1/4 left-0 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] -z-10" />
            <div className="absolute bottom-1/4 right-0 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[100px] -z-10" />

            <div className="container space-y-32">
                {features.map((feature, index) => (
                    <FeatureBlock key={feature.key} feature={feature} index={index} t={t} />
                ))}
            </div>
        </section>
    );
}

function FeatureBlock({ feature, index, t }: { feature: any, index: number, t: any }) {
    const isEven = index % 2 === 0;
    const Icon = icons[feature.icon as keyof typeof icons];

    const title = t(`${feature.key}.title`);
    const description = t(`${feature.key}.description`);
    const points = [
        t(`${feature.key}.points.0`),
        t(`${feature.key}.points.1`),
        t(`${feature.key}.points.2`),
    ];
    const firstWord = title.split(' ')[0];

    return (
        <div className={`flex flex-col ${isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-12 lg:gap-24 items-center`}>

            {/* Text Content */}
            <motion.div
                initial={{ opacity: 0, x: isEven ? -50 : 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="flex-1 space-y-8"
            >
                <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-xl text-primary w-fit">
                    <Icon className="h-6 w-6" />
                </div>

                <div className="space-y-4">
                    <h2 className="text-3xl md:text-5xl font-bold tracking-tight">{title}</h2>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                        {description}
                    </p>
                </div>

                <ul className="space-y-4">
                    {points.map((point: string, i: number) => (
                        <motion.li
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2 + (i * 0.1) }}
                            className="flex items-center gap-3"
                        >
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center text-green-600">
                                <Check className="w-3.5 h-3.5" />
                            </div>
                            <span className="font-medium text-foreground/90">{point}</span>
                        </motion.li>
                    ))}
                </ul>

                <div className="pt-2">
                    <Button variant="ghost" className="group text-primary px-0 hover:bg-transparent hover:text-primary/80">
                        {t(`${feature.key}.learnMore`, { feature: firstWord })} <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </Button>
                </div>
            </motion.div>

            {/* Visual Content */}
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="flex-1 w-full"
            >
                <div className="relative aspect-square md:aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl border border-border/50 bg-muted">
                    <Image
                        src={feature.image}
                        alt={title}
                        fill
                        className="object-cover transition-transform duration-700 hover:scale-105"
                    />

                    {/* Decorative Elements on top of image */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                </div>
            </motion.div>
        </div>
    )
}
