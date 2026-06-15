import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../dto/error-response.dto';

/** 401 + 403 for role/scope-gated routes. */
export const ApiAuthErrors = () =>
  applyDecorators(
    ApiUnauthorizedResponse({
      type: ErrorResponseDto,
      description: 'Missing or invalid access token.',
    }),
    ApiForbiddenResponse({
      type: ErrorResponseDto,
      description:
        'Authenticated, but the role or warehouse scope is not allowed.',
    }),
  );

/** 401 for routes guarded only by authentication (no role gate). */
export const ApiUnauthorizedTokenError = () =>
  applyDecorators(
    ApiUnauthorizedResponse({
      type: ErrorResponseDto,
      description: 'Missing or invalid access token.',
    }),
  );

/** 400 for routes that accept a request body or validated params. */
export const ApiValidationError = () =>
  applyDecorators(
    ApiBadRequestResponse({
      type: ErrorResponseDto,
      description: 'Request body or parameters failed validation.',
    }),
  );
