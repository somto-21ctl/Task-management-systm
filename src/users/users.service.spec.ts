import { Repository } from 'typeorm';
import { ListUsersDto } from './dto/list-users.dto';
import { User } from './user.entity';
import { UserRole } from './user-role.enum';
import { UsersService } from './users.service';

describe('UsersService', () => {
  const users = {
    findAndCount: jest.fn(),
    create: jest.fn((user) => user),
    save: jest.fn(),
  };
  let service: UsersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UsersService(users as unknown as Repository<User>);
  });

  it('creates public registrations with the user role', async () => {
    users.save.mockResolvedValue({ email: 'alex@example.com' });

    await service.create(
      'alex@example.com',
      'hashed-password',
      'Alex Morgan',
      '+14155552671',
    );

    expect(users.create).toHaveBeenCalledWith({
      email: 'alex@example.com',
      passwordHash: 'hashed-password',
      fullName: 'Alex Morgan',
      phoneNumber: '+14155552671',
      role: UserRole.USER,
    });
  });

  it('returns a paginated public projection without password hashes', async () => {
    const query = { page: 2, limit: 10 } as ListUsersDto;
    users.findAndCount.mockResolvedValue([[], 0]);

    await service.findPage(query);

    expect(users.findAndCount).toHaveBeenCalledWith({
      select: {
        id: true,
        email: true,
        fullName: true,
        phoneNumber: true,
        role: true,
        createdAt: true,
      },
      skip: 10,
      take: 10,
      order: { createdAt: 'DESC', id: 'ASC' },
    });
  });
});
