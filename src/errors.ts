export class AppSyncError<
  TData extends Record<string, unknown> | null = null,
  TInfo extends Record<string, unknown> | null = null,
> extends Error {
  readonly type: string;
  readonly data: TData | null;
  readonly info: TInfo | null;

  constructor(
    message: string,
    type: string = 'UnknownError',
    data: TData | null = null,
    info: TInfo | null = null,
  ) {
    super(message);
    this.type = type;
    this.data = data;
    this.info = info;
  }
}

export class UnauthorizedError extends AppSyncError {
  constructor(message?: string) {
    super(message || 'Unauthorized', 'UnauthorizedError');
  }
}

export class NotFoundError extends AppSyncError {
  constructor(message?: string) {
    super(message || 'Not found', 'NotFound');
  }
}
