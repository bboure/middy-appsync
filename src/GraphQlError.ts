export class GraphQlError extends Error {
  type: string;
  data?: any;
  info?: any;

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
