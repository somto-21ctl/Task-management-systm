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

  findAssignableUser(id: string) {
    return this.users.findOne({
      where: { id },
      select: { id: true, email: true, fullName: true },
    });
  }

  async findAssignableUsers(page: number, limit: number) {
    const [items, total] = await this.users.findAndCount({
      select: { id: true, email: true, fullName: true },
      skip: (page - 1) * limit,
      take: limit,
      order: { email: 'ASC', id: 'ASC' },
    });
    return { items, total, page, limit };
  }

  create(
    email: string,
    passwordHash: string,
    fullName: string,
    phoneNumber: string,
  ) {
    return this.users.save(
      this.users.create({
        email,
        passwordHash,
        fullName,
        phoneNumber,
        role: UserRole.USER,
      }),
    );
  }

  async findPage(query: ListUsersDto) {
    const [items, total] = await this.users.findAndCount({
      select: {
        id: true,
        email: true,
        fullName: true,
        phoneNumber: true,
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
