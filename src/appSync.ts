import type { MiddlewareObj } from '@middy/core';
import type { AppSyncIdentity, AppSyncResolverEventHeaders } from 'aws-lambda';
import type { O, A } from 'ts-toolbelt';
import { AppSyncError } from './errors';

export type AppSyncResponse<TData = unknown, TInfo = unknown> =
  | ErrorResult<TData, TInfo>
  | SuccessResult<TData>;

export type SuccessResult<TData> = {
  data: TData;
  errorType?: never;
  errorMessage?: never;
  errorInfo?: never;
};

export type ErrorResult<TData, TInfo> = {
  errorType: string;
  errorMessage: string;
  data?: TData;
  errorInfo?: TInfo;
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

export type AppSyncResolverEventInput = {
  arguments?: Record<string, unknown> | null;
  stash?: Record<string, unknown> | null;
  source?: Record<string, unknown> | null;
  prev?: Record<string, unknown> | null;
  identity?: AppSyncIdentity;
};

type Default<
  TEvent extends AppSyncResolverEventInput,
  K extends keyof AppSyncResolverEventInput,
  TDefault extends AppSyncResolverEventInput[K],
> =
  A.Extends<TEvent, O.Required<AppSyncResolverEventInput, K>> extends 1
    ? TEvent[K]
    : TDefault;

export interface AppSyncResolverEvent<
  TEvent extends AppSyncResolverEventInput = Record<string, unknown>,
> {
  arguments: Default<TEvent, 'arguments', null>;
  stash: Default<TEvent, 'stash', null>;
  source: Default<TEvent, 'source', null>;
  prev: Default<TEvent, 'prev', null>;
  identity: Default<TEvent, 'identity', AppSyncIdentity>;
  request: {
    headers: AppSyncResolverEventHeaders;
    domainName: string | null;
  };
  info: {
    selectionSetList: string[];
    selectionSetGraphQL: string;
    parentTypeName: string;
    fieldName: string;
    variables: { [key: string]: unknown };
  };
}

export const appSync = (): MiddlewareObj => {
  return {
    onError: async (request) => {
      const response = buildResponse(request.error);
      if (Array.isArray(request.event)) {
        const resp = new Array(request.event.length);
        request.response = resp.fill(response);

        // handle error
        return request.response;
      } else {
        request.response = response;

        // handle error
        return request.response;
      }
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
