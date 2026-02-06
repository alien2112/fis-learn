import { PrismaClient, Role, UserStatus, CourseStatus, CourseLevel, PricingModel } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Create Super Admin
  const superAdminPassword = await bcrypt.hash('Admin123!', 12);
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@fis-learn.com' },
    update: {},
    create: {
      email: 'admin@fis-learn.com',
      passwordHash: superAdminPassword,
      name: 'Super Admin',
      role: Role.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
    },
  });
  console.log(`Created Super Admin: ${superAdmin.email}`);

  // Create sample Admin
  const adminPassword = await bcrypt.hash('Admin123!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin2@fis-learn.com' },
    update: {},
    create: {
      email: 'admin2@fis-learn.com',
      passwordHash: adminPassword,
      name: 'Admin User',
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
    },
  });
  console.log(`Created Admin: ${admin.email}`);

  // Create sample Instructor
  const instructorPassword = await bcrypt.hash('Instructor123!', 12);
  const instructor = await prisma.user.upsert({
    where: { email: 'instructor@fis-learn.com' },
    update: {},
    create: {
      email: 'instructor@fis-learn.com',
      passwordHash: instructorPassword,
      name: 'John Instructor',
      role: Role.INSTRUCTOR,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      instructorProfile: {
        create: {
          bio: 'Experienced software developer and educator with 10+ years of industry experience.',
          specialization: 'Web Development',
          credentials: 'MSc Computer Science, AWS Certified',
        },
      },
    },
  });
  console.log(`Created Instructor: ${instructor.email}`);

  // Create sample Student
  const studentPassword = await bcrypt.hash('Student123!', 12);
  const student = await prisma.user.upsert({
    where: { email: 'student@fis-learn.com' },
    update: {},
    create: {
      email: 'student@fis-learn.com',
      passwordHash: studentPassword,
      name: 'Jane Student',
      role: Role.STUDENT,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
    },
  });
  console.log(`Created Student: ${student.email}`);

  // Create main categories - only Programming, Graphic Design, and Trading for homepage
  const categories = [
    { name: 'Programming', slug: 'programming', description: 'Learn programming languages and software development', displayOrder: 1 },
    { name: 'Graphic Design', slug: 'graphic-design', description: 'Master digital design, UX/UI, and creative tools', displayOrder: 2 },
    { name: 'Trading', slug: 'trading', description: 'Stock trading, forex, and investment strategies', displayOrder: 3 },
    { name: 'Design', slug: 'design', description: 'Master digital design, UX/UI, and creative tools', displayOrder: 4 },
    { name: 'Business', slug: 'business', description: 'Business skills, management, and entrepreneurship', displayOrder: 5 },
    { name: 'Data Science', slug: 'data-science', description: 'Analytics, machine learning, and data engineering', displayOrder: 6 },
  ];

  for (const cat of categories) {
    const category = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
    console.log(`Created Category: ${category.name}`);
  }

  // Create subcategories
  const programmingCategory = await prisma.category.findUnique({ where: { slug: 'programming' } });
  const designCategory = await prisma.category.findUnique({ where: { slug: 'design' } });

  if (programmingCategory) {
    const programmingSubcategories = [
      { name: 'Web Development', slug: 'web-development', parentId: programmingCategory.id, displayOrder: 1 },
      { name: 'Mobile Development', slug: 'mobile-development', parentId: programmingCategory.id, displayOrder: 2 },
      { name: 'Python', slug: 'python', parentId: programmingCategory.id, displayOrder: 3 },
      { name: 'JavaScript', slug: 'javascript', parentId: programmingCategory.id, displayOrder: 4 },
    ];

    for (const subcat of programmingSubcategories) {
      const subcategory = await prisma.category.upsert({
        where: { slug: subcat.slug },
        update: {},
        create: subcat,
      });
      console.log(`Created Subcategory: ${subcategory.name}`);
    }
  }

  if (designCategory) {
    const designSubcategories = [
      { name: 'UI/UX Design', slug: 'ui-ux-design', parentId: designCategory.id, displayOrder: 1 },
      { name: 'Motion Graphics', slug: 'motion-graphics', parentId: designCategory.id, displayOrder: 2 },
    ];

    for (const subcat of designSubcategories) {
      const subcategory = await prisma.category.upsert({
        where: { slug: subcat.slug },
        update: {},
        create: subcat,
      });
      console.log(`Created Subcategory: ${subcategory.name}`);
    }
  }

  // Create a sample course
  const webDevCategory = await prisma.category.findUnique({ where: { slug: 'web-development' } });

  if (webDevCategory) {
    const course = await prisma.course.upsert({
      where: { slug: 'introduction-to-web-development' },
      update: {},
      create: {
        title: 'Introduction to Web Development',
        slug: 'introduction-to-web-development',
        description: 'Learn the fundamentals of web development including HTML, CSS, and JavaScript.',
        language: 'en',
        level: CourseLevel.BEGINNER,
        status: CourseStatus.PUBLISHED,
        pricingModel: PricingModel.FREE,
        isFeatured: true,
        categoryId: webDevCategory.id,
        createdById: instructor.id,
        publishedAt: new Date(),
        sections: {
          create: [
            {
              title: 'Getting Started',
              sortOrder: 1,
              lessons: {
                create: [
                  { title: 'Introduction to the Course', contentType: 'VIDEO', sortOrder: 1, isFreePreview: true },
                  { title: 'Setting Up Your Development Environment', contentType: 'VIDEO', sortOrder: 2 },
                ],
              },
            },
            {
              title: 'HTML Fundamentals',
              sortOrder: 2,
              lessons: {
                create: [
                  { title: 'HTML Document Structure', contentType: 'VIDEO', sortOrder: 1 },
                  { title: 'HTML Elements and Tags', contentType: 'VIDEO', sortOrder: 2 },
                  { title: 'HTML Quiz', contentType: 'QUIZ', sortOrder: 3 },
                ],
              },
            },
          ],
        },
        instructors: {
          create: {
            userId: instructor.id,
            isPrimary: true,
          },
        },
      },
    });
    console.log(`Created Course: ${course.title}`);

    // Enroll the sample student in the course
    await prisma.enrollment.upsert({
      where: { userId_courseId: { userId: student.id, courseId: course.id } },
      update: {},
      create: {
        userId: student.id,
        courseId: course.id,
        progressPercent: 0,
      },
    });
    console.log(`Enrolled ${student.name} in ${course.title}`);
  }

  // Seed one published course for each main homepage world (Graphic Design + Trading).
  if (programmingCategory) {
    const programmingCourse = await prisma.course.upsert({
      where: { slug: 'programming-foundations-ship-systems' },
      update: {},
      create: {
        title: 'Programming Foundations: Ship Systems, Not Snippets',
        slug: 'programming-foundations-ship-systems',
        description: 'A clean, practical foundation to think in systems, write readable code, and build real projects.',
        language: 'en',
        level: CourseLevel.BEGINNER,
        status: CourseStatus.PUBLISHED,
        pricingModel: PricingModel.FREE,
        isFeatured: true,
        categoryId: programmingCategory.id,
        createdById: instructor.id,
        publishedAt: new Date(),
        sections: {
          create: [
            {
              title: 'Core Thinking',
              sortOrder: 1,
              lessons: {
                create: [
                  { title: 'How to Think Like a Builder', contentType: 'VIDEO', sortOrder: 1, isFreePreview: true },
                  { title: 'Debugging Without Panic', contentType: 'VIDEO', sortOrder: 2 },
                ],
              },
            },
            {
              title: 'Ship a Mini Project',
              sortOrder: 2,
              lessons: {
                create: [
                  { title: 'Plan Your Project Like a Pro', contentType: 'VIDEO', sortOrder: 1 },
                  { title: 'Refactor and Finish Strong', contentType: 'VIDEO', sortOrder: 2 },
                ],
              },
            },
          ],
        },
        instructors: {
          create: {
            userId: instructor.id,
            isPrimary: true,
          },
        },
      },
    });

    console.log(`Created Course: ${programmingCourse.title}`);
  }

  const graphicDesignCategory = await prisma.category.findUnique({ where: { slug: 'graphic-design' } });
  if (graphicDesignCategory) {
    const designCourse = await prisma.course.upsert({
      where: { slug: 'chaos-studio-poster-design' },
      update: {},
      create: {
        title: 'Chaos Studio: Poster Design Fundamentals',
        slug: 'chaos-studio-poster-design',
        description: 'Build poster systems that feel bold, clean, and unmistakably yours.',
        language: 'en',
        level: CourseLevel.BEGINNER,
        status: CourseStatus.PUBLISHED,
        pricingModel: PricingModel.FREE,
        isFeatured: true,
        categoryId: graphicDesignCategory.id,
        createdById: instructor.id,
        publishedAt: new Date(),
        sections: {
          create: [
            {
              title: 'Studio Setup',
              sortOrder: 1,
              lessons: {
                create: [
                  { title: 'Poster DNA: Hierarchy + Rhythm', contentType: 'VIDEO', sortOrder: 1, isFreePreview: true },
                  { title: 'Type Pairing That Does Not Look Random', contentType: 'VIDEO', sortOrder: 2 },
                ],
              },
            },
            {
              title: 'Make It Yours',
              sortOrder: 2,
              lessons: {
                create: [
                  { title: 'Color Energy and Contrast Control', contentType: 'VIDEO', sortOrder: 1 },
                  { title: 'Final Export Checklist', contentType: 'VIDEO', sortOrder: 2 },
                ],
              },
            },
          ],
        },
        instructors: {
          create: {
            userId: instructor.id,
            isPrimary: true,
          },
        },
      },
    });

    console.log(`Created Course: ${designCourse.title}`);
  }

  const tradingCategory = await prisma.category.findUnique({ where: { slug: 'trading' } });
  if (tradingCategory) {
    const tradingCourse = await prisma.course.upsert({
      where: { slug: 'market-arena-risk-control' },
      update: {},
      create: {
        title: 'Market Arena: Risk Control and Trade Process',
        slug: 'market-arena-risk-control',
        description: 'A practical process for entries, exits, and risk control without panic decisions.',
        language: 'en',
        level: CourseLevel.BEGINNER,
        status: CourseStatus.PUBLISHED,
        pricingModel: PricingModel.FREE,
        isFeatured: true,
        categoryId: tradingCategory.id,
        createdById: instructor.id,
        publishedAt: new Date(),
        sections: {
          create: [
            {
              title: 'The Rules',
              sortOrder: 1,
              lessons: {
                create: [
                  { title: 'Position Sizing in Plain Numbers', contentType: 'VIDEO', sortOrder: 1, isFreePreview: true },
                  { title: 'Stops, Targets, and When to Do Nothing', contentType: 'VIDEO', sortOrder: 2 },
                ],
              },
            },
            {
              title: 'The Process',
              sortOrder: 2,
              lessons: {
                create: [
                  { title: 'Journaling a Trade Like a Pro', contentType: 'VIDEO', sortOrder: 1 },
                  { title: 'Review Loop: Fix the System, Not Your Mood', contentType: 'VIDEO', sortOrder: 2 },
                ],
              },
            },
          ],
        },
        instructors: {
          create: {
            userId: instructor.id,
            isPrimary: true,
          },
        },
      },
    });

    console.log(`Created Course: ${tradingCourse.title}`);
  }

  // Create blog tags
  const tags = ['tutorial', 'programming', 'design', 'tips', 'news'];
  for (const tagName of tags) {
    await prisma.blogTag.upsert({
      where: { slug: tagName },
      update: {},
      create: {
        name: tagName.charAt(0).toUpperCase() + tagName.slice(1),
        slug: tagName,
      },
    });
  }
  console.log('Created blog tags');

  // Create a sample blog post
  const tutorialTag = await prisma.blogTag.findUnique({ where: { slug: 'tutorial' } });

  await prisma.blogPost.upsert({
    where: { slug: 'getting-started-with-web-development' },
    update: {},
    create: {
      title: 'Getting Started with Web Development in 2026',
      slug: 'getting-started-with-web-development',
      body: `
# Getting Started with Web Development

Web development is one of the most in-demand skills in today's job market. Whether you're looking to start a new career or add to your existing skill set, learning web development can open many doors.

## What You'll Learn

- HTML: The structure of web pages
- CSS: Styling and layout
- JavaScript: Interactivity and functionality

## Getting Started

The best way to learn web development is by doing. Start with small projects and gradually build up to more complex applications.

Stay tuned for more tutorials and tips!
      `.trim(),
      excerpt: 'Learn how to start your web development journey with the essential skills and tools you need.',
      authorId: superAdmin.id,
      status: 'PUBLISHED',
      publishedAt: new Date(),
      isPinned: true,
      metaTitle: 'Getting Started with Web Development - FIS Learn Blog',
      metaDescription: 'A comprehensive guide to starting your web development journey in 2026.',
      tags: tutorialTag ? {
        create: {
          tagId: tutorialTag.id,
        },
      } : undefined,
    },
  });
  console.log('Created sample blog post');

  console.log('Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
