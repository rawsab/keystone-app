import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createTestApp } from '../helpers/test-app';
import { PrismaService } from '../../src/infra/db/prisma.service';

describe('Auth E2E', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const uniqueEmail = `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
  let authToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    // Clean up test database before running tests
    await prisma.auditEvent.deleteMany({});
    await prisma.dailyReportAttachment.deleteMany({});
    await prisma.dailyReport.deleteMany({});
    await prisma.fileObject.deleteMany({});
    await prisma.projectMember.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.company.deleteMany({});
  }, 30000);

  afterAll(async () => {
    await app.close();
  }, 30000);

  describe('POST /api/v1/auth/signup', () => {
    it('should create account and return token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/signup',
        payload: {
          company_name: 'Test Company',
          full_name: 'Test User',
          email: uniqueEmail,
          password: 'password123',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('error', null);
      expect(body.data).toHaveProperty('token');
      expect(body.data).toHaveProperty('user');
      expect(body.data.user).toMatchObject({
        email: uniqueEmail.toLowerCase(),
        full_name: 'Test User',
        role: 'OWNER',
      });
      expect(body.data.user).toHaveProperty('id');

      authToken = body.data.token;
    });

    it('should fail with duplicate email (CONFLICT)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/signup',
        payload: {
          company_name: 'Another Company',
          full_name: 'Another User',
          email: uniqueEmail,
          password: 'password123',
        },
      });

      expect(response.statusCode).toBe(409);
      const body = response.json();
      expect(body).toHaveProperty('data', null);
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('code', 'CONFLICT');
      expect(body.error).toHaveProperty('message');
    });

    it('should fail with case-insensitive duplicate email (CONFLICT)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/signup',
        payload: {
          company_name: 'Yet Another Company',
          full_name: 'Yet Another User',
          email: uniqueEmail.toUpperCase(),
          password: 'password123',
        },
      });

      expect(response.statusCode).toBe(409);
      const body = response.json();
      expect(body).toHaveProperty('data', null);
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('code', 'CONFLICT');
    });

    it('should fail with invalid email (VALIDATION_ERROR)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/signup',
        payload: {
          company_name: 'Test Company',
          full_name: 'Test User',
          email: 'not-an-email',
          password: 'password123',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body).toHaveProperty('data', null);
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should fail with short password (VALIDATION_ERROR)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/signup',
        payload: {
          company_name: 'Test Company',
          full_name: 'Test User',
          email: `test-${Date.now()}@example.com`,
          password: 'short',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body).toHaveProperty('data', null);
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login with correct credentials', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: uniqueEmail,
          password: 'password123',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('error', null);
      expect(body.data).toHaveProperty('token');
      expect(body.data).toHaveProperty('user');
      expect(body.data.user).toMatchObject({
        email: uniqueEmail.toLowerCase(),
        full_name: 'Test User',
        role: 'OWNER',
      });
    });

    it('should fail with wrong password (UNAUTHORIZED)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: uniqueEmail,
          password: 'wrongpassword',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body).toHaveProperty('data', null);
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('code', 'UNAUTHORIZED');
      expect(body.error).toHaveProperty('message', 'Invalid credentials');
    });

    it('should fail with non-existent email (UNAUTHORIZED)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'nonexistent@example.com',
          password: 'password123',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body).toHaveProperty('data', null);
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('code', 'UNAUTHORIZED');
    });
  });

  describe('GET /api/v1/users/me', () => {
    it('should return current user with valid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/users/me',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('error', null);
      expect(body.data).toMatchObject({
        email: uniqueEmail.toLowerCase(),
        full_name: 'Test User',
        role: 'OWNER',
      });
      expect(body.data).toHaveProperty('id');
    });

    it('should fail without token (UNAUTHORIZED)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/users/me',
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body).toHaveProperty('data', null);
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('code', 'UNAUTHORIZED');
    });

    it('should fail with invalid token (UNAUTHORIZED)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/users/me',
        headers: {
          authorization: 'Bearer invalid-token',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body).toHaveProperty('data', null);
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('code', 'UNAUTHORIZED');
    });
  });
});
