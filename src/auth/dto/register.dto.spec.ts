import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterDto } from './register.dto';

describe('RegisterDto', () => {
  const validRegistration = {
    email: '  alex@example.com ',
    password: 'StrongPassword!2026',
    fullName: ' Alex Morgan ',
    phoneNumber: ' +14155552671 ',
  };

  it('trims email, fullName, and phoneNumber and accepts valid values', async () => {
    const dto = plainToInstance(RegisterDto, validRegistration);
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.email).toBe('alex@example.com');
    expect(dto.fullName).toBe('Alex Morgan');
    expect(dto.phoneNumber).toBe('+14155552671');
  });

  it.each([
    ['short password', { password: 'Short!1' }],
    ['password missing a symbol', { password: 'StrongPassword2026' }],
    ['numeric name', { fullName: 'Alex2 Morgan' }],
    ['punctuation in name', { fullName: 'Alex! Morgan' }],
    ['invalid phone format', { phoneNumber: '415-555-2671' }],
    ['invalid email', { email: 'not-an-email' }],
  ])('rejects %s', async (_caseName, override) => {
    const dto = plainToInstance(RegisterDto, {
      ...validRegistration,
      ...override,
    });

    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });
});
