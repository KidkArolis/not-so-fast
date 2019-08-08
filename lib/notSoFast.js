/*
 * node-fast-ratelimit
 *
 * Copyright 2019, Karolis Narkevicius
 * Author: Karolis Narkevicius <hello@kn8.lt>
 */

/**
 * NotSoFast
 * @class
 * @classdesc  Instanciates a new rate-limiter
 * @param      {object} options
 */
const NotSoFast = function(options) {
  if (typeof options !== 'object') {
    throw new Error('Invalid or missing options')
  }
  if (typeof options.threshold !== 'number' || options.threshold < 0) {
    throw new Error('Invalid or missing options.threshold')
  }
  if (typeof options.ttl !== 'number' || options.ttl < 0) {
    throw new Error('Invalid or missing options.ttl')
  }

  this.__options = {
    threshold: options.threshold,
    ttlMillisec: options.ttl * 1000
  }

  this.__tokens = new Map()
}

/**
 * tokenCheck
 * @private
 * @param   {boolean}  consumeToken Whether to consume token or not
 * @returns {function} A configured token checking function
 */
function createTokenCheck(consumeToken) {
  return function tokenCheck(namespace) {
    // No namespace provided?
    if (!namespace) {
      // Do not rate-limit (1 token remaining each hop)
      return true
    }

    let tokenCount

    // Token bucket empty for namespace?
    if (this.__tokens.has(namespace) === false) {
      tokenCount = this.__options.threshold

      this.__scheduleExpireToken(namespace)
    } else {
      tokenCount = this.__tokens.get(namespace)
    }

    // Check remaining tokens in bucket
    if (tokenCount > 0) {
      if (consumeToken) {
        this.__tokens.set(namespace, tokenCount - 1)
      }

      return true
    }

    return false
  }
}

/**
 * NotSoFast.prototype.consumeSync
 * @public
 * @param  {string}  namespace
 * @return {boolean} Whether tokens remain in current timespan or not
 */
NotSoFast.prototype.consumeSync = createTokenCheck(true)

/**
 * NotSoFast.prototype.hasTokenSync
 * @public
 * @param  {string}  namespace
 * @return {boolean} Whether tokens remain in current timespan or not
 */

NotSoFast.prototype.hasTokenSync = createTokenCheck(false)

/**
 * NotSoFast.prototype.consume
 * @public
 * @param  {string} namespace
 * @return {object} Promise object
 */
NotSoFast.prototype.consume = function(namespace) {
  if (this.consumeSync(namespace) === true) {
    return Promise.resolve()
  }

  return Promise.reject(new Error('No tokens available'))
}

/**
 * NotSoFast.prototype.hasToken
 * @public
 * @param  {string} namespace
 * @return {object} Promise object
 */
NotSoFast.prototype.hasToken = function(namespace) {
  if (this.hasTokenSync(namespace) === true) {
    return Promise.resolve()
  }

  return Promise.reject(new Error('No tokens available'))
}

/**
 * NotSoFast.prototype.__scheduleExpireToken
 * @private
 * @param  {string} namespace
 * @return {undefined}
 */
NotSoFast.prototype.__scheduleExpireToken = function(namespace) {
  setTimeout(() => {
    // Expire token storage for namespace
    this.__tokens.delete(namespace)
  }, this.__options.ttlMilliseconds)
}

module.exports = NotSoFast
