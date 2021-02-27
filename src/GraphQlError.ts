export class GraphQlError extends Error {
  type: string;
  data?: unknown;
  info?: unknown;

  constructor(
    message: string,
    type = 'UnknownError',
    data = null,
    info = null,
  ) {
    super(message);
    this.type = type;
    this.data = data;
    this.info = info;
  }
}
