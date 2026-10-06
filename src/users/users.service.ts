import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

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
    return this.users.save(this.users.create({ email, passwordHash }));
  }
}
