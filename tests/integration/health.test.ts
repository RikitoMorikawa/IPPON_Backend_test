import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getApp } from '@src/app';
import { FastifyInstance } from 'fastify';

describe('Health Check Endpoint', () => {
  let fastify: FastifyInstance;

  beforeAll(async () => {
    fastify = await getApp();
    await fastify.ready();
  });

  afterAll(async () => {
    await fastify.close();
  });

  it('should return 200 and status ok', async () => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ status: 'ok' });
  });
});