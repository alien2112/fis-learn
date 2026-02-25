'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { ArrowRight, Code, PenTool, BarChart, Camera, Megaphone, Feather, Cpu, Palette, TrendingUp } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  displayOrder: number;
  _count?: {
    courses: number;
  };
}

const iconMap: Record<string, React.ElementType> = {
  'programming': Code,
  'development': Code,
  'graphic-design': Palette,
  'design': PenTool,
  'trading': TrendingUp,
  'business': BarChart,
  'marketing': Megaphone,
  'photography': Camera,
  'writing': Feather,
  'technology': Cpu,
};

const gradientMap: Record<string, string> = {
  'programming': 'from-blue-500 to-cyan-500',
  'development': 'from-blue-500 to-cyan-500',
  'graphic-design': 'from-purple-500 to-pink-500',
  'design': 'from-purple-500 to-pink-500',
  'trading': 'from-green-500 to-emerald-500',
  'business': 'from-orange-500 to-red-500',
  'marketing': 'from-green-500 to-emerald-500',
  'photography': 'from-indigo-500 to-blue-500',
  'writing': 'from-pink-500 to-rose-500',
  'technology': 'from-blue-600 to-indigo-600',
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3011/api/v1';

// Defined at module level so it is not recreated on every render/fetch
function flattenCategories(cats: any[]): Category[] {
  const result: Category[] = [];
  for (const cat of cats) {
    result.push(cat);
    if (cat.children?.length) {
      result.push(...flattenCategories(cat.children));
    }
  }
  return result;
}

export function CategoriesSection() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const t = useTranslations('home.categories');
  const locale = useLocale();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(`${API_URL}/categories`);
        if (!response.ok) throw new Error('Failed to fetch categories');
        const data = await response.json();

        const allCategories = flattenCategories(data.data || []);
        // Filter to only show the 3 main categories we want
        const allowedSlugs = ['programming', 'graphic-design', 'trading'];
        const filtered = allCategories.filter(c => allowedSlugs.includes(c.slug));

        // If no categories exist yet, use defaults
        if (filtered.length === 0) {
          setCategories([
            { id: '1', name: locale === 'ar' ? 'برمجة' : 'Programming', slug: 'programming', displayOrder: 1, _count: { courses: 0 } },
            { id: '2', name: locale === 'ar' ? 'تصميم جرافيك' : 'Graphic Design', slug: 'graphic-design', displayOrder: 2, _count: { courses: 0 } },
            { id: '3', name: locale === 'ar' ? 'تداول' : 'Trading', slug: 'trading', displayOrder: 3, _count: { courses: 0 } },
          ]);
        } else {
          setCategories(filtered);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
        // Fallback to defaults
        setCategories([
          { id: '1', name: locale === 'ar' ? 'برمجة' : 'Programming', slug: 'programming', displayOrder: 1, _count: { courses: 0 } },
          { id: '2', name: locale === 'ar' ? 'تصميم جرافيك' : 'Graphic Design', slug: 'graphic-design', displayOrder: 2, _count: { courses: 0 } },
          { id: '3', name: locale === 'ar' ? 'تداول' : 'Trading', slug: 'trading', displayOrder: 3, _count: { courses: 0 } },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, [locale]);

  if (isLoading) {
    return (
      <section className="py-24 bg-secondary/20">
        <div className="container">
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 md:py-24 bg-secondary/20">
      <div className="container">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
          <div className="max-w-2xl">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('title')}</h2>
            <p className="text-lg text-muted-foreground">
              {t('subtitle')}
            </p>
          </div>
          <Link
            href="/courses"
            className="group flex items-center font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            {t('allCategories')}
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {categories.map((category, index) => {
            const Icon = iconMap[category.slug] || Code;
            const gradient = gradientMap[category.slug] || 'from-blue-500 to-cyan-500';
            const courseCount = category._count?.courses || 0;

            return (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Link href={`/courses?category=${category.slug}`} className="group block h-full">
                  <div className="bg-background border hover:border-border/0 rounded-2xl p-6 h-full transition-all duration-300 hover:shadow-lg group-hover:-translate-y-1 relative overflow-hidden">
                    <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />

                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white mb-4 shadow-md`}>
                      <Icon className="h-6 w-6" />
                    </div>

                    <h3 className="font-bold text-lg mb-1">{category.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t('coursesCount', { count: courseCount })}
                    </p>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
