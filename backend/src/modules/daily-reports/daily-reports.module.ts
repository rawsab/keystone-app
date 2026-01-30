import { Module } from '@nestjs/common';
import { DailyReportsController } from './daily-reports.controller';
import { DailyReportController } from './daily-report.controller';
import { DailyReportsService } from './daily-reports.service';

@Module({
  controllers: [DailyReportsController, DailyReportController],
  providers: [DailyReportsService],
  exports: [DailyReportsService],
})
export class DailyReportsModule {}
