import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { PrismaModule } from '../../database/prisma.module';
import { PrismaService } from '../../database/prisma.service';
import { StorageController } from './controllers/storage.controller';
import { StorageService } from './services/storage.service';
import { StorageRepository } from './repositories/storage.repository';

@Module({
  imports: [PrismaModule, ConfigModule, MulterModule.register({ storage: memoryStorage() })],
  controllers: [StorageController],
  providers: [StorageService, StorageRepository, PrismaService],
  exports: [StorageService],
})
export class StorageModule {}
