import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ActivityModule } from '../activity/activity.module';
import { VariantsController } from './variants.controller';
import { VariantsService } from './variants.service';

@Module({
  imports: [AuthModule, ActivityModule],
  controllers: [VariantsController],
  providers: [VariantsService],
})
export class VariantsModule {}
