
'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, ArrowUpRight } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';

interface Post {
    slug: string;
    title: string;
    excerpt: string;
    author: { name: string };
    category: { name: string };
    publishedAt: string;
    readTime: string;
}

interface BlogCardProps {
    post: Post;
}

export function BlogCard({ post }: BlogCardProps) {
    return (
        <Link href={`/blog/${post.slug}`} className="group h-full block">
            <GlassCard hoverEffect className="h-full flex flex-col overflow-hidden border-border/70 dark:bg-card/30 bg-white/70">
                <div className="aspect-[16/9] w-full bg-muted relative overflow-hidden">
                    {/* Placeholder gradient/pattern */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-secondary/80 to-muted transition-transform duration-500 group-hover:scale-105" />

                    {/* Decorative icon or abstract shape */}
                    <div className="absolute bottom-4 right-4 p-2 bg-background/80 backdrop-blur-sm rounded-lg opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                        <ArrowUpRight className="h-5 w-5 text-primary" />
                    </div>

                    <Badge
                        variant="secondary"
                        className="absolute top-4 left-4 font-normal bg-background/80 backdrop-blur-sm shadow-sm"
                    >
                        {post.category.name}
                    </Badge>
                </div>

                <div className="flex flex-col flex-1 p-6">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wider">
                        <span>{post.publishedAt}</span>
                        <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                        <span>{post.readTime}</span>
                    </div>

                    <h3 className="text-xl font-bold mb-3 leading-snug group-hover:text-primary transition-colors line-clamp-2">
                        {post.title}
                    </h3>

                    <p className="text-muted-foreground text-sm line-clamp-3 mb-6 flex-1">
                        {post.excerpt}
                    </p>

                    <div className="flex items-center gap-2 pt-4 border-t border-border/50">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                            {post.author.name.charAt(0)}
                        </div>
                        <span className="text-xs font-semibold text-foreground/80">{post.author.name}</span>
                    </div>
                </div>
            </GlassCard>
        </Link>
    );
}
