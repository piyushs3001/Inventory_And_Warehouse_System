import {
  ArgumentsHost,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

function mockHost(url = '/x', method = 'GET') {
  let captured: Record<string, unknown> | undefined;
  const json = jest.fn((payload: unknown) => {
    captured = payload as Record<string, unknown>;
  });
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ url, method }),
    }),
  } as unknown as ArgumentsHost;
  return { host, status, json, body: () => captured };
}

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
  });

  it('preserves an HttpException status, message and error', () => {
    const { host, status, body } = mockHost('/auth/login');
    filter.catch(new ForbiddenException('nope'), host);
    expect(status).toHaveBeenCalledWith(403);
    expect(body()).toMatchObject({
      statusCode: 403,
      error: 'Forbidden',
      message: 'nope',
      path: '/auth/login',
    });
    expect(typeof body()?.timestamp).toBe('string');
  });

  it('preserves validation (array) messages from a BadRequestException', () => {
    const { host, status, body } = mockHost();
    filter.catch(
      new BadRequestException({
        message: ['name must be a string'],
        error: 'Bad Request',
        statusCode: 400,
      }),
      host,
    );
    expect(status).toHaveBeenCalledWith(400);
    expect(body()).toMatchObject({
      statusCode: 400,
      message: ['name must be a string'],
      error: 'Bad Request',
    });
  });

  it('maps an unknown exception to a generic 500 without leaking internals', () => {
    const errorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const { host, status, body } = mockHost('/boom');

    filter.catch(new Error('DB password is hunter2'), host);

    expect(status).toHaveBeenCalledWith(500);
    const result = body();
    expect(result?.statusCode).toBe(500);
    expect(result?.message).toBe('Internal server error');
    // The real cause must be logged server-side, not swallowed...
    expect(errorSpy).toHaveBeenCalled();
    // ...but never leaked to the client.
    expect(JSON.stringify(result)).not.toContain('hunter2');

    errorSpy.mockRestore();
  });

  it('emits exactly the ErrorResponseDto envelope keys', () => {
    const { host, body } = mockHost('/auth/login');
    filter.catch(new ForbiddenException('nope'), host);
    expect(Object.keys(body() ?? {}).sort()).toEqual(
      ['error', 'message', 'path', 'statusCode', 'timestamp'].sort(),
    );
  });
});
