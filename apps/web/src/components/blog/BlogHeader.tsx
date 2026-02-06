
'use client';

import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { motion } from 'framer-motion';

import { useTranslations } from 'next-intl';

export function BlogHeader() {
    const t = useTranslations('blog');

    return (
        <div className="relative py-24 md:py-32 overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[500px] bg-primary/5 rounded-full blur-[120px] -z-10" />

            <div className="container relative z-10">
                <div className="max-w-3xl mx-auto text-center space-y-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
                            {t('title')}
                        </h1>
                        <p className="text-xl text-muted-foreground leading-relaxed">
                            {t('subtitle')}
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2, duration: 0.4 }}
                        className="relative max-w-lg mx-auto"
                    >
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-primary to-purple-600 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input
                                    placeholder={t('searchPlaceholder')}
                                    className="pl-12 h-14 bg-background/90 backdrop-blur border-border/50 text-base shadow-sm rounded-lg"
                                />
                            </div>
                        </div>

                        <div className="mt-4 flex flex-wrap justify-center gap-2 text-sm text-muted-foreground">
                            <span>{t('popular')}</span>
                            <span className="cursor-pointer hover:text-primary underline decoration-dotted underline-offset-4">{t('tags.studyTips')}</span>
                            <span className="cursor-pointer hover:text-primary underline decoration-dotted underline-offset-4">{t('tags.career')}</span>
                            <span className="cursor-pointer hover:text-primary underline decoration-dotted underline-offset-4">{t('tags.tech')}</span>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
