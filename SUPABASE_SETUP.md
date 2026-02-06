# Supabase Setup Guide

Your project has been successfully configured to use Supabase!

## What Has Been Configured

### 1. Environment Variables
Updated `.env` and `.env.example` with:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public anonymous key for client-side access
- `DATABASE_URL` - Connection string for Prisma (with connection pooling)
- `DIRECT_DATABASE_URL` - Direct connection for migrations and Prisma Studio

### 2. Database Schema
All 18 tables from your Prisma schema have been migrated to Supabase:
- users
- refresh_tokens
- instructor_profiles
- categories
- category_translations
- courses
- course_instructors
- course_sections
- lessons
- materials
- enrollments
- access_codes
- access_code_usages
- live_classes
- live_class_attendees
- blog_posts
- blog_tags
- blog_post_tags
- audit_logs

### 3. Supabase Client Libraries
Installed `@supabase/supabase-js@2.93.3` in:
- apps/admin
- apps/web

### 4. Client Configuration Files
Created Supabase client utilities:
- `apps/admin/src/lib/supabase/client.ts` - Client-side Supabase instance
- `apps/admin/src/lib/supabase/server.ts` - Server-side Supabase instance
- `apps/admin/src/lib/supabase/database.types.ts` - TypeScript types
- `apps/web/src/lib/supabase/client.ts` - Client-side Supabase instance
- `apps/web/src/lib/supabase/server.ts` - Server-side Supabase instance
- `apps/web/src/lib/supabase/database.types.ts` - TypeScript types

### 5. Prisma Configuration
Updated `apps/api/prisma/schema.prisma` to support Supabase connection pooling with `directUrl`.

## Next Steps

### 1. Update Database Password
You need to replace `[YOUR-PASSWORD]` in your `.env` file with your actual Supabase database password.

**Important:** Note the different username formats for each connection mode:
- Transaction mode (port 6543): Uses `postgres` as username
- Session mode (port 5432): Uses `postgres.PROJECT_REF` as username

```env
# Transaction mode - for application queries (port 6543, username: postgres)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true

# Session mode - for migrations and Prisma Studio (port 5432, username: postgres.PROJECT_REF)
DIRECT_DATABASE_URL=postgresql://postgres.ddcpotfxlsdmdqpnphwl:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

If your password contains special characters like `#`, you need to URL-encode them:
- `#` → `%23`
- `@` → `%40`
- `&` → `%26`

To find your database password:
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to Settings > Database
4. Copy the database password (you may need to reset it if you don't have it saved)

### 2. Regenerate Prisma Client
After updating the database URL, regenerate the Prisma client:

```bash
pnpm --filter api prisma generate
```

### 3. Test the Connection
Test that your API can connect to Supabase:

```bash
pnpm dev:api
```

### 4. Usage Examples

#### Using Supabase Client in Next.js Apps

**Client-side (React components):**
```typescript
import { supabase } from '@/lib/supabase/client';

// Query data
const { data, error } = await supabase
  .from('courses')
  .select('*')
  .eq('status', 'PUBLISHED');

// Insert data
const { data, error } = await supabase
  .from('users')
  .insert({ email, name, password_hash });
```

**Server-side (Server Components, API Routes):**
```typescript
import { supabaseAdmin } from '@/lib/supabase/server';

// Use with full admin privileges
const { data, error } = await supabaseAdmin
  .from('users')
  .select('*');
```

#### Using Prisma in NestJS API
Your existing Prisma code continues to work as before:

```typescript
// Existing code works unchanged
const courses = await this.prisma.course.findMany({
  where: { status: 'PUBLISHED' },
});
```

### 5. Optional: Enable Row Level Security (RLS)

Supabase supports Row Level Security for additional security. To enable RLS for a table:

1. Go to your Supabase Dashboard
2. Navigate to Authentication > Policies
3. Create policies for each table

Example policy for courses table:
```sql
-- Enable RLS
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- Allow public read access to published courses
CREATE POLICY "Public courses are viewable by everyone"
ON courses FOR SELECT
USING (status = 'PUBLISHED');

-- Allow authenticated users to create courses
CREATE POLICY "Authenticated users can create courses"
ON courses FOR INSERT
TO authenticated
WITH CHECK (true);
```

### 6. Optional: Set Up Supabase Storage

For file uploads (course materials, avatars, etc.), you can use Supabase Storage:

```typescript
import { supabase } from '@/lib/supabase/client';

// Upload file
const { data, error } = await supabase.storage
  .from('course-materials')
  .upload('path/to/file.pdf', file);

// Get public URL
const { data } = supabase.storage
  .from('course-materials')
  .getPublicUrl('path/to/file.pdf');
```

### 7. Optional: Migrate from Custom JWT to Supabase Auth

Currently, your app uses custom JWT authentication. You can optionally migrate to Supabase Auth:

1. Remove custom JWT logic from your NestJS API
2. Use Supabase Auth in your Next.js apps:

```typescript
import { supabase } from '@/lib/supabase/client';

// Sign up
const { data, error } = await supabase.auth.signUp({
  email,
  password,
});

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});

// Sign out
await supabase.auth.signOut();

// Get current user
const { data: { user } } = await supabase.auth.getUser();
```

## Project Structure

```
fis-learn/
├── apps/
│   ├── admin/                    # Admin dashboard (Next.js)
│   │   └── src/
│   │       └── lib/
│   │           └── supabase/
│   │               ├── client.ts         # Client-side Supabase
│   │               ├── server.ts         # Server-side Supabase
│   │               └── database.types.ts # Generated types
│   ├── api/                      # NestJS API
│   │   └── prisma/
│   │       └── schema.prisma     # Updated with directUrl
│   └── web/                      # Public website (Next.js)
│       └── src/
│           └── lib/
│               └── supabase/
│                   ├── client.ts         # Client-side Supabase
│                   ├── server.ts         # Server-side Supabase
│                   └── database.types.ts # Generated types
├── .env                          # Updated with Supabase credentials
└── .env.example                  # Template with Supabase variables
```

## Troubleshooting

### Prisma Client Errors
If you get Prisma client errors, regenerate the client:
```bash
pnpm --filter api prisma generate
```

### Connection Pool Errors
If you see connection pool errors, make sure you're using:
- `DATABASE_URL` for application queries (uses PgBouncer)
- `DIRECT_DATABASE_URL` for migrations and Prisma Studio

### TypeScript Type Errors
Regenerate the database types:
```bash
# This will be updated when you set up Supabase CLI
supabase gen types typescript --project-id ddcpotfxlsdmdqpnphwl > apps/admin/src/lib/supabase/database.types.ts
```

## Resources

- [Supabase Dashboard](https://supabase.com/dashboard/project/ddcpotfxlsdmdqpnphwl)
- [Supabase JavaScript Client Docs](https://supabase.com/docs/reference/javascript/introduction)
- [Prisma with Supabase](https://supabase.com/docs/guides/integrations/prisma)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

## Support

If you encounter any issues, check:
1. Database password is correct in `.env`
2. Supabase project is active
3. Prisma client is regenerated
4. All dependencies are installed (`pnpm install`)
