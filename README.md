# not-so-fast

Fast and efficient in-memory rate-limit, used to alleviate most common DOS attacks.

Based on https://github.com/valeriansaliou/node-fast-ratelimit, but updated to work with modern Node versions. This module uses the ES `Map` instead of the native `hashtable` package.


## Usage

```
npm install --save @kidkarolis/not-so-fast
```

## How to use?

The `not-so-fast` API is pretty simple, here are some keywords used in the docs:

 * `ratelimiter`: ratelimiter instance, which plays the role of limits storage
 * `namespace`: the master ratelimit storage namespace (eg: set `namespace` to the user client IP, or user username)

You can create as many `ratelimiter` instances as you need in your application. This is great if you need to rate-limit IPs on specific zones (eg: for a chat application, you don't want the message send rate limit to affect the message composing notification rate limit).

Here's how to proceed (we take the example of rate-limiting messages sending in a chat app):

### 1. Create the rate-limiter

The rate-limiter can be instanciated as such:

```js
const RateLimiter = require("@kidkarolis/not-so-fast");

const messageLimiter = new RateLimiter({
  threshold : 20, // available tokens over timespan
  ttl       : 60  // time-to-live value of token bucket (in seconds)
});
```

This limiter will allow 20 messages to be sent every minute per namespace.
An user can send a maximum number of 20 messages in a 1 minute timespan, with a token counter reset every minute for a given namespace.

The reset scheduling is done per-namespace; eg: if namespace `user_1` sends 1 message at 11:00:32am, he will have 19 messages remaining from 11:00:32am to 11:01:32am. Hence, his limiter will reset at 11:01:32am, and won't scheduler any more reset until he consumes another token.

### 2. Check by consuming a token

On the message send portion of our application code, we would add a call to the ratelimiter instance.

#### 2.1. Consume token with asynchronous API (Promise catch/reject)

```javascript
// This would be dynamic in your application, based on user session data, or user IP
namespace = "user_1";

// Check if user is allowed to send message
messageLimiter.consume(namespace)
  .then(() => {
    // Consumed a token
    // Send message
    message.send();
  })
  .catch(() => {
    // No more token for namespace in current timespan
    // Silently discard message
  });
```

#### 2.2. Consume token with synchronous API (boolean test)

```javascript
// This would be dynamic in your application, based on user session data, or user IP
namespace = "user_1";

// Check if user is allowed to send message
if (messageLimiter.consumeSync(namespace) === true) {
  // Consumed a token
  // Send message
  message.send();
} else {
  // consumeSync returned false since there is no more tokens available
  // Silently discard message
}
```

### 3. Check without consuming a token

In some instances, like password brute forcing prevention, you may want to check without consuming a token and consume only when password validation fails.

#### 3.1. Check whether there are remaining tokens with asynchronous API (Promise catch/reject)

```javascript
limiter.hasToken(request.ip).then(() => {
  return authenticate(request.login, request.password)
})
  .then(
    () => {
      // User is authenticated
    },

    () => {
      // User is not authenticated
      // Consume a token and reject promise
      return limiter.consume(request.ip)
        .then(() => Promise.reject())
    }
  )
  .catch(() => {
    // Either invalid authentication or too many invalid login
    return response.unauthorized();
  })
```

#### 3.2. Check whether there are remaining tokens with synchronous API (boolean test)

```javascript
if (!limiter.hasTokensSync(request.ip)) {
  throw new Error("Too many invalid login");
}

const isAuthenticated = authenticateSync(request.login, request.password);

if (!isAuthenticated) {
  limiter.consumeSync(request.ip);

  throw new Error("Invalid login/password");
}
```
