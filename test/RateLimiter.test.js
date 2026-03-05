/*
 * @kidkarolis/not-so-fast
 *
 * Copyright 2019, Karolis Narkevicius
 * Author: Karolis Narkevicius <hello@kn8.lt>
 */

const test = require('ava')
const RateLimiter = require('../')

// constructor

test('should succeed creating a limiter with valid options', (t) => {
  t.notThrows(() => {
    return new RateLimiter({
      threshold: 5,
      ttl: 10,
    })
  })
})

test('should fail creating a limiter with missing threshold', (t) => {
  t.throws(() => {
    return new RateLimiter({
      ttl: 10,
    })
  })
})

test('should fail creating a limiter with invalid threshold', (t) => {
  t.throws(() => {
    return new RateLimiter({
      threshold: -1,
      ttl: 10,
    })
  })
})

test('should fail creating a limiter with missing ttl', (t) => {
  t.throws(() => {
    return new RateLimiter({
      threshold: 2,
    })
  })
})

test('should fail creating a limiter with invalid ttl', (t) => {
  t.throws(() => {
    return new RateLimiter({
      ttl: '120',
    })
  })
})

// consumeSync method

test('should not rate limit an empty namespace', (t) => {
  const limiter = new RateLimiter({
    threshold: 100,
    ttl: 10,
  })

  t.true(limiter.consumeSync(null))
  t.true(limiter.consumeSync(''))
  t.true(limiter.consumeSync(0))
})

test('should not rate limit a single namespace', (t) => {
  const options = {
    threshold: 100,
    ttl: 10,
  }

  const namespace = '127.0.0.1'
  const limiter = new RateLimiter(options)

  for (let i = 1; i <= options.threshold; i++) {
    t.true(limiter.consumeSync(namespace))
  }
})

test('should rate limit a single namespace', (t) => {
  const namespace = '127.0.0.1'

  const limiter = new RateLimiter({
    threshold: 3,
    ttl: 10,
  })

  t.true(limiter.consumeSync(namespace))
  t.true(limiter.consumeSync(namespace))
  t.true(limiter.consumeSync(namespace))
  t.false(limiter.consumeSync(namespace))
})

test('should not rate limit multiple namespaces', (t) => {
  const limiter = new RateLimiter({
    threshold: 2,
    ttl: 10,
  })

  t.true(limiter.consumeSync('user_1'))
  t.true(limiter.consumeSync('user_2'))
})

test('should rate limit multiple namespaces', (t) => {
  const limiter = new RateLimiter({
    threshold: 2,
    ttl: 10,
  })

  t.true(limiter.consumeSync('user_1'))
  t.true(limiter.consumeSync('user_2'))
  t.true(limiter.consumeSync('user_1'))
  t.true(limiter.consumeSync('user_2'))
  t.false(limiter.consumeSync('user_1'))
  t.false(limiter.consumeSync('user_2'))
})

test('should expire token according to TTL', async (t) => {
  const options = {
    threshold: 2,
    ttl: 1,
  }

  const namespace = '127.0.0.1'
  const limiter = new RateLimiter(options)

  t.true(limiter.consumeSync(namespace))
  t.true(limiter.consumeSync(namespace))
  t.false(limiter.consumeSync(namespace))

  await new Promise((resolve) => setTimeout(resolve, options.ttl * 1000 + 100))

  t.true(limiter.consumeSync(namespace))
})

test('should not block writing random namespaces', (t) => {
  const limiter = new RateLimiter({
    threshold: 100,
    ttl: 60,
  })

  const asyncFlowSteps = 10000
  const asyncFlowTotal = 4

  for (let id = 1; id <= asyncFlowTotal; id++) {
    for (let i = 0; i < asyncFlowSteps; i++) {
      t.true(limiter.consumeSync('flow-' + id + '-' + i))
    }
  }
})

// hasTokenSync method

test('hasTokenSync should not consume token', (t) => {
  const limiter = new RateLimiter({
    threshold: 1,
    ttl: 10,
  })
  const namespace = '127.0.0.1'

  t.true(limiter.hasTokenSync(namespace))
  t.true(limiter.hasTokenSync(namespace))
})

test('hasTokenSync should rate limit', (t) => {
  const limiter = new RateLimiter({
    threshold: 1,
    ttl: 10,
  })
  const namespace = '127.0.0.1'

  t.true(limiter.hasTokenSync(namespace))
  t.true(limiter.consumeSync(namespace))
  t.false(limiter.hasTokenSync(namespace))
})

// hasToken method

test('hasToken should not consume token', async (t) => {
  const limiter = new RateLimiter({
    threshold: 1,
    ttl: 10,
  })
  const namespace = '127.0.0.1'

  await limiter.hasToken(namespace)
  await limiter.hasToken(namespace)
  t.pass()
})

test('hasToken should rate limit', async (t) => {
  const limiter = new RateLimiter({
    threshold: 1,
    ttl: 10,
  })
  const namespace = '127.0.0.1'

  await limiter.hasToken(namespace)
  await limiter.consume(namespace)
  await t.throwsAsync(() => limiter.hasToken(namespace), {
    message: 'No tokens available',
  })
})

// consume method

test('consume should not rate limit', async (t) => {
  const options = {
    threshold: 100,
    ttl: 10,
  }

  const namespace = '127.0.0.1'
  const limiter = new RateLimiter(options)

  const allPromises = []

  for (let i = 1; i <= options.threshold; i++) {
    allPromises.push(limiter.consume(namespace))
  }

  await Promise.all(allPromises)
  t.pass()
})

test('consume should rate limit', async (t) => {
  const options = {
    threshold: 100,
    ttl: 10,
  }

  const namespace = '127.0.0.1'
  const limiter = new RateLimiter(options)

  const allPromises = []

  for (let i = 1; i <= options.threshold + 5; i++) {
    allPromises.push(limiter.consume(namespace))
  }

  await t.throwsAsync(() => Promise.all(allPromises), {
    message: 'No tokens available',
  })
})
