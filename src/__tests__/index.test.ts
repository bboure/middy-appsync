import middy from '@middy/core';
import { Context } from 'aws-lambda';
import { appSync } from '../appSync';
import { GraphQlError } from '../GraphQlError';

const fakeConext: Context = ({} as unknown) as Context;

describe('appsync middleware test suite', () => {
  it('Should wrap the response in a GraphQl template', () => {
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

  it('Should handle a GraphQlError error', () => {
    const handler = middy((event, context, cb) => {
      cb(
        new GraphQlError(
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

  it('Should handle a thrown GraphQlError', () => {
    const handler = middy(() => {
      throw new GraphQlError(
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

  it('Should handle a GraphQlError response', () => {
    const handler = middy((_event, context, cb) => {
      cb(
        null,
        new GraphQlError(
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

  it('Should handle a thrown GraphQlError with async', () => {
    const handler = middy(
      async (): Promise<unknown> => {
        throw new GraphQlError(
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

  it('Should handle a returned GraphQlError with async', () => {
    const handler = middy(async () => {
      return new GraphQlError(
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

  it('Should handle a standard Error anonymously', () => {
    const handler = middy((event, context, cb) => {
      cb(new Error('Some Error'));
    });

    handler.use(appSync());

    handler({}, fakeConext, (error, response) => {
      expect(error).toBeNull();
      expect(response.errorMessage).toEqual('Internal Server Error');
    });
  });

  it('Should handle a standard Error response anonymously', () => {
    const handler = middy((event, context, cb) => {
      cb(
        null,
        new Error(
          'Uncaught ReferenceError: myVar is not defined at index.js:123:456',
        ),
      );
    });

    handler.use(appSync());

    handler({}, fakeConext, (error, response) => {
      expect(error).toBeNull();
      expect(response.errorMessage).toEqual('Internal Server Error');
    });
  });

  it('Should handle a standard Error anonymously', () => {
    const handler = middy((event, context, cb) => {
      cb(
        new Error(
          'Uncaught ReferenceError: myVar is not defined at index.js:123:456',
        ),
      );
    });

    handler.use(appSync());

    handler({}, fakeConext, (error, response) => {
      expect(error).toBeNull();
      expect(response.errorMessage).toEqual('Internal Server Error');
    });
  });

  it('Should succeed when response matches event in batches', () => {
    const handler = middy((event, context, cb) =>
      cb(null, [{ foo: 'bar' }, { biz: 'baz' }]),
    );
    handler.use(appSync());
    handler([{}, {}], fakeConext, (_, message) => {
      expect(message).toMatchSnapshot();
    });
  });

  it('Should accept mixed errors/responses in batches', () => {
    const handler = middy((event, context, cb) =>
      cb(null, [{ foo: 'bar' }, new GraphQlError('Not Found', 'NotFound')]),
    );
    handler.use(appSync());
    handler([{}, {}], fakeConext, (_, message) => {
      expect(message).toMatchSnapshot();
    });
  });

  it('Should reject the whole batch when returning an error in batch', () => {
    const handler = middy((event, context, cb) => {
      cb(new GraphQlError('Internal Error', 'NotFoundInternal Error'));
    });
    handler.use(appSync());
    handler([{}, {}], fakeConext, (_, message) => {
      expect(message).toMatchSnapshot();
    });
  });

  it('Should reject the whole batch when throwing an error in batch', () => {
    const handler = middy(() => {
      throw new GraphQlError('Internal Error', 'Internal Error');
    });
    handler.use(appSync());
    handler([{}, {}], fakeConext, (_, message) => {
      expect(message).toMatchSnapshot();
    });
  });

  it('Should reject the whole batch when throwing an error in batch with async', () => {
    const handler = middy(
      async (): Promise<unknown> => {
        throw new GraphQlError('Internal Error', 'Internal Error');
      },
    );
    handler.use(appSync());
    handler([{}, {}], fakeConext, (_, message) => {
      expect(message).toMatchSnapshot();
    });
  });

  it('Should fail when the response is not an array but the event is', () => {
    const handler = middy((event, context, cb) => {
      cb(null, { foo: 'bar' });
    });

    const middleware = appSync();
    const spy = jest.spyOn(middleware, 'after');

    handler.use(middleware);

    handler([{}, fakeConext, {}], fakeConext, async () => {
      expect(spy).toHaveBeenCalledTimes(1);
      await expect(spy.mock.results[0].value).rejects.toMatchSnapshot();
    });
  });

  it('Should fail when the response length does not match the event length', () => {
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
