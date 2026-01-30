import { S3Service } from './s3.service';
import { EnvService } from '../../config/env.service';

describe('S3Service', () => {
  let service: S3Service;
  let mockEnvService: EnvService;

  beforeEach(() => {
    mockEnvService = {
      s3Bucket: 'test-bucket',
      awsRegion: 'us-east-1',
      awsAccessKeyId: 'test-key',
      awsSecretAccessKey: 'test-secret',
    } as EnvService;

    service = new S3Service(mockEnvService);
  });

  describe('validateObjectKeyPrefix', () => {
    it('should validate correct object key prefix', () => {
      const result = service.validateObjectKeyPrefix({
        objectKey: 'companies/company-1/projects/project-1/files/uuid',
        companyId: 'company-1',
        projectId: 'project-1',
      });

      expect(result).toBe(true);
    });

    it('should reject object key with wrong company', () => {
      const result = service.validateObjectKeyPrefix({
        objectKey: 'companies/wrong-company/projects/project-1/files/uuid',
        companyId: 'company-1',
        projectId: 'project-1',
      });

      expect(result).toBe(false);
    });

    it('should reject object key with wrong project', () => {
      const result = service.validateObjectKeyPrefix({
        objectKey: 'companies/company-1/projects/wrong-project/files/uuid',
        companyId: 'company-1',
        projectId: 'project-1',
      });

      expect(result).toBe(false);
    });

    it('should reject object key with wrong pattern', () => {
      const result = service.validateObjectKeyPrefix({
        objectKey: 'invalid/path/to/file',
        companyId: 'company-1',
        projectId: 'project-1',
      });

      expect(result).toBe(false);
    });
  });
});
