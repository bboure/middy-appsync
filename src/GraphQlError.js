export class GraphQlError extends Error {
  constructor (message, type = 'UnknownError', data = null, info = null) {
    super(message)
    this.type = type
    this.data = data
    this.info = info
  }
}
