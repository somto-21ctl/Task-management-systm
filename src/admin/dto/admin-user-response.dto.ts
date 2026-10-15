import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../users/user-role.enum';

export class AdminUserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'email' })
  email: string;

  @ApiProperty({ example: 'Alex Morgan', nullable: true })
  fullName: string | null;

  @ApiProperty({
    example: '+14155552671',
    nullable: true,
    description: 'E.164 international phone number.',
  })
  phoneNumber: string | null;

  @ApiProperty({ enum: UserRole })
  role: UserRole;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;
}
