import { cn } from '@/lib/utils';
import React from 'react';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    className?: string;
    hoverEffect?: boolean;
}

export function GlassCard({
    children,
    className,
    hoverEffect = false,
    ...props
}: GlassCardProps) {
    return (
        <div
            className={cn(
                'relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-xl backdrop-saturate-150 transition-all duration-300',
                hoverEffect && 'hover:bg-white/10 hover:scale-[1.02] hover:shadow-2xl hover:border-white/20',
                'dark:bg-black/20 dark:border-white/5',
                className
            )}
            {...props}
        >
            {/* Glossy sheen effect */}
            <div className="absolute inset-0 -z-10 bg-gradient-to-br from-white/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

            {children}
        </div>
    );
}
