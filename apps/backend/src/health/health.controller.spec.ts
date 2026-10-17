import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('reports a healthy service', () => {
    expect(controller.check()).toMatchObject({
      status: 200,
      code: 'HEALTH_OK',
      data: { uptime: expect.any(Number) },
    });
  });
});
