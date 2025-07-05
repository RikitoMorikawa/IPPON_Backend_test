import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getApp } from '@src/app';
import { FastifyInstance } from 'fastify';


// test scenarios
/*
  1. Success Cases
    1.1 Get report list with default limit=5
    1.2 Get report list with custom limit
    1.3 Get report list with pagination

  2. Error Cases
    2.1 When specifying non-existent property ID
    2.2 When specifying invalid limit parameter
    2.3 When specifying invalid page parameter
*/

describe('Reports API Integration Tests', () => {
  let app: FastifyInstance;

  // setup fastify app before tests
  beforeAll(async () => {
    app = await getApp();
  });

  // successful scenarios
  describe('Successful scenarios', () => {
    it('should return report list with default limit (5)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/properties/prop-001/reports'
      });

      expect(response.statusCode).toBe(200);
      
      const payload = JSON.parse(response.payload);
      expect(payload.status).toBe(200);
      expect(payload.message).toBeDefined();
      expect(payload.data).toBeDefined();
      expect(payload.data.property.id).toBe('prop-001');
      expect(payload.data.reports).toHaveLength(5); // default limit=5
      expect(payload.data.pagination.limit).toBe(5);
    });

    it('should return report list with custom limit (10)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/properties/prop-001/reports?limit=10'
      });

      expect(response.statusCode).toBe(200);
      
      const payload = JSON.parse(response.payload);
      expect(payload.data.reports.length).toBeLessThanOrEqual(10);
      expect(payload.data.pagination.limit).toBe(10);
    });

    it('should return report list for page 2', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/properties/prop-001/reports?page=2'
      });

      expect(response.statusCode).toBe(200);
      
      const payload = JSON.parse(response.payload);
      expect(payload.data.pagination.current_page).toBe(2);
    });

    it('should return empty reports array for property with no reports', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/properties/prop-003/reports'
      });

      expect(response.statusCode).toBe(200);
      
      const payload = JSON.parse(response.payload);
      expect(payload.data.reports).toHaveLength(0);
      expect(payload.data.pagination.total_count).toBe(0);
    });
  });

  // error scenarios
  describe('Error scenarios', () => {
    it('should return 404 for non-existent property', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/properties/prop-999/reports'
      });

      expect(response.statusCode).toBe(404);
      
      const payload = JSON.parse(response.payload);
      expect(payload.status).toBe(404);
      expect(payload.message).toContain('Specified property not found');
      expect(payload.error).toBeDefined();
      expect(payload.error.code).toBe('NOT_FOUND');
    });

    it('should return 400 for invalid limit parameter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/properties/prop-001/reports?limit=7'
      });

      expect(response.statusCode).toBe(400);
      
      const payload = JSON.parse(response.payload);
      expect(payload.status).toBe(400);
      expect(payload.message).toContain('Validation failed');
      expect(payload.error).toBeDefined();
      expect(payload.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for negative page parameter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/properties/prop-001/reports?page=-1'
      });

      expect(response.statusCode).toBe(400);
      
      const payload = JSON.parse(response.payload);
      expect(payload.status).toBe(400);
    });

    it('should return 400 for non-numeric page parameter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/properties/prop-001/reports?page=abc'
      });

      expect(response.statusCode).toBe(400);
      
      const payload = JSON.parse(response.payload);
      expect(payload.status).toBe(400);
    });
  });
});