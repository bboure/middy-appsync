import { Code } from 'aws-cdk-lib/aws-appsync';

export const MiddyCdkAppSyncLambdaResolver = Code.fromInline(/* js */ `
import { util } from '@aws-appsync/utils';

export const request = (ctx) => {
  return {
    operation: 'Invoke',
    invocationType: 'RequestResponse',
    payload: ctx,
  };
};

export const response = (ctx) => {
  const { result } = ctx;

  if (ctx.error) {
    util.error('Internal Error', 'InternalError');
  }

  if (result.errorType === 'UnauthorizedError') {
    util.unauthorized();
  }

  if (result.errorMessage) {
    util.error(
      result.errorMessage,
      result.errorType,
      result.data,
      result.errorInfo,
    );
  }

  return result.data;
};
`);
