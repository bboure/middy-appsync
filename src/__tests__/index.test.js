import { appSync, GraphQlError } from '../index'

const middy = require('middy')

describe('appsync middleware test suite', () => {
  it('Should wrap the response in a GraphQl template', () => {
    const handler = middy((event, _, cb) => {
      cb(null, {
        field1: 'foo',
        field2: 'bar'
      })
    })

    handler.use(appSync())

    handler({}, {}, (_, response) => {
      expect(response).toMatchSnapshot()
    })
  })

  it('Should handle a GraphQlError error', () => {
    const handler = middy((event, _, cb) => {
      cb(new GraphQlError(
        'Error message',
        'Error',
        { some: 'data' },
        { info: 'value' }
      ))
    })

    handler.use(appSync())

    handler({}, {}, (_, response) => {
      expect(response).toMatchSnapshot()
    })
  })

  it('Should handle a thrown GraphQlError', () => {
    const handler = middy((event, _, cb) => {
      throw new GraphQlError(
        'Thrown Error message',
        'Thrown Error',
        { some: 'data' },
        { info: 'value' }
      )
    })

    handler.use(appSync())

    handler({}, {}, (_, response) => {
      expect(response).toMatchSnapshot()
    })
  })

  it('Should handle a GraphQlError response', () => {
    const handler = middy((event, _, cb) => {
      cb(null, new GraphQlError(
        'Returned Error message',
        'ReturnedError',
        { some: 'data' },
        { info: 'value' }
      ))
    })

    handler.use(appSync())

    handler({}, {}, (_, response) => {
      expect(response).toMatchSnapshot()
    })
  })

  it('Should handle a thrown GraphQlError with async', () => {
    const handler = middy(async (event) => {
      throw new GraphQlError(
        'Thrown Error message',
        'Thrown Error',
        { some: 'data' },
        { info: 'value' }
      )
    })

    handler.use(appSync())

    handler({}, {}, (_, response) => {
      expect(response).toMatchSnapshot()
    })
  })

  it('Should handle a returned GraphQlError with async', () => {
    const handler = middy(async (event) => {
      return new GraphQlError(
        'Returned Error message',
        'ReturnedError',
        { some: 'data' },
        { info: 'value' }
      )
    })

    handler.use(appSync())

    handler({}, {}, (_, response) => {
      expect(response).toMatchSnapshot()
    })
  })

  it('Should handle an standard Error', () => {
    const handler = middy((event, _, cb) => {
      cb(new Error('Some Error'))
    })

    handler.use(appSync())

    handler({}, {}, (error, response) => {
      expect(error).toBeInstanceOf(Error)
      expect(error.message).toEqual('Some Error')
      expect(response).toBeUndefined()
    })
  })

  it('Should handle a standard Error response anonymously', () => {
    const handler = middy((event, _, cb) => {
      cb(null, new Error('Uncaught ReferenceError: myVar is not defined at index.js:123:456'))
    })

    handler.use(appSync())

    handler({}, {}, (_, response) => {
      expect(response.errorMessage).toEqual('Internal Server Error')
    })
  })

  it('Should not handle a standard Error', () => {
    const error = new Error('Uncaught ReferenceError: myVar is not defined at index.js:123:456')
    const handler = middy((event, _, cb) => {
      cb(error)
    })

    handler.use(appSync())

    handler({}, {}, (error, response) => {
      expect(error).toBe(error)
      expect(response).toBeUndefined()
    })
  })

  it('Should succeed when response matches event in batches', () => {
    const handler = middy((event, _, cb) =>
      cb(null, [
        { foo: 'bar' },
        { biz: 'baz' }
      ]
      ))
    handler.use(appSync())
    handler([{}, {}], {}, (_, message) => {
      expect(message).toMatchSnapshot()
    })
  })

  it('Should accept mixed errors/responses in batches', () => {
    const handler = middy((event, _, cb) =>
      cb(null, [
        { foo: 'bar' },
        new GraphQlError('Not Found', 'NotFound')
      ]
      ))
    handler.use(appSync())
    handler([{}, {}], {}, (_, message) => {
      expect(message).toMatchSnapshot()
    })
  })

  it('Should reject the whole batch when returning an error in batch', () => {
    const handler = middy((event, _, cb) => {
      cb(new GraphQlError('Internal Error', 'NotFoundInternal Error'))
    })
    handler.use(appSync())
    handler([{}, {}], {}, (_, message) => {
      expect(message).toMatchSnapshot()
    })
  })

  it('Should reject the whole batch when throwing an error in batch', () => {
    const handler = middy((event) => {
      throw new GraphQlError('Internal Error', 'Internal Error')
    })
    handler.use(appSync())
    handler([{}, {}], {}, (_, message) => {
      expect(message).toMatchSnapshot()
    })
  })

  it('Should reject the whole batch when throwing an error in batch with async', () => {
    const handler = middy(async (event) => {
      throw new GraphQlError('Internal Error', 'Internal Error')
    })
    handler.use(appSync())
    handler([{}, {}], {}, (_, message) => {
      expect(message).toMatchSnapshot()
    })
  })

  it('Should fail when the response is not an array but the event is', () => {
    const handler = middy((event, _, cb) => {
      cb(null, { foo: 'bar' })
    })

    const middleware = appSync()
    const spy = jest.spyOn(middleware, 'after')

    handler.use(middleware)

    handler([{}, {}, {}], {}, async (_, message) => {
      expect(spy).toHaveBeenCalledTimes(1)
      await expect(spy.mock.results[0].value).rejects.toMatchSnapshot()
    })
  })

  it('Should fail when the response length does not match the event length', () => {
    const handler = middy((event, _, cb) => {
      cb(null, [
        'foo',
        'bar'
      ])
    })

    const middleware = appSync()
    const spy = jest.spyOn(middleware, 'after')

    handler.use(middleware)

    handler([{}, {}, {}], {}, async (_, message) => {
      expect(spy).toHaveBeenCalledTimes(1)
      await expect(spy.mock.results[0].value).rejects.toMatchSnapshot()
    })
  })
})
