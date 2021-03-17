import { AppSyncError, ValidationError } from './Errors';
import middy from '@middy/core';
import { AppSyncResolverEvent } from 'aws-lambda';

type AppSyncResponse = {
  data?: unknown;
  errorInfo?: unknown;
  errorType?: string;
  errorMessage?: string;
};

type MiddyAppSyncConfig<T> = {
  validateArgs?: (args: T) => Promise<boolean> | boolean | unknown[];
};

const buildResponse = (response: unknown | Error): AppSyncResponse => {
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

export const appSync = <T = unknown>(
  config?: MiddyAppSyncConfig<T>,
): middy.MiddlewareObject<AppSyncResolverEvent<T>, unknown> => {
  return {
    before: async (handler) => {
      if (config?.validateArgs) {
        if (Array.isArray(handler.event)) {
          const result = handler.event.map((event) => {
            return config.validateArgs(event.args);
          });

          if (result.some((result) => !result)) {
            handler.response = result.map((result) => {
              if (!result) {
                return new ValidationError(result || null);
              }

              return null;
            });
          }
        } else {
          const result = config.validateArgs(handler.event.arguments);
          if (result !== true) {
            throw new ValidationError(result || null);
          }
        }
      }

      return handler;
    },

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
