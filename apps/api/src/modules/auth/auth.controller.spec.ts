import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: Partial<AuthService>;

  beforeEach(async () => {
    authService = {
      register: jest.fn().mockResolvedValue({ id: 'user-1', email: 'test@example.com' }),
      getMe: jest.fn().mockResolvedValue({ id: 'user-1', email: 'test@example.com', role: 'STUDENT' }),
      forgotPassword: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should call authService.register and return result', async () => {
      const dto = { email: 'test@example.com', password: 'Password1!', name: 'Test' };
      const result = await controller.register(dto as any);
      expect(authService.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ id: 'user-1', email: 'test@example.com' });
    });
  });

  describe('getMe', () => {
    it('should return current user from service', async () => {
      const user = { id: 'user-1', email: 'test@example.com', role: 'STUDENT' } as any;
      const result = await controller.getMe(user);
      expect(authService.getMe).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({ id: 'user-1', email: 'test@example.com', role: 'STUDENT' });
    });
  });

  describe('forgotPassword', () => {
    it('should call authService.forgotPassword', async () => {
      await controller.forgotPassword({ email: 'test@example.com' } as any);
      expect(authService.forgotPassword).toHaveBeenCalledWith('test@example.com');
    });
  });
});
