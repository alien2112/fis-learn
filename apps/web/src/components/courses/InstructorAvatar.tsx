'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface InstructorAvatarProps {
    src?: string | null;
    name: string;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}

export function InstructorAvatar({ src, name, className, size = 'md' }: InstructorAvatarProps) {
    const sizeClasses = {
        sm: 'w-8 h-8',
        md: 'w-12 h-12',
        lg: 'w-16 h-16',
    };

    const initials = name
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    return (
        <div className={cn('relative', sizeClasses[size], className)} title={name}>
            {src ? (
                <motion.div
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className="relative w-full h-full rounded-full overflow-hidden border-2 border-background shadow-md ring-1 ring-black/5"
                >
                    <Image
                        src={src}
                        alt={name}
                        fill
                        className="object-cover"
                    />
                </motion.div>
            ) : (
                <div className="flex h-full w-full items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-semibold text-muted-foreground shadow-md ring-1 ring-black/5">
                    {initials}
                </div>
            )}
            {/* Optional verification badge could go here */}
        </div>
    );
}
