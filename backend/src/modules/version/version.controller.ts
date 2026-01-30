import { Controller, Get } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ApiResponse } from '../../common/interfaces/api-response.interface';

interface VersionData {
  api_version: string;
  app_version: string;
}

@Controller('api/v1/version')
export class VersionController {
  private readonly apiVersion = 'v1';
  private readonly appVersion: string;

  constructor() {
    try {
      const packageJsonPath = join(__dirname, '../../../package.json');
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      this.appVersion = packageJson.version;
    } catch (error) {
      this.appVersion = '0.0.0';
    }
  }

  @Get()
  getVersion(): ApiResponse<VersionData> {
    return {
      data: {
        api_version: this.apiVersion,
        app_version: this.appVersion,
      },
      error: null,
    };
  }
}
