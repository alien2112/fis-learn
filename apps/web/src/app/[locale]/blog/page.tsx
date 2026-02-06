
import { BlogHeader } from '@/components/blog/BlogHeader';
import { CategoryFilter } from '@/components/blog/CategoryFilter';
import { FeaturedPost } from '@/components/blog/FeaturedPost';
import { BlogCard } from '@/components/blog/BlogCard';
import { Newsletter } from '@/components/blog/Newsletter';
import { Button } from '@/components/ui/button';
import { ArrowDown } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

// Mock Data
const featuredPost = {
  slug: 'getting-started-with-online-learning',
  title: 'إزاي تبدأ تتعلم أونلاين صح: دليلك الكامل لـ 2024',
  excerpt: 'شكل التعليم بيتغير بسرعة جداً. اعرف أحسن الطرق والأدوات والاستراتيجيات عشان تستفيد أقصى استفادة من رحلة تعليمك الأونلاين في العصر ده.',
  coverImage: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=2070&auto=format&fit=crop',
  author: { name: 'سارة جونسون' },
  category: { name: 'نصائح مذاكرة' },
  publishedAt: '15 يناير، 2024',
  readTime: '5 دقايق قراءة',
};

const blogPosts = [
  {
    id: '2',
    slug: 'top-programming-languages-2024',
    title: 'أهم لغات برمجة لازم تتعلمها في 2024',
    excerpt: 'استكشف أكتر لغات البرمجة المطلوبة في السوق وتطبيقاتها في صناعة التكنولوجيا النهاردة.',
    author: { name: 'مايكل تشن' },
    category: { name: 'تكنولوجيا' },
    publishedAt: '12 يناير، 2024',
    readTime: '8 دقايق قراءة',
  },
  {
    id: '3',
    slug: 'benefits-of-certification',
    title: 'فايدة الشهادات المعتمدة في مجالك',
    excerpt: 'اعرف إزاي الشهادات الاحترافية ممكن تعلي سعرك في السوق وتفتحلك فرص جديدة.',
    author: { name: 'إيميلي رودريغيز' },
    category: { name: 'الشغل والكارير' },
    publishedAt: '10 يناير، 2024',
    readTime: '4 دقايق قراءة',
  },
  {
    id: '4',
    slug: 'study-techniques',
    title: '10 طرق مذاكرة عشان المعلومات تثبت',
    excerpt: 'طرق مذاكرة علمية هتساعدك تتعلم أسرع وتفتكر اللي ذاكرته لفترة أطول.',
    author: { name: 'ديفيد كيم' },
    category: { name: 'نصائح مذاكرة' },
    publishedAt: '8 يناير، 2024',
    readTime: '6 دقايق قراءة',
  },
  {
    id: '5',
    slug: 'remote-work-skills',
    title: 'مهارات أساسية عشان تشتغل Remote وتنجح',
    excerpt: 'اتقن المهارات اللي محتاجها عشان تنجح في الشغل عن بعد، من أول التواصل لحد تنظيم الوقت.',
    author: { name: 'سارة جونسون' },
    category: { name: 'الشغل والكارير' },
    publishedAt: '5 يناير، 2024',
    readTime: '5 دقايق قراءة',
  },
  {
    id: '6',
    slug: 'ai-in-education',
    title: 'إزاي الـ AI بيغير شكل التعليم الأونلاين',
    excerpt: 'شوف أحدث ابتكارات الذكاء الاصطناعي اللي بتغير طريقة تعليمنا أونلاين.',
    author: { name: 'مايكل تشن' },
    category: { name: 'تكنولوجيا' },
    publishedAt: '3 يناير، 2024',
    readTime: '7 دقايق قراءة',
  },
  {
    id: '7',
    slug: 'mindfulness-for-students',
    title: 'شوية هدوء للطلاب المطحونين',
    excerpt: 'طرق بسيطة عشان تقلل التوتر وتركز أحسن وقت المذاكرة التقيلة.',
    author: { name: 'ليزا وونج' },
    category: { name: 'صحة وتوازن' },
    publishedAt: '1 يناير، 2024',
    readTime: '3 دقايق قراءة',
  },
];

export default async function BlogPage({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations('blog');

  return (
    <main className="min-h-screen bg-background">
      <BlogHeader />
      <CategoryFilter />

      <div className="container py-12 space-y-20">
        {/* Featured Section */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold tracking-tight">{t('featured')}</h2>
          </div>
          <FeaturedPost post={featuredPost} />
        </section>

        {/* Latest Posts Grid */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold tracking-tight">{t('latest')}</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogPosts.map((post) => (
              <BlogCard key={post.id} post={post} />
            ))}
          </div>

          <div className="mt-16 flex justify-center">
            <Button variant="outline" size="lg" className="h-12 px-8 rounded-full">
              {t('loadMore')} <ArrowDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </section>
      </div>

      <Newsletter />
    </main>
  );
}
