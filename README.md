[Middy](http://middy.js.org/) Middleware for [Aws AppSync](https://aws.amazon.com/appsync/).

# Install

```bash
npm install --save middy-appsync
```

# Purpose

## Controlled errors

Throwing Errors/Exceptions when you identify a _controlled error_ in your app can be unnecessarely noisy. They cause your Lambda function to **fail** and return an error.
Errors like `NotFoundException` or `UnauthorizedException` should _not_ raise alarms in your monitoring tools, but still cause the process to end, and AppSync to show the Error.

This middleware will catch any controlled error and handle them for you. Your Lambda function will succeed, but AppSync will return the error to the client.
Any error that extends `AppSyncError` (exported by this library) will be treated like such.

If you still want to monitor thse kind of errors, you can use either the [error-logger](https://github.com/middyjs/middy/tree/master/packages/error-logger) or the [input-output-logger](https://github.com/middyjs/middy/tree/master/packages/input-output-logger)

## Granular errors with BatchInvoke

When dealing with BatchInvoke, you might have errors that affect a few items of the batch only. This middleware follows the recommendations from the official [AppSync documentation](https://docs.aws.amazon.com/appsync/latest/devguide/tutorial-lambda-resolvers.html#returning-individual-errors).

By returning an `AppSyncError` as part of your batch, you can have granular control on which items are in error, and which are successful.

# Usage

## VTL response template

The middleware wraps the response of your handler function in a special object of the following shape:

```ts
{
  data: any, // successfull data or error data
  errorType: string,
  errorMessage: string,
  errorInfo: any,
}
```

A sucessful response from the handler will be placed in the `data` property, while any Error/Exception extending `AppSyncError` will be caught and its corresponding attributes will be placed in the `error*` properties.

Any other unhandled error still will be thrown by your Lambda.

You will need a special VTL response template that handles this response format accordingly.
With this library, you should use the following response template:

```velocity
#if($context.error)
  $util.error("Internal Error", "InternalError", $ctx.result)
#elseif($context.result && $context.result.errorMessage)
  $utils.error($context.result.errorMessage, $context.result.errorType, $context.result.data, $context.result.errorInfo)
#else
  $utils.toJson($context.result.data)
#end
```

- the first condition takes care of unhandled errors
- the second, controlled errors (like `NotFoundException`, `UnauthorizedException` or `AppSyncError`)
- the else, handles successful results.

## Handler usage

```js
const middy = require('@middy/core');
const { appSync } = require('middy-appsync');

const doStuff = (event, context, callback) => {
  return {
    field1: 'Foo',
    field2: 'Bar',
  };
};

const handler = middy(doStuff).use(appSync());

module.exports = { handler };
```

This example will return the following response to the VTL response mapping template:

```js
{
  data: {
    field1: 'Foo',
    field2: 'Bar',
  }
}
```

## Error handling

When a _controlled_ error occurs during the execution of your handler, you want to send basic information to the client. You can do so by filling the `message`, `type` and `info` fields.

You can acheive that with the an `AppSyncError` object in different ways:

### With the callback argument

There are 3 ways to generate an error:

- `throw` an `AppSyncError` error.
- return it as the `error` argument of the callback
- return it as the `response` argument of the callback

### With promises/async

- `throw` an `AppSyncError` error.
- return it as the rejected value
- return it as the resolved value

Example:

```js
const middy = require('@middy/core');
const { appSync, AppSyncError } = require('middy-appsync');

const doStuff = (event) => {
  throw new AppSyncError('Record not found', 'NotFoundError');
};

const handler = middy(doStuff).use(appSync());

module.exports = { handler };
```

This will generate the following response:

```js
{
  errorMessage: 'Resource not found',
  errorType: 'NotFoundError',
  data: null,
  errorInfo: null
}
```

And your GraphQL response will look like so:

```GraphQL
{
  "data": {
    "demo": null
  },
  "errors": [
    {
      "path": [
        "demo"
      ],
      "data": null,
      "errorType": "NotFound",
      "errorInfo": null,
      "locations": [
        {
          "line": 2,
          "column": 3,
          "sourceName": null
        }
      ],
      "message": "Resource not found"
    }
  ]
}
```

## BatchInvoke support

The middleware supports [Batching](https://docs.aws.amazon.com/appsync/latest/devguide/tutorial-lambda-resolvers.html#advanced-use-case-batching) resolvers. If it detects that
the `event` object is an array, it will expect an array as the `response` from the handler and
wrap each of its elements into a response object.

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

Just like for normal handlers, throwing an `AppSyncError` or returning it in the first argument of the callback will generate an error. It is worth mentioning that, by doing so, the error will be replicated to **all** elements of the batch (making the full batch invalid).

You can also have granular control over which elements of the batch are valid or have errors. To do so, you can return an `AppSyncError` for the invalid elements in your batch.

Example:

```js
const middy = require('@middy/core');
const { appSync, AppSyncError } = require('middy-appsync');

const doStuff = (event) => {
  return [
    new AppSyncError('Post not found', 'NotFound'), // first element is Invalid
    { title: 'Bizz', content: 'Bazz' }, // second element is valid
  ];
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

# Generic Exceptions

This library also comes with Exceptions classes for common use cases:

- `UnauthorizedException`
- `NotFoundException`

# Custom Exceptions

You can define your own custom Exceptions by extending the `AppSyncError` class.

```ts
export class MyException extends AppSyncError {
  constructor() {
    super('This is my error', 'MyException');
  }
}
```

# Caveats

AppSync currently does not implement the latest June2018 GraphQL specs for the [Errors](https://graphql.github.io/graphql-spec/June2018/#sec-Errors) entry.

This middleware sticks to AppSync's current implementation, using the `message`, `errorType`, `data` and `errorInfo`, entries.
There is an [open issue](https://github.com/aws/aws-appsync-community/issues/71) on AppSync for this.
