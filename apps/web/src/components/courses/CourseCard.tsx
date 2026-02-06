'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { Star, BookOpen, ArrowRight } from 'lucide-react';
import { InstructorAvatar } from './InstructorAvatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useTranslations } from 'next-intl';

export interface Course {
    id: string;
    title: string;
    slug: string;
    thumbnail?: string | null;
    category?: string | null;
    categorySlug?: string | null;
    level?: string | null;
    meta?: string | null;
    rating?: number | null;
    reviewCount?: number | null;
    price?: number | null;
    pricingModel?: 'FREE' | 'PAID' | 'ACCESS_CODE_ONLY' | string | null;
    enrollmentCount?: number | null;
    instructor: {
        name: string;
        avatar?: string | null;
    };
}


interface CourseCardProps {
    course: Course;
    index?: number;
}

export function CourseCard({ course, index = 0 }: CourseCardProps) {
    const t = useTranslations('courses.card');

    const priceLabel =
        course.pricingModel === 'FREE'
            ? t('free')
            : typeof course.price === 'number'
                ? `$${course.price}`
                : course.pricingModel === 'ACCESS_CODE_ONLY'
                    ? t('accessCode')
                    : t('paid');

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1, duration: 0.4 }}
            whileHover={{ y: -5 }}
            className="h-full"
        >
            <Link href={`/courses/${course.slug}`} className="block h-full group">
                <Card className="h-full flex flex-col overflow-hidden border-border/50 bg-card hover:shadow-lg transition-all duration-300">
                    {/* Image Section */}
                    <div className="relative aspect-video w-full overflow-hidden">
                        {course.thumbnail ? (
                            <motion.div
                                className="absolute inset-0"
                                whileHover={{ scale: 1.05 }}
                                transition={{ duration: 0.4 }}
                            >
                                <Image
                                    src={course.thumbnail}
                                    alt={course.title}
                                    fill
                                    className="object-cover transition-transform duration-300"
                                />
                            </motion.div>
                        ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-muted/30 to-background flex items-center justify-center">
                                <BookOpen className="h-10 w-10 text-primary/60" />
                            </div>
                        )}

                        {/* Overlay Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />

                        {/* Level Badge */}
                        {course.level ? (
                            <div className="absolute top-3 right-3">
                                <Badge variant="secondary" className="bg-background/90 backdrop-blur text-xs font-medium shadow-sm">
                                    {course.level}
                                </Badge>
                            </div>
                        ) : null}
                    </div>

                    {/* Content Section */}
                    <div className="flex flex-col flex-grow p-5 relative">
                        {/* Instructor Avatar - Overlapping */}
                        <div className="absolute -top-6 right-5 z-10">
                            {/* Moved Avatar to overlap image boundary for "Pop" effect */}
                            <InstructorAvatar
                                src={course.instructor.avatar}
                                name={course.instructor.name}
                                size="md"
                                className="shadow-lg ring-2 ring-background"
                            />
                        </div>

                        {/* Category & Meta */}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                            {course.category ? (
                                <span className="font-semibold text-primary uppercase tracking-wider">
                                    {course.category}
                                </span>
                            ) : null}
                            {course.category && course.meta ? <span>|</span> : null}
                            {course.meta ? (
                                <div className="flex items-center gap-1">
                                    <BookOpen className="w-3 h-3" />
                                    <span>{course.meta}</span>
                                </div>
                            ) : null}
                        </div>
                        {/* Title */}
                        <h3 className="text-lg font-bold leading-tight mb-2 group-hover:text-primary transition-colors line-clamp-2">
                            {course.title}
                        </h3>

                        {/* Rating */}
                        {typeof course.rating === 'number' ? (
                            <div className="flex items-center gap-1 mb-4 mt-auto">
                                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                <span className="text-sm font-medium">{course.rating.toFixed(1)}</span>
                                {course.reviewCount ? (
                                    <span className="text-xs text-muted-foreground">({course.reviewCount})</span>
                                ) : null}
                            </div>
                        ) : typeof course.enrollmentCount === 'number' ? (
                            <div className="mb-4 mt-auto text-sm text-muted-foreground">
                                {course.enrollmentCount.toLocaleString()} {t('enrolled')}
                            </div>
                        ) : null}

                        {/* Instructor Name (Mobile/Text context) */}
                        <div className="text-sm text-muted-foreground mb-4">
                            {t('by')} <span className="font-medium text-foreground">{course.instructor.name}</span>
                        </div>

                    </div>

                    {/* Footer */}
                    <div className="p-5 pt-0 mt-auto flex items-center justify-between border-t border-border/50 pt-4">
                        <div className="font-bold text-lg">
                            {priceLabel}
                        </div>
                        <div className="text-primary font-medium text-sm flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0 duration-300">
                            {t('viewDetails')} <ArrowRight className="w-4 h-4" />
                        </div>
                    </div>
                </Card>
            </Link>
        </motion.div>
    );
}

