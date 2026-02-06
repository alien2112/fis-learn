
'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const categories = [
    'كل المقالات',
    'نصائح مذاكرة',
    'تكنولوجيا',
    'شغل وكارير',
    'أخبار السوق',
    'قصص طلابنا',
];

export function CategoryFilter() {
    const [active, setActive] = useState('All Posts');

    return (
        <div className="w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-16 z-30">
            <div className="container py-4 overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-2 min-w-max mx-auto md:justify-center">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setActive(cat)}
                            className={cn(
                                "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                                active === cat
                                    ? "bg-primary text-primary-foreground shadow-md scale-105"
                                    : "bg-secondary/50 text-secondary-foreground hover:bg-secondary hover:text-foreground"
                            )}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
