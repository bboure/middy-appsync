import middy from '@middy/core';
import { Context } from 'aws-lambda';
import { appSync } from '../appSync';
import { AppSyncError, NotFoundException } from '../Errors';

const fakeConext: Context = ({} as unknown) as Context;

describe('middleware', () => {
  it('should wrap the response in an AppSync response object', () => {
    const handler = middy((event, context, cb) => {
      cb(null, {
        field1: 'foo',
        field2: 'bar',
      });
    });

    handler.use(appSync());

    handler({}, fakeConext, (_, response) => {
      expect(response).toMatchSnapshot();
    });
  });

  it('should handle an AppSyncError', () => {
    const handler = middy((event, context, cb) => {
      cb(
        new AppSyncError(
          'Error message',
          'Error',
          { some: 'data' },
          { info: 'value' },
        ),
      );
    });

    handler.use(appSync());

    handler({}, fakeConext, (_, response) => {
      expect(response).toMatchSnapshot();
    });
  });

  it('should handle a thrown AppSyncError', () => {
    const handler = middy(() => {
      throw new AppSyncError(
        'Thrown Error message',
        'Thrown Error',
        { some: 'data' },
        { info: 'value' },
      );
    });

    handler.use(appSync());

    handler({}, fakeConext, (_, response) => {
      expect(response).toMatchSnapshot();
    });
  });

  it('should handle an AppSyncError response', () => {
    const handler = middy((_event, context, cb) => {
      cb(
        null,
        new AppSyncError(
          'Returned Error message',
          'ReturnedError',
          { some: 'data' },
          { info: 'value' },
        ),
      );
    });

    handler.use(appSync());

    handler({}, fakeConext, (_, response) => {
      expect(response).toMatchSnapshot();
    });
  });

  it('should handle a thrown AppSyncError with async', () => {
    const handler = middy(
      async (): Promise<unknown> => {
        throw new AppSyncError(
          'Thrown Error message',
          'Thrown Error',
          { some: 'data' },
          { info: 'value' },
        );
      },
    );

    handler.use(appSync());

    handler({}, fakeConext, (_, response) => {
      expect(response).toMatchSnapshot();
    });
  });

  it('should handle a NotFoundException', () => {
    const handler = middy(
      async (): Promise<unknown> => {
        throw new NotFoundException();
      },
    );

    handler.use(appSync());

    handler({}, fakeConext, (_, response) => {
      expect(response).toMatchSnapshot();
    });
  });

  it('should handle a returned AppSyncError with async', () => {
    const handler = middy(async () => {
      return new AppSyncError(
        'Returned Error message',
        'ReturnedError',
        { some: 'data' },
        { info: 'value' },
      );
    });

    handler.use(appSync());

    handler({}, fakeConext, (_, response) => {
      expect(response).toMatchSnapshot();
    });
  });

  it('should re-throw standard Error response', () => {
    const handler = middy((event, context, cb) => {
      cb(
        null,
        new Error(
          'Uncaught ReferenceError: myVar is not defined at index.js:123:456',
        ),
      );
    });

    handler.use(appSync());

    handler({}, fakeConext, (error, message) => {
      expect(error).toMatchSnapshot();
      expect(message).toMatchSnapshot();
    });
  });

  it('should re-throw standard Error', () => {
    const handler = middy((event, context, cb) => {
      cb(
        new Error(
          'Uncaught ReferenceError: myVar is not defined at index.js:123:456',
        ),
      );
    });

    handler.use(appSync());

    handler({}, fakeConext, (error, message) => {
      expect(error).toMatchSnapshot();
      expect(message).toMatchSnapshot();
    });
  });

  it('should leave standard Errors', () => {
    const handler = middy(
      async (): Promise<unknown> => {
        throw new Error(
          'Uncaught ReferenceError: myVar is not defined at index.js:123:456',
        );
      },
    );

    handler.use(appSync());

    handler({}, fakeConext, (error, message) => {
      expect(error).toMatchSnapshot();
      expect(message).toMatchSnapshot();
    });
  });

  it('should succeed when response matches event in batches', () => {
    const handler = middy((event, context, cb) =>
      cb(null, [{ foo: 'bar' }, { biz: 'baz' }]),
    );
    handler.use(appSync());
    handler([{}, {}], fakeConext, (_, message) => {
      expect(message).toMatchSnapshot();
    });
  });

  it('should accept mixed errors/responses in batches', () => {
    const handler = middy((event, context, cb) =>
      cb(null, [{ foo: 'bar' }, new AppSyncError('Not Found', 'NotFound')]),
    );
    handler.use(appSync());
    handler([{}, {}], fakeConext, (_, message) => {
      expect(message).toMatchSnapshot();
    });
  });

  it('should reject the whole batch when returning an error', () => {
    const handler = middy((event, context, cb) => {
      cb(new AppSyncError('Internal Error', 'Internal Error'));
    });
    handler.use(appSync());
    handler([{}, {}], fakeConext, (_, message) => {
      expect(message).toMatchSnapshot();
    });
  });

  it('should reject the whole batch when throwing an error', () => {
    const handler = middy(() => {
      throw new AppSyncError('Internal Error', 'Internal Error');
    });
    handler.use(appSync());
    handler([{}, {}], fakeConext, (_, message) => {
      expect(message).toMatchSnapshot();
    });
  });

  it('should reject the whole batch when throwing an error with async', () => {
    const handler = middy(
      async (): Promise<unknown> => {
        throw new AppSyncError('Internal Error', 'Internal Error');
      },
    );
    handler.use(appSync());
    handler([{}, {}], fakeConext, (_, message) => {
      expect(message).toMatchSnapshot();
    });
  });

  it('should fail when the response is not an array but the event is', () => {
    const handler = middy((event, context, cb) => {
      cb(null, { foo: 'bar' });
    });

    const middleware = appSync();
    const spy = jest.spyOn(middleware, 'after');

    handler.use(middleware);

    handler([{}, {}, {}], fakeConext, async () => {
      expect(spy).toHaveBeenCalledTimes(1);
      await expect(spy.mock.results[0].value).rejects.toMatchSnapshot();
    });
  });

  it('should fail when the response length does not match the event length', () => {
    const handler = middy((event, context, cb) => {
      cb(null, ['foo', 'bar']);
    });

    const middleware = appSync();
    const spy = jest.spyOn(middleware, 'after');

    handler.use(middleware);

    handler([{}, fakeConext, {}], fakeConext, async () => {
      expect(spy).toHaveBeenCalledTimes(1);
      await expect(spy.mock.results[0].value).rejects.toMatchSnapshot();
    });
  });
});
