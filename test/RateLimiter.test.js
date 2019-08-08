/*
 * @kidkarolis/not-so-fast
 *
 * Copyright 2019, Karolis Narkevicius
 * Author: Karolis Narkevicius <hello@kn8.lt>
 */

const RateLimiter = require('../')
const assert = require('assert')

describe('node-fast-ratelimit', function() {
  describe('constructor', function() {
    it('should succeed creating a limiter with valid options', function() {
      assert.doesNotThrow(
        function() {
          return new RateLimiter({
            threshold: 5,
            ttl: 10
          })
        },

        'RateLimiter should not throw on valid options'
      )
    })

    it('should fail creating a limiter with missing threshold', function() {
      assert.throws(
        function() {
          return new RateLimiter({
            ttl: 10
          })
        },

        'RateLimiter should throw on missing threshold'
      )
    })

    it('should fail creating a limiter with invalid threshold', function() {
      assert.throws(
        function() {
          return new RateLimiter({
            threshold: -1,
            ttl: 10
          })
        },

        'RateLimiter should throw on invalid threshold'
      )
    })

    it('should fail creating a limiter with missing ttl', function() {
      assert.throws(
        function() {
          return new RateLimiter({
            threshold: 2
          })
        },

        'RateLimiter should throw on missing ttl'
      )
    })

    it('should fail creating a limiter with invalid ttl', function() {
      assert.throws(
        function() {
          return new RateLimiter({
            ttl: '120'
          })
        },

        'RateLimiter should throw on invalid ttl'
      )
    })
  })

  describe('consumeSync method', function() {
    it('should not rate limit an empty namespace', function() {
      const limiter = new RateLimiter({
        threshold: 100,
        ttl: 10
      })

      assert.ok(limiter.consumeSync(null), 'Limiter consume should succeed for `null` (null) namespace (resolve)')

      assert.ok(limiter.consumeSync(''), 'Limiter consume should succeed for `` (blank) namespace (resolve)')

      assert.ok(limiter.consumeSync(0), 'Limiter consume should succeed for `0` (number) namespace (resolve)')
    })

    it('should not rate limit a single namespace', function() {
      const options = {
        threshold: 100,
        ttl: 10
      }

      const namespace = '127.0.0.1'
      const limiter = new RateLimiter(options)

      for (let i = 1; i <= options.threshold; i++) {
        assert.ok(limiter.consumeSync(namespace), 'Limiter consume should succeed')
      }
    })

    it('should rate limit a single namespace', function() {
      const namespace = '127.0.0.1'

      const limiter = new RateLimiter({
        threshold: 3,
        ttl: 10
      })

      assert.ok(limiter.consumeSync(namespace), 'Limiter consume succeed at consume #1 (resolve)')

      assert.ok(limiter.consumeSync(namespace), 'Limiter consume succeed at consume #2 (resolve)')

      assert.ok(limiter.consumeSync(namespace), 'Limiter consume succeed at consume #3 (resolve)')

      assert.ok(!limiter.consumeSync(namespace), 'Limiter consume fail at consume #4 (reject)')
    })

    it('should not rate limit multiple namespaces', function() {
      const limiter = new RateLimiter({
        threshold: 2,
        ttl: 10
      })

      assert.ok(limiter.consumeSync('user_1'), 'Limiter consume should succeed at consume #1 of user_1 (resolve)')

      assert.ok(limiter.consumeSync('user_2'), 'Limiter consume should succeed at consume #1 of user_2 (resolve)')
    })

    it('should rate limit multiple namespaces', function() {
      const limiter = new RateLimiter({
        threshold: 2,
        ttl: 10
      })

      assert.ok(limiter.consumeSync('user_1'), 'Limiter consume should succeed at consume #1 of user_1 (resolve)')

      assert.ok(limiter.consumeSync('user_2'), 'Limiter consume should succeed at consume #1 of user_2 (resolve)')

      assert.ok(limiter.consumeSync('user_1'), 'Limiter consume should succeed at consume #2 of user_1 (resolve)')

      assert.ok(limiter.consumeSync('user_2'), 'Limiter consume should succeed at consume #2 of user_2 (resolve)')

      assert.ok(!limiter.consumeSync('user_1'), 'Limiter consume should fail at consume #3 of user_1 (reject)')

      assert.ok(!limiter.consumeSync('user_2'), 'Limiter consume should fail at consume #3 of user_2 (reject)')
    })

    it('should expire token according to TTL', function(done) {
      // Do not consider timeout as slow
      this.slow(5000)

      const options = {
        threshold: 2,
        ttl: 1
      }

      const namespace = '127.0.0.1'
      const limiter = new RateLimiter(options)

      assert.ok(limiter.consumeSync(namespace), 'Limiter consume should succeed at consume #1 (resolve)')

      assert.ok(limiter.consumeSync(namespace), 'Limiter consume should succeed at consume #2 (resolve)')

      assert.ok(!limiter.consumeSync(namespace), 'Limiter consume should fail at consume #3 (reject)')

      // Wait for TTL reset.
      setTimeout(function() {
        assert.ok(limiter.consumeSync(namespace), 'Limiter consume should succeed at consume #4 (resolve)')

        done()
      }, options.ttl * 1000 + 100)
    })

    it('should not block writing random namespaces', function(done) {
      // Timeout if longer than 2 seconds (check for blocking writes)
      this.timeout(2000)

      const limiter = new RateLimiter({
        threshold: 100,
        ttl: 60
      })

      const asyncFlowSteps = 10000
      const asyncFlowTotal = 4
      let asyncFlowCountDone = 0

      const launchAsyncFlow = function(id) {
        setTimeout(function() {
          for (let i = 0; i < asyncFlowSteps; i++) {
            assert.ok(
              limiter.consumeSync('flow-' + id + '-' + i),
              'Limiter consume should succeed at flow #' + id + ' (resolve)'
            )
          }

          if (++asyncFlowCountDone === asyncFlowTotal) {
            done()
          }
        })
      }

      // Launch asynchronous flows
      for (let i = 1; i <= asyncFlowTotal; i++) {
        launchAsyncFlow(i)
      }
    })
  })

  describe('hasTokenSync method', function() {
    it('should not consume token', function() {
      const limiter = new RateLimiter({
        threshold: 1,
        ttl: 10
      })
      const namespace = '127.0.0.1'

      assert.ok(limiter.hasTokenSync(namespace), 'Limiter hasTokenSync should succeed at hasTokenSync #1')
      assert.ok(limiter.hasTokenSync(namespace), 'Limiter hasTokenSync should succeed at hasTokenSync #2')
    })

    it('should rate limit', function() {
      const limiter = new RateLimiter({
        threshold: 1,
        ttl: 10
      })
      const namespace = '127.0.0.1'

      assert.ok(limiter.hasTokenSync(namespace), 'Limiter hasTokenSync should succeed at hasTokenSync #1')
      assert.ok(limiter.consumeSync(namespace), 'Limiter consumeSync should succeed at consumeSync #1')
      assert.ok(!limiter.hasTokenSync(namespace), 'Limiter hasTokenSync should fail at hasTokenSync #2')
    })
  })

  describe('hasToken method', function() {
    it('should not consume token', function(done) {
      const limiter = new RateLimiter({
        threshold: 1,
        ttl: 10
      })
      const namespace = '127.0.0.1'
      const allPromises = []

      allPromises.push(limiter.hasToken(namespace))
      allPromises.push(limiter.hasToken(namespace))

      Promise.all(allPromises)
        .then(function() {
          done()
        })
        .catch(function(error) {
          if (error.message !== 'No tokens available') {
            done(error)
          } else {
            done(new Error('Limiter hasToken should not fail at the end (reject)'))
          }
        })
    })

    it('should rate limit', function(done) {
      const limiter = new RateLimiter({
        threshold: 1,
        ttl: 10
      })
      const namespace = '127.0.0.1'
      const allPromises = []

      allPromises.push(limiter.hasToken(namespace))
      allPromises.push(limiter.consume(namespace))
      allPromises.push(limiter.hasToken(namespace))

      Promise.all(allPromises)
        .then(function() {
          done(new Error('Limiter hasToken should not succeed at the end (reject)'))
        })
        .catch(function(error) {
          if (error.message !== 'No tokens available') {
            done(error)
          } else {
            done()
          }
        })
    })
  })

  describe('consume method', function() {
    it('should not rate limit', function(done) {
      const options = {
        threshold: 100,
        ttl: 10
      }

      const namespace = '127.0.0.1'
      const limiter = new RateLimiter(options)

      const allPromises = []

      for (let i = 1; i <= options.threshold; i++) {
        allPromises.push(limiter.consume(namespace))
      }

      Promise.all(allPromises)
        .then(function() {
          done()
        })
        .catch(function(error) {
          if (error.message !== 'No tokens available') {
            done(error)
          } else {
            done(new Error('Limiter consume should not fail at the end (reject)'))
          }
        })
    })

    it('should rate limit', function(done) {
      const options = {
        threshold: 100,
        ttl: 10
      }

      const namespace = '127.0.0.1'
      const limiter = new RateLimiter(options)

      const allPromises = []

      for (let i = 1; i <= options.threshold + 5; i++) {
        allPromises.push(limiter.consume(namespace))
      }

      Promise.all(allPromises)
        .then(function() {
          done(new Error('Limiter consume should not succeed at the end (reject)'))
        })
        .catch(function(error) {
          if (error.message !== 'No tokens available') {
            done(error)
          } else {
            done()
          }
        })
    })
  })
})
