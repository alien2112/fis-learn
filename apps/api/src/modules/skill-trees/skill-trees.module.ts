import { Module } from '@nestjs/common';
import { SkillTreesService } from './skill-trees.service';
import { SkillTreesController } from './skill-trees.controller';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SkillTreesController],
  providers: [SkillTreesService],
  exports: [SkillTreesService],
})
export class SkillTreesModule {}
