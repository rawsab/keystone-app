import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createTestApp } from '../helpers/test-app';

describe('Version E2E', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await createTestApp();
  }, 30000);

  afterAll(async () => {
    await app.close();
  }, 30000);

  describe('GET /api/v1/version', () => {
    it('should return version information', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/version',
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body).toEqual({
        data: {
          api_version: 'v1',
          app_version: expect.any(String),
        },
        error: null,
      });

      expect(body.data.app_version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('should include version headers', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/version',
      });

      expect(response.headers['x-keystone-api-version']).toBe('v1');
      expect(response.headers['x-keystone-app-version']).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe('Version headers on other endpoints', () => {
    it('should include version headers on /api/v1/health', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/health',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['x-keystone-api-version']).toBe('v1');
      expect(response.headers['x-keystone-app-version']).toMatch(/^\d+\.\d+\.\d+$/);

      const body = JSON.parse(response.body);
      expect(body).toEqual({
        data: { ok: true },
        error: null,
      });
    });
  });
});
