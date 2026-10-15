import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { ApiErrorResponseDto } from '../dto/api-error-response.dto';

interface ApiErrorResponse {
  status: number;
  description: string;
}

export function ApiErrorResponses(...responses: ApiErrorResponse[]) {
  const documentedResponses = responses.some(({ status }) => status === 429)
    ? responses
    : [
        ...responses,
        {
          status: 429,
          description: 'The API rate limit has been exceeded.',
        },
      ];

  return applyDecorators(
    ...documentedResponses.map(({ status, description }) =>
      ApiResponse({
        status,
        description,
        type: ApiErrorResponseDto,
      }),
    ),
  );
}
