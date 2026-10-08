import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ListUsersDto } from './dto/list-users.dto';
import { User } from './user.entity';
import { UserRole } from './user-role.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  findByEmail(email: string) {
    return this.users.findOne({
      where: { email },
      select: { id: true, email: true, passwordHash: true, role: true },
    });
  }

  findById(id: string) {
    return this.users.findOneBy({ id });
  }

  create(email: string, passwordHash: string) {
    return this.users.save(
      this.users.create({ email, passwordHash, role: UserRole.USER }),
    );
  }

  async findPage(query: ListUsersDto) {
    const [items, total] = await this.users.findAndCount({
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
      },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      order: { createdAt: 'DESC', id: 'ASC' },
    });
    return { items, total, page: query.page, limit: query.limit };
  }
}
