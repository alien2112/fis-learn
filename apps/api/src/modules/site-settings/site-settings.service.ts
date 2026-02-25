import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { UpdateSiteSettingDto, BulkUpdateSiteSettingsDto } from './dto/update-site-setting.dto';

const DEFAULTS: Array<{
  key: string;
  value: string;
  label: string;
  description: string;
  category: string;
}> = [
  {
    key: 'logo_url',
    value: '/logo.png',
    label: 'Logo Image',
    description: 'Site logo displayed in the header. Use a URL or /logo.png for the local file.',
    category: 'branding',
  },
  {
    key: 'hero_image_url',
    value: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2071&auto=format&fit=crop',
    label: 'Hero Section Image',
    description: 'Main background image shown in the homepage hero section.',
    category: 'hero',
  },
  {
    key: 'feature_own_pace_image_url',
    value: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=2070&auto=format&fit=crop',
    label: 'Feature: Own Pace Image',
    description: 'Image for the "Learn at Your Own Pace" feature block.',
    category: 'features',
  },
  {
    key: 'feature_mentorship_image_url',
    value: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=2070&auto=format&fit=crop',
    label: 'Feature: Mentorship Image',
    description: 'Image for the "Expert Mentorship" feature block.',
    category: 'features',
  },
  {
    key: 'feature_project_based_image_url',
    value: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop',
    label: 'Feature: Project-Based Image',
    description: 'Image for the "Project-Based Learning" feature block.',
    category: 'features',
  },
  {
    key: 'testimonial_alex_avatar',
    value: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=1887&auto=format&fit=crop',
    label: 'Testimonial: Alex Avatar',
    description: 'Profile photo for the first testimonial (Alex).',
    category: 'testimonials',
  },
  {
    key: 'testimonial_maria_avatar',
    value: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1887&auto=format&fit=crop',
    label: 'Testimonial: Maria Avatar',
    description: 'Profile photo for the second testimonial (Maria).',
    category: 'testimonials',
  },
  {
    key: 'testimonial_david_avatar',
    value: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1887&auto=format&fit=crop',
    label: 'Testimonial: David Avatar',
    description: 'Profile photo for the third testimonial (David).',
    category: 'testimonials',
  },
  {
    key: 'team_sarah_image',
    value: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=1976&auto=format&fit=crop',
    label: 'Team: Sarah Image',
    description: 'Photo for team member Sarah.',
    category: 'team',
  },
  {
    key: 'team_michael_image',
    value: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=2070&auto=format&fit=crop',
    label: 'Team: Michael Image',
    description: 'Photo for team member Michael.',
    category: 'team',
  },
  {
    key: 'team_emily_image',
    value: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=1961&auto=format&fit=crop',
    label: 'Team: Emily Image',
    description: 'Photo for team member Emily.',
    category: 'team',
  },
  {
    key: 'team_david_image',
    value: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=1974&auto=format&fit=crop',
    label: 'Team: David Image',
    description: 'Photo for team member David.',
    category: 'team',
  },
];

@Injectable()
export class SiteSettingsService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.seed();
  }

  /** Insert defaults for any keys not yet in the DB */
  async seed() {
    for (const def of DEFAULTS) {
      await this.prisma.siteSetting.upsert({
        where: { key: def.key },
        create: def,
        update: {}, // never overwrite an admin-edited value
      });
    }
  }

  /** Public: flat key→value map for fast frontend consumption */
  async getPublicSettings(): Promise<Record<string, string>> {
    const rows = await this.prisma.siteSetting.findMany();
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }

  /** Admin: full rows with label/description/category */
  async findAll() {
    return this.prisma.siteSetting.findMany({ orderBy: [{ category: 'asc' }, { key: 'asc' }] });
  }

  /** Admin: update a single setting by key */
  async upsert(key: string, dto: UpdateSiteSettingDto) {
    const existing = DEFAULTS.find((d) => d.key === key);
    return this.prisma.siteSetting.upsert({
      where: { key },
      create: {
        key,
        value: dto.value,
        label: existing?.label ?? key,
        description: existing?.description,
        category: existing?.category ?? 'general',
      },
      update: { value: dto.value },
    });
  }

  /** Admin: bulk update multiple settings */
  async bulkUpsert(dto: BulkUpdateSiteSettingsDto) {
    const results = await Promise.all(
      dto.updates.map((u) => this.upsert(u.key, { value: u.value })),
    );
    return results;
  }
}
