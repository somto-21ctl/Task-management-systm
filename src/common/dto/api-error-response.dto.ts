import { ApiProperty } from '@nestjs/swagger';

export class ApiErrorResponseDto {
  @ApiProperty({ example: 400, description: 'HTTP status code.' })
  statusCode: number;

  @ApiProperty({
    description:
      'Human-readable error message. Validation failures may return multiple messages.',
    oneOf: [
      { type: 'string', example: 'Request failed' },
      {
        type: 'array',
        items: { type: 'string' },
        example: ['email must be an email'],
      },
    ],
  })
  message: string | string[];

  @ApiProperty({
    example: '/projects/7e5c785b-7351-4adf-ae92-b5eb93983bb4',
    description: 'Request path that produced the error.',
  })
  path: string;

  @ApiProperty({
    format: 'date-time',
    example: '2026-10-14T08:17:23.498Z',
    description: 'Time when the error was generated.',
  })
  timestamp: string;
}
