
'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

import { useTranslations } from 'next-intl';

interface FeaturedPostProps {
    post: {
        slug: string;
        title: string;
        excerpt: string;
        author: { name: string; avatar?: string };
        category: { name: string };
        publishedAt: string;
        readTime: string;
        coverImage?: string;
    };
}

export function FeaturedPost({ post }: FeaturedPostProps) {
    const t = useTranslations('blog');

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="relative w-full overflow-hidden rounded-3xl bg-secondary/10 border border-border/50 group"
        >
            <div className="grid md:grid-cols-2 gap-0">
                <div className="relative h-64 md:h-auto overflow-hidden">
                    {/* Fallback pattern if no image */}
                    <div className={`absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/5 to-secondary w-full h-full transition-transform duration-700 group-hover:scale-105`} />

                    {/* If actual image exists, we would use Next/Image here */}
                    {post.coverImage && (
                        <img
                            src={post.coverImage}
                            alt={post.title}
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                    )}

                    <Badge className="absolute top-6 left-6 z-10 bg-background/90 text-foreground backdrop-blur-md hover:bg-background/100 transition-colors">
                        Featured
                    </Badge>
                </div>

                <div className="flex flex-col justify-center p-8 md:p-12 space-y-6 bg-card/60 backdrop-blur-sm">
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <Badge variant="outline" className="rounded-full px-3 text-primary border-primary/20 bg-primary/5">
                            {post.category.name}
                        </Badge>
                        <div className="flex items-center">
                            <Calendar className="mr-1.5 h-3.5 w-3.5" />
                            {post.publishedAt}
                        </div>
                        <div className="flex items-center">
                            <Clock className="mr-1.5 h-3.5 w-3.5" />
                            {post.readTime}
                        </div>
                    </div>

                    <Link href={`/blog/${post.slug}`} className="group/title">
                        <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight group-hover/title:text-primary transition-colors">
                            {post.title}
                        </h2>
                    </Link>

                    <p className="text-lg text-muted-foreground leading-relaxed line-clamp-3">
                        {post.excerpt}
                    </p>

                    <div className="flex items-center justify-between pt-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center font-bold text-primary">
                                {post.author.name.charAt(0)}
                            </div>
                            <div className="text-sm font-medium">
                                {post.author.name}
                                <div className="text-muted-foreground text-xs font-normal">{t('author')}</div>
                            </div>
                        </div>

                        <Button variant="ghost" className="group/btn" asChild>
                            <Link href={`/blog/${post.slug}`}>
                                {t('readArticle')} <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
