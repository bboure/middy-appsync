import middy from '@middy/core';
import { Context } from 'aws-lambda';
import { appSync } from '../appSync';
import { AppSyncError } from '../errors';
import { describe, expect, it } from 'vitest';

const fakeContext: Context = {} as unknown as Context;

describe('middleware', () => {
  it('should wrap the response in an AppSync response object', async () => {
    const handler = middy()
      .use(appSync())
      .handler(async () => {
        return {
          field1: 'foo',
          field2: 'bar',
        };
      });

    const result = handler({}, fakeContext);
    await expect(result).resolves.toMatchInlineSnapshot(`
      {
        "data": {
          "field1": "foo",
          "field2": "bar",
        },
      }
    `);
  });

  it('should handle an AppSyncError', async () => {
    const handler = middy()
      .use(appSync())
      .handler(async () => {
        throw new AppSyncError(
          'Error message',
          'Error',
          { some: 'data' },
          { info: 'value' },
        );
      });

    const result = handler({}, fakeContext);
    await expect(result).resolves.toMatchInlineSnapshot(`
      {
        "data": {
          "some": "data",
        },
        "errorInfo": {
          "info": "value",
        },
        "errorMessage": "Error message",
        "errorType": "Error",
      }
    `);
  });

  it('should handle an AppSyncError response', async () => {
    const handler = middy()
      .use(appSync())
      .handler(async () => {
        return new AppSyncError(
          'Returned Error message',
          'ReturnedError',
          { some: 'data' },
          { info: 'value' },
        );
      });

    const result = handler({}, fakeContext);
    await expect(result).resolves.toMatchInlineSnapshot(`
      {
        "data": {
          "some": "data",
        },
        "errorInfo": {
          "info": "value",
        },
        "errorMessage": "Returned Error message",
        "errorType": "ReturnedError",
      }
    `);
  });

  it('should maintain thrown Errors', async () => {
    const handler = middy()
      .use(appSync())
      .handler(async () => {
        throw new Error(
          'Uncaught ReferenceError: myVar is not defined at index.js:123:456',
        );
      });

    const result = handler({}, fakeContext);
    await expect(result).rejects.toMatchInlineSnapshot(
      `[Error: Uncaught ReferenceError: myVar is not defined at index.js:123:456]`,
    );
  });

  it('should succeed when response matches event in batches', async () => {
    const handler = middy()
      .use(appSync())
      .handler(() => [{ foo: 'bar' }, { biz: 'baz' }]);

    const result = handler({}, fakeContext);
    await expect(result).resolves.toMatchInlineSnapshot(`
      {
        "data": [
          {
            "foo": "bar",
          },
          {
            "biz": "baz",
          },
        ],
      }
    `);
  });

  it('should accept mixed errors/responses in batches', async () => {
    const handler = middy()
      .use(appSync())
      .handler(() => [
        { foo: 'bar' },
        new AppSyncError('Not Found', 'NotFound'),
      ]);

    const result = handler([{}, {}], fakeContext);
    await expect(result).resolves.toMatchInlineSnapshot(`
      [
        {
          "data": {
            "foo": "bar",
          },
        },
        {
          "data": null,
          "errorInfo": null,
          "errorMessage": "Not Found",
          "errorType": "NotFound",
        },
      ]
    `);
  });

  it('should reject the whole batch when throwing an error', async () => {
    const handler = middy()
      .use(appSync())
      .handler(() => {
        throw new AppSyncError('Internal Error', 'Internal Error');
      });

    const result = handler([{}, {}], fakeContext);
    await expect(result).resolves.toMatchInlineSnapshot(`
      [
        {
          "data": null,
          "errorInfo": null,
          "errorMessage": "Internal Error",
          "errorType": "Internal Error",
        },
        {
          "data": null,
          "errorInfo": null,
          "errorMessage": "Internal Error",
          "errorType": "Internal Error",
        },
      ]
    `);
  });

  it('should fail when the response is not an array but the event is', async () => {
    const handler = middy()
      .use(appSync())
      .handler(() => {
        return { foo: 'bar' };
      });

    const result = handler([{}, {}, {}], fakeContext);
    await expect(result).rejects.toMatchInlineSnapshot(
      `[Error: BatchInvoke: The response does not match the request payload]`,
    );
  });

  it('should fail when the response length does not match the event length', async () => {
    const handler = middy()
      .use(appSync())
      .handler(async () => {
        return [{}, {}];
      });

    const result = handler([{}, {}, {}], fakeContext);
    await expect(result).rejects.toMatchInlineSnapshot(
      `[Error: BatchInvoke: The response does not match the request payload]`,
    );
  });
});
