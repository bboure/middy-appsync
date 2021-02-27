[Middy](http://middy.js.org/) Middleware for [Aws AppSync](https://aws.amazon.com/appsync/).

# Install

```bash
npm install --save middy-appsync
```

# Purpose

This middleware follows the recommendations from the official [AppSync documentation](https://docs.aws.amazon.com/appsync/latest/devguide/tutorial-lambda-resolvers.html#returning-individual-errors).
It wraps the handler's response into a GraphQl Response object of the following shape:

```ts
{
  data: Object,
  errorMessage: string,
  errorType: string,
  errorInfo: Object
}
```

You can use it with a VTL template:

```velocity
#if( $context.result && $context.result.errorMessage )
    $utils.error($context.result.errorMessage, $context.result.errorType, $context.result.data, $context.result.errorInfo)
#else
    $utils.toJson($context.result.data)
#end
```

It will also wotk with [Direct Lambda](https://aws.amazon.com/blogs/mobile/appsync-direct-lambda/)

The midleware automatically wraps a successful response from the lambda function into the `data` field and any `Error` to the `error*` fields.

# Usage

## Basic usage

```js
const middy = require('@middy/core');
const { appSync } = require('middy-appsync');

const doStuff = (event, context, callback) => {
  callback(null, {
    field1: 'Foo',
    field2: 'Bar',
  });
};

const handler = middy(doStuff).use(appSync());

module.exports = { handler };
```

Will output

```js
{
  data: {
    field1: 'Foo',
    field2: 'Bar',
  }
}
```

## Error handling

When a "controlled" error occurs during the execution of your handler, you want to send basic information to the user. You can do so by filling the `errorMessage`, `errorType` and `errorInfo` fields.

You can acheive that with the a `GraphQlError` object in different ways:

### With the callback argument

There are 3 ways to handle errors:

- `throw` a `GraphQlError` or any object that extends the `Error` class.
- return it as the `error` argument of the callback
- return it as the `response` argument of the callback

### With promises/async

- `throw` a `GraphQlError` or any object that extends the `Error` class.
- return it as the rejected value
- return it as the resolved value

**Notes:**

Any `Error` object other than `GraphQlError` will be handled by the middleware but the `errorMessage` will be concealed into a "generic" `Internal Server Error` message. This is a prevention measure in order to avoid leaking sensitive error logs.

Example:

```js
const middy = require('@middy/core');
const { appSync, GraphQlError } = require('middy-appsync');

const doStuff = (event, context, callback) => {
  callback(new GraphQlError('Record not found', 'NotFoundError'));
};

const handler = middy(doStuff).use(appSync());

module.exports = { handler };
```

Will output

```js
{
  errorMessage: 'Record not found',
  errorType: 'NotFoundError',
  data: null,
  errorInfo: null
}
```

## BatchInvoke support

The middleware supports [Batching](https://docs.aws.amazon.com/appsync/latest/devguide/tutorial-lambda-resolvers.html#advanced-use-case-batching) resolvers. If it detects that
the `event` object is an array, it will expect an array as the `response` from the handler and
wrap each of its elements into a GraphQl response object.

If the response is not an array or its length is different from the `event`'s length, it will throw an Error.

```js
const middy = require('@middy/core');
const { appSync } = require('middy-appsync');

// event is an array
const doStuff = (event, context, callback) => {
  callback(null, [
    { title: 'Foo', content: 'Bar' },
    { title: 'Bizz', content: 'Bazz' },
  ]);
};

const handler = middy(doStuff).use(appSync());

module.exports = { handler };
```

Will output

```js
[
  {
    data: {
      title: 'Foo',
      content: 'Bar',
    },
  },
  {
    data: {
      title: 'Bizz',
      content: 'Bazz',
    },
  },
];
```

## BatchInvoke error handling

Just like for normal handlers, throwing a `GraphQlError` or returning it in the first argument of the callback willgenerated a GraphQL error. It is worth mentioning that, by doing so, the error will be replicated to **all** elements of the batch (making the full batch invalid).

You an also have granular control over which elements of the batch are valid or have errors. To do so, you can return a `GraphQlError`for the invalid elements in your batch.

Example:

```js
const middy = require('@middy/core');
const { appSync, GraphQlError } = require('middy-appsync');

const doStuff = (event, context, callback) => {
  callback(null, [
    new GraphQlError('Post not found', 'NotFound'), // first element is Invalid
    { title: 'Bizz', content: 'Bazz' }, // second element is valid
  ]);
};

const handler = middy(doStuff).use(appSync());

module.exports = { handler };
```

Will output

```js
[
  {
    errorMessage: 'Post not found',
    errorType: 'NotFound',
    data: null,
    errorInfo: null,
  },
  {
    data: {
      title: 'Bizz',
      content: 'Bazz',
    },
  },
];
```

This will result in an Error for the first element, and a valid response for the second one.

# Caveats

AppSync currently does not implement the GraphQl specs properly for the [Errors](https://graphql.github.io/graphql-spec/June2018/#sec-Errors) entry.

This middleware is currently limited to AppSync's implementation, using the `message`, `errorType`, `data` and `errorInfo`, entries.
There is an [open issue](https://github.com/aws/aws-appsync-community/issues/71) on AppSync for this.
