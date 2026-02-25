import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { HealthController, HealthService } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;
  let healthService: Partial<HealthService>;

  const mockRes = {
    status: jest.fn().mockReturnThis(),
  } as unknown as Response;

  beforeEach(async () => {
    healthService = {
      checkHealth: jest.fn().mockResolvedValue({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        uptime: 100,
        checks: {
          database: { status: 'up', responseTime: 1 },
          redis: { status: 'up', responseTime: 1 },
          memory: { status: 'up', responseTime: 0, usedMB: 50, totalMB: 128 },
          disk: { status: 'up', responseTime: 0 },
        },
      }),
      checkLiveness: jest.fn().mockReturnValue({
        status: 'alive',
        timestamp: new Date().toISOString(),
      }),
      checkReadiness: jest.fn().mockResolvedValue({
        status: 'ready',
        checks: ['database: connected', 'redis: connected'],
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: healthService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check', () => {
    it('should return 200 and health payload when healthy', async () => {
      const res = { ...mockRes };
      const result = await controller.check(res as Response);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(result).toMatchObject({ status: 'healthy' });
      expect(result).toHaveProperty('checks');
    });

    it('should return 503 when status is unhealthy', async () => {
      (healthService.checkHealth as jest.Mock).mockResolvedValueOnce({
        status: 'unhealthy',
        checks: {},
      });
      const res = { ...mockRes };
      await controller.check(res as Response);
      expect(res.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    });
  });

  describe('liveness', () => {
    it('should return alive status', () => {
      const result = controller.liveness();
      expect(result).toEqual({
        status: 'alive',
        timestamp: expect.any(String),
      });
    });
  });

  describe('readiness', () => {
    it('should return 200 when ready', async () => {
      const res = { ...mockRes };
      await controller.readiness(res as Response);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 503 when not ready', async () => {
      (healthService.checkReadiness as jest.Mock).mockResolvedValueOnce({
        status: 'not_ready',
        checks: ['database: disconnected'],
      });
      const res = { ...mockRes };
      await controller.readiness(res as Response);
      expect(res.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    });
  });
});
