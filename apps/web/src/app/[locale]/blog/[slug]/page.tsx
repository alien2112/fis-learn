
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Clock,
  ArrowLeft,
  Share2,
  Facebook,
  Twitter,
  Linkedin,
  User,
  Quote,
  CheckCircle2,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { BLOG_IMAGES } from '@/lib/placeholder-images';

// Mock Data (Same as previous)
const blogPosts: Record<string, {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  author: { name: string; bio: string; role: string };
  category: { name: string; slug: string };
  tags: { name: string; slug: string }[];
  publishedAt: string;
  readTime: number;
  image?: string;
}> = {
  'getting-started-with-online-learning': {
    id: '1',
    slug: 'getting-started-with-online-learning',
    title: 'Getting Started with Online Learning: A Complete Guide',
    excerpt: 'Discover the best practices and tips for making the most of your online learning journey in 2024.',
    image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=2070&auto=format&fit=crop',
    body: `
# Getting Started with Online Learning

Online learning has transformed the way we acquire new skills and knowledge. Whether you're looking to advance your career, explore a new hobby, or gain expertise in a specific field, online courses offer unparalleled flexibility and accessibility.

## Why Choose Online Learning?

The shift to digital education isn't just a trend; it's a fundamental change in how we access knowledge.

1. **Flexibility**: Learn at your own pace, on your own schedule. Whether you're a morning person or a night owl, online courses adapt to your lifestyle.
2. **Accessibility**: Access world-class education from anywhere in the world. All you need is an internet connection.
3. **Cost-Effective**: Save money on commuting, housing, and often on tuition fees compared to traditional education.

> "Education is the passport to the future, for tomorrow belongs to those who prepare for it today." — Malcolm X

## Tips for Success

### 1. Create a Dedicated Study Space
Having a dedicated area for learning helps you focus and signals to your brain that it's time to learn. Keep it organized and free from distractions.

### 2. Set Clear Goals
Define what you want to achieve before starting a course. This will help you stay motivated and track your progress.
* Write down your objectives
* Break big goals into smaller tasks
* Celebrate small wins

### 3. Establish a Routine
Consistency is key. Set specific times for studying and stick to them. Treat it like a real class.

### 4. Engage Actively
Don't just watch videos passively. Take notes, participate in discussions, and complete all assignments. Active recall is one of the most effective ways to learn.

## Conclusion

Online learning opens doors to endless possibilities. With the right mindset and strategies, you can achieve your learning goals and transform your life through education.
    `,
    author: {
      name: 'Sarah Johnson',
      role: 'Head of Education',
      bio: 'Sarah is an EdTech veteran with over 15 years of experience helping students achieve their learning goals.',
    },
    category: { name: 'Learning Tips', slug: 'learning-tips' },
    tags: [
      { name: 'Online Learning', slug: 'online-learning' },
      { name: 'Study Tips', slug: 'study-tips' },
      { name: 'Education', slug: 'education' },
    ],
    publishedAt: '2024-01-15',
    readTime: 5,
  },
};

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const post = blogPosts[params.slug];
  if (!post) {
    return { title: 'Post Not Found' };
  }
  return {
    title: post.title,
    description: post.excerpt,
  };
}

export default function BlogPostPage({
  params,
}: {
  params: { slug: string };
}) {
  const post = blogPosts[params.slug];

  if (!post) {
    notFound();
  }

  // Basic markdown parser (for demo purposes)
  const contentHtml = post.body
    .replace(/^# (.*$)/gim, '') // Remove H1 as we render it separately
    .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold mt-8 mb-4 tracking-tight text-foreground group flex items-center gap-2">$1</h2>')
    .replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold mt-6 mb-3 text-foreground">$1</h3>')
    .replace(/^\> (.*$)/gim, '<blockquote class="border-l-4 border-primary pl-4 italic my-6 text-lg text-muted-foreground bg-secondary/20 p-4 rounded-r-lg">$1</blockquote>')
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    .replace(/^\* (.*$)/gim, '<li class="flex items-start gap-2 mb-2"><span class="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0"></span><span>$1</span></li>')
    .replace(/^\d\. (.*$)/gim, '<li class="flex items-start gap-2 mb-2"><span class="mt-1 w-5 h-5 rounded-full bg-secondary text-[10px] font-bold flex items-center justify-center flex-shrink-0 text-primary border border-primary/20">✓</span><span>$1</span></li>')
    .replace(/\n/g, '<p class="mb-4 leading-relaxed text-slate-600 dark:text-slate-300">') + '</p>'; // Wrap text in p tags roughly

  return (
    <main className="bg-background min-h-screen pb-20">
      {/* ProgressBar (Simulated) */}
      <div className="fixed top-0 left-0 w-full h-1 bg-secondary z-50">
        <div className="h-full bg-primary w-[30%]" />
      </div>

      {/* Hero Header */}
      <header className="relative pt-32 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-secondary/30" />
        {/* Background Blur Blob */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] -z-10" />

        <div className="container relative max-w-4xl mx-auto text-center space-y-6">
          <Link
            href="/blog"
            className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors py-2 px-4 rounded-full bg-background/50 backdrop-blur border border-border/50 mb-4 hover:bg-background"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Blog
          </Link>

          <div className="space-y-4">
            <Badge className=" bg-primary/10 text-primary hover:bg-primary/20 border-primary/20">
              {post.category.name}
            </Badge>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-tight">
              {post.title}
            </h1>

            <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              {post.excerpt}
            </p>

            <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground pt-4">
              <div className="flex items-center">
                <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center font-bold text-primary mr-2">
                  {post.author.name.charAt(0)}
                </div>
                <span className="font-medium text-foreground">{post.author.name}</span>
              </div>
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2 opacity-70" />
                {post.publishedAt}
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2 opacity-70" />
                {post.readTime} min read
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="container max-w-6xl mx-auto px-4 md:px-6">
        <div className="rounded-3xl overflow-hidden aspect-[21/9] mb-12 shadow-2xl relative">
          <img
            src={post.image ?? BLOG_IMAGES.onlineLearning}
            alt={post.title}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="grid lg:grid-cols-[1fr_300px] gap-12">
          {/* Article Body */}
          <article className="prose prose-lg prose-zinc dark:prose-invert max-w-none">
            <div dangerouslySetInnerHTML={{ __html: contentHtml }} />
          </article>

          {/* Sidebar */}
          <aside className="space-y-8 h-fit lg:sticky lg:top-24">
            {/* Author Card */}
            <GlassCard className="p-6">
              <h3 className="font-bold text-lg mb-4">About the Author</h3>
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-full bg-secondary shrink-0 flex items-center justify-center font-bold text-primary text-xl">
                  {post.author.name.charAt(0)}
                </div>
                <div>
                  <div className="font-bold">{post.author.name}</div>
                  <div className="text-xs text-primary font-medium mb-2">{post.author.role}</div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {post.author.bio}
                  </p>
                </div>
              </div>
              <Button variant="outline" className="w-full mt-4 rounded-full text-xs h-8">
                View Profile
              </Button>
            </GlassCard>

            {/* Table of Contents (Simulated) */}
            <div className="hidden lg:block">
              <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-4">On this page</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-primary font-medium border-l-2 border-primary pl-3 block">Why Choose Online Learning?</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground border-l-2 border-transparent pl-3 block transition-colors">Tips for Success</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground border-l-2 border-transparent pl-3 block transition-colors">Conclusion</a></li>
              </ul>
            </div>

            {/* Share */}
            <div>
              <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-4">Share</h3>
              <div className="flex gap-2">
                <Button size="icon" variant="secondary" className="rounded-full h-10 w-10 text-muted-foreground hover:text-primary"><Twitter className="h-4 w-4" /></Button>
                <Button size="icon" variant="secondary" className="rounded-full h-10 w-10 text-muted-foreground hover:text-primary"><Linkedin className="h-4 w-4" /></Button>
                <Button size="icon" variant="secondary" className="rounded-full h-10 w-10 text-muted-foreground hover:text-primary"><Facebook className="h-4 w-4" /></Button>
                <Button size="icon" variant="secondary" className="rounded-full h-10 w-10 text-muted-foreground hover:text-primary"><Share2 className="h-4 w-4" /></Button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
