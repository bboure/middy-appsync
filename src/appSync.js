import { GraphQlError } from './GraphQlError'
import { constant, times } from 'lodash'

const buildResponse = (response) => {
  if (response instanceof GraphQlError) {
    return {
      data: response.data,
      errorInfo: response.info,
      errorType: response.type,
      errorMessage: response.message
    }
  } else if (response instanceof Error) {
    return { errorMessage: 'Internal Server Error' }
  } else {
    return { data: response }
  }
}

export function appSync () {
  return {
    onError: async (handler, next) => {
      if (handler.error instanceof GraphQlError) {
        const response = buildResponse(handler.error)
        if (Array.isArray(handler.event)) {
          handler.response = times(handler.event.length, constant(response))
        } else {
          handler.response = response
        }

        return false
      }

      return handler.error
    },

    after: async (handler) => {
      const { response } = handler

      if (Array.isArray(handler.event)) {
        if (!Array.isArray(response) || handler.event.length !== response.length) {
          throw new Error('BatchInvoke: The response does not match the request payload')
        }

        handler.response = response.map(buildResponse)
      } else {
        handler.response = buildResponse(response)
      }
    }
  }
}
