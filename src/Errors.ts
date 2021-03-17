export class AppSyncError extends Error {
  type: string;
  data?: unknown;
  info?: unknown;

  constructor(
    message: string,
    type = 'UnknownError',
    data: unknown = null,
    info: unknown = null,
  ) {
    super(message);
    this.type = type;
    this.data = data;
    this.info = info;
  }
}

export class UnauthorizedException extends AppSyncError {
  constructor(message?: string) {
    super(
      message || 'You are not authorized to make this call.',
      'UnauthorizedException',
    );
  }
}

export class NotFoundException extends AppSyncError {
  constructor(message?: string) {
    super(message || 'Resource not found', 'NotFound');
  }
}
export class ValidationError extends AppSyncError {
  constructor(errors: unknown) {
    super('Input Invalid', 'InvalidInput', null, errors);
  }
}
