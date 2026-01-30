import { Test, TestingModule } from '@nestjs/testing';
import { VersionController } from './version.controller';

describe('VersionController', () => {
  let controller: VersionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VersionController],
    }).compile();

    controller = module.get<VersionController>(VersionController);
  });

  it('should return version information', () => {
    const result = controller.getVersion();

    expect(result).toEqual({
      data: {
        api_version: 'v1',
        app_version: expect.any(String),
      },
      error: null,
    });

    expect(result.data.app_version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('should have consistent api_version', () => {
    const result = controller.getVersion();
    expect(result.data.api_version).toBe('v1');
  });
});
