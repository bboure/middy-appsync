import { AppSyncError } from './Errors';
import middy from '@middy/core';

type AppSyncResponse = {
  data?: unknown;
  errorInfo?: unknown;
  errorType?: string;
  errorMessage?: string;
};

const buildResponse = (response: unknown): AppSyncResponse => {
  if (response instanceof AppSyncError) {
    return {
      data: response.data,
      errorInfo: response.info,
      errorType: response.type,
      errorMessage: response.message,
    };
  } else if (response instanceof Error) {
    // re-throw returned errors
    throw response;
  } else {
    return { data: response };
  }
};

export const appSync: middy.Middleware<unknown, unknown> = () => {
  return {
    onError: async (handler) => {
      const response = buildResponse(handler.error);
      if (Array.isArray(handler.event)) {
        const resp = new Array(handler.event.length);
        handler.response = resp.fill(response);
      } else {
        handler.response = response;
      }

      // mark the error as handled
      return false;
    },

    after: async (handler) => {
      const { response } = handler;
      if (Array.isArray(handler.event)) {
        if (
          !Array.isArray(response) ||
          handler.event.length !== response.length
        ) {
          throw new Error(
            'BatchInvoke: The response does not match the request payload',
          );
        }

        handler.response = response.map(buildResponse);
      } else {
        handler.response = buildResponse(response);
      }
    },
  };
};
