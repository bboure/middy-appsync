import appSync from '../index'
import { GraphQlError } from '../error'
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

  it('Should handle an Error', () => {
    const handler = middy((event, _, cb) => {
      cb(new Error('Some Error'))
    })

    handler.use(appSync())

    handler({}, {}, (error, response) => {
      expect(error).toBeAnInstanceof(Error)
      expect(error.message).toEqual('Some Error')
      expect(response).toBeUndefined()
    })
  })

  it('Should handle a non GraphQl Error response anonymously', () => {
    const handler = middy((event, _, cb) => {
      cb(null, new Error('Uncaught ReferenceError: myVar is not defined at index.js:123:456'))
    })

    handler.use(appSync())

    handler({}, {}, (_, response) => {
      expect(response.errorMessage).toEqual('errorMessage')
    })
  })

  it('Should not handle a non GraphQl Error', () => {
    const error = new Error('Uncaught ReferenceError: myVar is not defined at index.js:123:456')
    const handler = middy((event, _, cb) => {
      cb(error)
    })

    handler.use(appSync())

    handler({}, {}, (error, response) => {
      expect(error.message).toBe(error)
      expect(response).toBeUndefined()
    })
  })

  it('Should succeed when response matches event', () => {
    const handler = middy((event, _, cb) => cb(null, [{}, {}]))
    const middleware = appSync()
    const spy = jest.spyOn(middleware, 'after')
    handler.use(middleware)
    handler([{}, {}], {}, async (_, message) => {
      expect(spy).toHaveBeenCalledTimes(1)
      await expect(spy.mock.results[0].value).resolves.toBeUndefined()
    })
  })

  it('Should fail if the event length does not match the response length', () => {
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
