import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserDataExportService } from './user-data-export.service';
import { UserDataDeletionService } from './user-data-deletion.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, UserDataExportService, UserDataDeletionService],
  exports: [UsersService],
})
export class UsersModule {}
