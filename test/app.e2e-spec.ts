import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('Team Tasks API (e2e)', () => {
  let app: INestApplication;
  const email = `e2e-${Date.now()}@example.com`;
  let accessToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('registers and logs in a user', async () => {
    const registration = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'e2e-a-long-password' })
      .expect(201);
    expect(registration.body).toMatchObject({ email, role: 'user' });
    expect(registration.body.passwordHash).toBeUndefined();

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'e2e-a-long-password' })
      .expect(201);
    accessToken = login.body.accessToken;
    expect(accessToken).toEqual(expect.any(String));
  });

  it('rejects unauthenticated project access', async () => {
    await request(app.getHttpServer()).get('/projects').expect(401);
  });

  it('creates and fetches a task under an owned project', async () => {
    const project = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'E2E project' })
      .expect(201);

    const created = await request(app.getHttpServer())
      .post(`/projects/${project.body.id}/tasks`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'E2E task', status: 'TODO', dueDate: '2026-12-31' })
      .expect(201);

    const result = await request(app.getHttpServer())
      .get(`/projects/${project.body.id}/tasks?status=TODO&page=1&limit=10`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(result.body).toMatchObject({ total: 1, page: 1, limit: 10 });
    expect(result.body.items[0]).toMatchObject({
      id: created.body.id,
      title: 'E2E task',
    });
  });
});
