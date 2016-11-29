// modules are defined as an array
// [ module function, map of requireuires ]
//
// map of requireuires is short require name -> numeric require
//
// anything defined in a previous bundle is accessed via the
// orig method which is the requireuire for previous bundles

(function outer (modules, cache, entry) {
    // Save the require from previous bundle to this closure if any
    var previousRequire = typeof require == "function" && require;

    function findProxyquireifyName() {
        var deps = Object.keys(modules)
            .map(function (k) { return modules[k][1]; });

        for (var i = 0; i < deps.length; i++) {
            var pq = deps[i]['proxyquireify'];
            if (pq) return pq;
        }
    }

    var proxyquireifyName = findProxyquireifyName();

    function newRequire(name, jumped){
        // Find the proxyquireify module, if present
        var pqify = (proxyquireifyName != null) && cache[proxyquireifyName];

        // Proxyquireify provides a separate cache that is used when inside
        // a proxyquire call, and is set to null outside a proxyquire call.
        // This allows the regular caching semantics to work correctly both
        // inside and outside proxyquire calls while keeping the cached
        // modules isolated.
        // When switching from one proxyquire call to another, it clears
        // the cache to prevent contamination between different sets
        // of stubs.
        var currentCache = (pqify && pqify.exports._cache) || cache;

        if(!currentCache[name]) {
            if(!modules[name]) {
                // if we cannot find the the module within our internal map or
                // cache jump to the current global require ie. the last bundle
                // that was added to the page.
                var currentRequire = typeof require == "function" && require;
                if (!jumped && currentRequire) return currentRequire(name, true);

                // If there are other bundles on this page the require from the
                // previous one is saved to 'previousRequire'. Repeat this as
                // many times as there are bundles until the module is found or
                // we exhaust the require chain.
                if (previousRequire) return previousRequire(name, true);
                var err = new Error('Cannot find module \'' + name + '\'');
                err.code = 'MODULE_NOT_FOUND';
                throw err;
            }
            var m = currentCache[name] = {exports:{}};

            // The normal browserify require function
            var req = function(x){
                var id = modules[name][1][x];
                return newRequire(id ? id : x);
            };

            // The require function substituted for proxyquireify
            var moduleRequire = function(x){
                var pqify = (proxyquireifyName != null) && cache[proxyquireifyName];
                // Only try to use the proxyquireify version if it has been `require`d
                if (pqify && pqify.exports._proxy) {
                    return pqify.exports._proxy(req, x);
                } else {
                    return req(x);
                }
            };

            modules[name][0].call(m.exports,moduleRequire,m,m.exports,outer,modules,currentCache,entry);
        }
        return currentCache[name].exports;
    }
    for(var i=0;i<entry.length;i++) newRequire(entry[i]);

    // Override the current require with this new one
    return newRequire;
})
({1:[function(require,module,exports){
'use strict'

var mergeDescriptors = require('merge-descriptors')
var isObject = require('is-object')
var hasOwnProperty = Object.prototype.hasOwnProperty

function fill (destination, source, merge) {
  if (destination && (isObject(source) || isFunction(source))) {
    merge(destination, source, false)
    if (isFunction(destination) && isFunction(source) && source.prototype) {
      merge(destination.prototype, source.prototype, false)
    }
  }
  return destination
}

exports = module.exports = function fillKeys (destination, source) {
  return fill(destination, source, mergeDescriptors)
}

exports.es3 = function fillKeysEs3 (destination, source) {
  return fill(destination, source, es3Merge)
}

function es3Merge (destination, source) {
  for (var key in source) {
    if (!hasOwnProperty.call(destination, key)) {
      destination[key] = source[key]
    }
  }
  return destination
}

function isFunction (value) {
  return typeof value === 'function'
}

},{"is-object":2,"merge-descriptors":3}],2:[function(require,module,exports){
"use strict";

module.exports = function isObject(x) {
	return typeof x === "object" && x !== null;
};

},{}],3:[function(require,module,exports){
/*!
 * merge-descriptors
 * Copyright(c) 2014 Jonathan Ong
 * Copyright(c) 2015 Douglas Christopher Wilson
 * MIT Licensed
 */

'use strict'

/**
 * Module exports.
 * @public
 */

module.exports = merge

/**
 * Module variables.
 * @private
 */

var hasOwnProperty = Object.prototype.hasOwnProperty

/**
 * Merge the property descriptors of `src` into `dest`
 *
 * @param {object} dest Object to add descriptors to
 * @param {object} src Object to clone descriptors from
 * @param {boolean} [redefine=true] Redefine `dest` properties with `src` properties
 * @returns {object} Reference to dest
 * @public
 */

function merge(dest, src, redefine) {
  if (!dest) {
    throw new TypeError('argument dest is required')
  }

  if (!src) {
    throw new TypeError('argument src is required')
  }

  if (redefine === undefined) {
    // Default to true
    redefine = true
  }

  Object.getOwnPropertyNames(src).forEach(function forEachOwnPropertyName(name) {
    if (!redefine && hasOwnProperty.call(dest, name)) {
      // Skip desriptor
      return
    }

    // Copy descriptor
    var descriptor = Object.getOwnPropertyDescriptor(src, name)
    Object.defineProperty(dest, name, descriptor)
  })

  return dest
}

},{}],4:[function(require,module,exports){
'use strict'

module.exports = function createNotFoundError (path) {
  var err = new Error('Cannot find module \'' + path + '\'')
  err.code = 'MODULE_NOT_FOUND'
  return err
}

},{}],5:[function(require,module,exports){
'use strict';

var fillMissingKeys = require('fill-keys');
var moduleNotFoundError = require('module-not-found-error');

function ProxyquireifyError(msg) {
  this.name = 'ProxyquireifyError';
  Error.captureStackTrace(this, ProxyquireifyError);
  this.message = msg || 'An error occurred inside proxyquireify.';
}

function validateArguments(request, stubs) {
  var msg = (function getMessage() {
    if (!request)
      return 'Missing argument: "request". Need it to resolve desired module.';

    if (!stubs)
      return 'Missing argument: "stubs". If no stubbing is needed, use regular require instead.';

    if (typeof request != 'string')
      return 'Invalid argument: "request". Needs to be a requirable string that is the module to load.';

    if (typeof stubs != 'object')
      return 'Invalid argument: "stubs". Needs to be an object containing overrides e.g., {"path": { extname: function () { ... } } }.';
  })();

  if (msg) throw new ProxyquireifyError(msg);
}

var stubs;

function stub(stubs_) {
  stubs = stubs_;
  // This cache is used by the prelude as an alternative to the regular cache.
  // It is not read or written here, except to set it to an empty object when
  // adding stubs and to reset it to null when clearing stubs.
  module.exports._cache = {};
}

function reset() {
  stubs = undefined;
  module.exports._cache = null;
}

var proxyquire = module.exports = function (require_) {
  if (typeof require_ != 'function')
    throw new ProxyquireifyError(
        'It seems like you didn\'t initialize proxyquireify with the require in your test.\n'
      + 'Make sure to correct this, i.e.: "var proxyquire = require(\'proxyquireify\')(require);"'
    );

  reset();

  return function(request, stubs) {

    validateArguments(request, stubs);

    // set the stubs and require dependency
    // when stub require is invoked by the module under test it will find the stubs here
    stub(stubs);
    var dep = require_(request);
    reset();

    return dep;
  };
};

// Start with the default cache
proxyquire._cache = null;

proxyquire._proxy = function (require_, request) {
  function original() {
    return require_(request);
  }

  if (!stubs || !stubs.hasOwnProperty(request)) return original();

  var stub = stubs[request];

  if (stub === null) throw moduleNotFoundError(request)

  var stubWideNoCallThru = Boolean(stubs['@noCallThru']) && (stub == null || stub['@noCallThru'] !== false);
  var noCallThru = stubWideNoCallThru || (stub != null && Boolean(stub['@noCallThru']));
  return noCallThru ? stub : fillMissingKeys(stub, original());
};

if (require.cache) {
  // only used during build, so prevent browserify from including it
  var replacePreludePath = './lib/replace-prelude';
  var replacePrelude = require(replacePreludePath);
  proxyquire.browserify = replacePrelude.browserify;
  proxyquire.plugin = replacePrelude.plugin;
}

},{"fill-keys":1,"module-not-found-error":4}],6:[function(require,module,exports){
/* proxyquireify injected requires to make browserify include dependencies in the bundle */ /* istanbul ignore next */; (function __makeBrowserifyIncludeModule__() { require('../src/index.ts');});"use strict";
;
var Promise = require("bluebird");
(function () {
    'use strict';
    var proxyquire = require('proxyquireify')(require);
    var getService;
    var cache;
    var getLiveKey;
    var getProxyKey;
    var openpgp;
    var livekey;
    var types;
    beforeEach(function () {
        cache = jasmine.createSpyObj('cache', ['set', 'del', 'get', 'has']);
        getLiveKey = jasmine.createSpy('getLiveKey');
        getProxyKey = jasmine.createSpy('getProxyKey');
        openpgp = {
            config: {},
            crypto: { hash: jasmine.createSpyObj('hash', ['sha256']) },
            key: jasmine.createSpyObj('key', ['readArmored', 'generateKey']),
            message: jasmine.createSpyObj('message', ['fromText', 'readArmored']),
            encrypt: jasmine.createSpy('encrypt'),
            decrypt: jasmine.createSpy('decrypt')
        };
        livekey = {
            key: {},
            bp: { keys: [{ id: 'key-id' }], user: { ids: [] } },
            armor: jasmine.createSpy('armor'),
            lock: jasmine.createSpy('lock'),
            unlock: jasmine.createSpy('unlock')
        };
    });
    beforeEach(function () {
        getService = proxyquire('../src/index.ts', {
            'openpgp': openpgp,
            '@noCallThru': true
        }).default;
    });
    describe('default export: getOpgpService (config?: OpgpServiceFactoryConfig): ' +
        'OpgpService', function () {
        var opgpService;
        beforeEach(function () {
            opgpService = jasmine.objectContaining({
                configure: jasmine.any(Function),
                generateKey: jasmine.any(Function),
                getKeysFromArmor: jasmine.any(Function),
                getArmorFromKey: jasmine.any(Function),
                encrypt: jasmine.any(Function),
                decrypt: jasmine.any(Function),
                sign: jasmine.any(Function),
                verify: jasmine.any(Function)
            });
        });
        describe('when called without arguments', function () {
            var service;
            beforeEach(function () {
                debugger;
                service = getService();
            });
            it('returns an {OpgpService} instance', function () {
                expect(service).toEqual(opgpService);
            });
        });
        describe('when called with { cache?: CsrKeyCache<OpgpLiveKey>, ' +
            'getLiveKey?: LiveKeyFactory, getProxyKey?: ProxyKeyFactory, ' +
            'openpgp?: openpgp }', function () {
            var service;
            beforeEach(function () {
                openpgp.key.readArmored.and.returnValue({ keys: [livekey.key] });
                getLiveKey.and.returnValue(livekey);
                cache.set.and.returnValue('key-handle');
            });
            beforeEach(function () {
                service = getService({
                    cache: cache,
                    getLiveKey: getLiveKey,
                    getProxyKey: getProxyKey,
                    openpgp: openpgp
                });
                service.getKeysFromArmor('key-armor');
            });
            it('returns an {OpgpService} instance based on the given dependencies ', function () {
                expect(service).toEqual(opgpService);
                expect(openpgp.key.readArmored).toHaveBeenCalledWith('key-armor');
                expect(getLiveKey).toHaveBeenCalledWith(livekey.key);
                expect(cache.set).toHaveBeenCalledWith(livekey);
                expect(getProxyKey).toHaveBeenCalledWith('key-handle', livekey.bp);
            });
        });
        describe('when called with { openpgp?: config } ' +
            'where config is a valid configuration object for `openpgp.config`', function () {
            beforeEach(function () {
                openpgp.config = {};
            });
            beforeEach(function () {
                getService({
                    openpgp: { debug: true }
                });
            });
            it('returns an {OpgpService} instance based on an openpgp instance ' +
                'with the given configuration', function () {
                expect(openpgp.config).toEqual(jasmine.objectContaining({ debug: true }));
            });
        });
    });
    describe('OpgpService', function () {
        var service;
        beforeEach(function () {
            service = getService({
                cache: cache,
                getLiveKey: getLiveKey,
                openpgp: openpgp
            });
        });
        describe('configure (config?: OpenpgpConfig): Promise<OpenpgpConfig>', function () {
            var error;
            var result;
            beforeEach(function () {
                openpgp.config = {
                    debug: false,
                    use_native: false
                };
            });
            describe('when called without config argument', function () {
                beforeEach(function (done) {
                    service.configure()
                        .then(function (res) { return result = res; })
                        .catch(function (err) { return error = err; })
                        .finally(function () { return setTimeout(done); });
                });
                it('returns a Promise that resolves to the current openpgp configuration', function () {
                    expect(error).not.toBeDefined();
                    expect(result).toEqual(openpgp.config);
                });
            });
            describe('when called with an openpgp configuration object', function () {
                var config;
                beforeEach(function () {
                    config = {
                        compression: 42,
                        debug: true,
                        versionstring: 'test-version',
                        use_native: 'true',
                        foo: 'foo'
                    };
                });
                beforeEach(function (done) {
                    service.configure(config)
                        .then(function (res) { return result = res; })
                        .catch(function (err) { return error = err; })
                        .finally(function () { return setTimeout(done); });
                });
                it('returns a Promise that resolves to the current openpgp configuration', function () {
                    expect(error).not.toBeDefined();
                    expect(result).toEqual({
                        compression: 42,
                        debug: true,
                        use_native: false,
                        versionstring: 'test-version'
                    });
                });
            });
        });
        describe('generateKey (passphrase: string, opts?: OpgpKeyOpts)' +
            ': Promise<OpgpProxyKey>', function () {
            it('delegates to the openpgp primitive', function (done) {
                service.generateKey('secret passphrase')
                    .catch(function () { })
                    .finally(function () {
                    expect(openpgp.key.generateKey).toHaveBeenCalledWith(jasmine.objectContaining({
                        passphrase: 'secret passphrase',
                        numBits: 4096
                    }));
                    setTimeout(done);
                });
            });
            describe('when the underlying openpgp primitive returns a newly generated key', function () {
                var error;
                var result;
                beforeEach(function () {
                    openpgp.key.generateKey.and.returnValue(Promise.resolve(livekey.key));
                    getLiveKey.and.returnValue(livekey);
                    cache.set.and.returnValue('key-handle');
                });
                beforeEach(function (done) {
                    service.generateKey('secret passphrase')
                        .then(function (res) { return result = res; })
                        .catch(function (err) { return error = err; })
                        .finally(function () { return setTimeout(done); });
                });
                it('creates a new {OpgpLiveKey} instance from the new openpgp key', function () {
                    expect(getLiveKey).toHaveBeenCalledWith(livekey.key);
                });
                it('stores the new {OpgpLiveKey} instance in the underlying cache', function () {
                    expect(cache.set).toHaveBeenCalledWith(livekey);
                });
                it('returns a Promise that resolves to the new {OpgpProxyKey} instance', function () {
                    expect(result).toEqual(jasmine.objectContaining({ handle: 'key-handle' }));
                    expect(result).toEqual(jasmine.objectContaining(livekey.bp));
                    expect(error).not.toBeDefined();
                });
            });
            describe('when the underlying openpgp primitive throws an error', function () {
                var error;
                var result;
                beforeEach(function () {
                    openpgp.key.generateKey.and.throwError('boom');
                });
                beforeEach(function (done) {
                    service.generateKey('secret passphrase')
                        .then(function (res) { return result = res; })
                        .catch(function (err) { return error = err; })
                        .finally(function () { return setTimeout(done); });
                });
                it('returns a Promise that resolves to an {OpgpProxyKey} instance', function () {
                    expect(error).toBeDefined();
                    expect(error.message).toBe('boom');
                    expect(result).not.toBeDefined();
                });
            });
            describe('OgpgKeyOpts', function () {
            });
        });
        describe('getKeysFromArmor (armor: string, opts?: OpgpKeyringOpts)' +
            ': Promise<OpgpProxyKey[]|OpgpProxyKey>', function () {
            it('delegates to the openpgp primitive', function (done) {
                service.getKeysFromArmor('key-armor')
                    .catch(function () { })
                    .finally(function () {
                    expect(openpgp.key.readArmored).toHaveBeenCalledWith('key-armor');
                    setTimeout(done);
                });
            });
            describe('when the underlying openpgp primitive returns a single key', function () {
                var error;
                var result;
                beforeEach(function () {
                    openpgp.key.readArmored.and.returnValue({ keys: [livekey.key] });
                    getLiveKey.and.returnValue(livekey);
                    cache.set.and.returnValue('key-handle');
                });
                beforeEach(function (done) {
                    service.getKeysFromArmor('key-armor')
                        .then(function (res) { return result = res; })
                        .catch(function (err) { return error = err; })
                        .finally(function () { return setTimeout(done); });
                });
                it('creates a new {OpgpLiveKey} instance from the openpgp key', function () {
                    expect(getLiveKey).toHaveBeenCalledWith(livekey.key);
                });
                it('stores the new {OpgpLiveKey} instance in the underlying cache', function () {
                    expect(cache.set).toHaveBeenCalledWith(livekey);
                });
                it('returns a Promise that resolves to a corresponding {OpgpProxyKey} instance', function () {
                    expect(result).toEqual(jasmine.objectContaining({ handle: 'key-handle' }));
                    expect(result).toEqual(jasmine.objectContaining(livekey.bp));
                    expect(error).not.toBeDefined();
                });
            });
            describe('when the underlying openpgp primitive returns multiple keys', function () {
                var error;
                var result;
                beforeEach(function () {
                    openpgp.key.readArmored.and.returnValue({ keys: [livekey.key, livekey.key] });
                    getLiveKey.and.returnValue(livekey);
                    cache.set.and.returnValue('key-handle');
                });
                beforeEach(function (done) {
                    service.getKeysFromArmor('keys-armor')
                        .then(function (res) { return result = res; })
                        .catch(function (err) { return error = err; })
                        .finally(function () { return setTimeout(done); });
                });
                it('creates new {OpgpLiveKey} instances from each openpgp key', function () {
                    expect(getLiveKey.calls.allArgs())
                        .toEqual([[livekey.key], [livekey.key]]);
                });
                it('stores the new {OpgpLiveKey} instances in the underlying cache', function () {
                    expect(cache.set.calls.allArgs()).toEqual([[livekey], [livekey]]);
                });
                it('returns a Promise that resolves to corresponding {OpgpProxyKey} instances', function () {
                    expect(result).toEqual(jasmine.any(Array));
                    expect(result.length).toBe(2);
                    result.forEach(function (res) {
                        expect(res).toEqual(jasmine.objectContaining({ handle: 'key-handle' }));
                        expect(res).toEqual(jasmine.objectContaining(livekey.bp));
                    });
                    expect(error).not.toBeDefined();
                });
            });
            describe('when the underlying openpgp primitive throws an error', function () {
                var error;
                var result;
                beforeEach(function () {
                    openpgp.key.readArmored.and.throwError('boom');
                });
                beforeEach(function (done) {
                    service.getKeysFromArmor('key-armor')
                        .then(function (res) { return result = res; })
                        .catch(function (err) { return error = err; })
                        .finally(function () { return setTimeout(done); });
                });
                it('returns a Promise that rejects with the thrown error', function () {
                    expect(error).toBeDefined();
                    expect(error.message).toBe('boom');
                    expect(result).not.toBeDefined();
                });
            });
        });
        describe('getArmorFromKey (keyRef: KeyRef): Promise<string>', function () {
            describe('when given a valid key handle string', function () {
                var error;
                var result;
                beforeEach(function () {
                    cache.get.and.returnValue(livekey);
                    livekey.armor.and.returnValue('armor');
                });
                beforeEach(function (done) {
                    service.getArmorFromKey('valid-key-handle')
                        .then(function (res) { return result = res; })
                        .catch(function (err) { return error = err; })
                        .finally(function () { return setTimeout(done); });
                });
                it('retrieves the {OpgpLiveKey} instance referenced by the given handle', function () {
                    expect(cache.get).toHaveBeenCalledWith('valid-key-handle');
                });
                it('delegates to the retrieved {OpgpLiveKey} instance', function () {
                    expect(livekey.armor).toHaveBeenCalledWith();
                });
                it('returns a Promise that resolves to an armored {string} representation ' +
                    'of the referenced {OpgpLiveKey} instance', function () {
                    expect(result).toEqual('armor');
                    expect(error).not.toBeDefined();
                });
            });
            describe('when given a stale or invalid handle', function () {
                var error;
                var result;
                beforeEach(function () {
                    cache.get.and.returnValue(undefined);
                });
                beforeEach(function (done) {
                    service.getArmorFromKey('stale-key-handle')
                        .then(function (res) { return result = res; })
                        .catch(function (err) { return error = err; })
                        .finally(function () { return setTimeout(done); });
                });
                it('attempts to retrieve the {OpgpLiveKey} instance ' +
                    'referenced by the given handle', function () {
                    expect(cache.get).toHaveBeenCalledWith('stale-key-handle');
                });
                it('returns a Promise that rejects ' +
                    'with an `invalid key reference: not a string or stale` {Error}', function () {
                    expect(result).not.toBeDefined();
                    expect(error).toEqual(jasmine.any(Error));
                    expect(error.message).toBe('invalid key reference: not a string or stale');
                });
            });
            describe('when the {OpgpLiveKey#armor} method rejects with an {Error}', function () {
                var error;
                var result;
                beforeEach(function () {
                    cache.get.and.returnValue(livekey);
                    livekey.armor.and.returnValue(Promise.reject(new Error('boom')));
                });
                beforeEach(function (done) {
                    service.getArmorFromKey('valid-key-handle')
                        .then(function (res) { return result = res; })
                        .catch(function (err) { return error = err; })
                        .finally(function () { return setTimeout(done); });
                });
                it('retrieves the {OpgpLiveKey} instance referenced by the given handle', function () {
                    expect(cache.get).toHaveBeenCalledWith('valid-key-handle');
                });
                it('delegates to the retrieved {OpgpLiveKey} instance', function () {
                    expect(livekey.armor).toHaveBeenCalledWith();
                });
                it('returns a Promise that rejects with the {Error} ' +
                    'from the {OpgpLiveKey#armor} method', function () {
                    expect(result).not.toBeDefined();
                    expect(error).toEqual(jasmine.any(Error));
                    expect(error.message).toBe('boom');
                });
            });
        });
        describe('unlock (keyRef: KeyRef, passphrase: string, opts?: UnlockOpts)' +
            ': Promise<OpgpProxyKey>', function () {
            describe('when given a valid handle string of a locked key ' +
                'and the correct passphrase', function () {
                var unlockedLiveKey;
                var error;
                var result;
                beforeEach(function () {
                    livekey.bp.isLocked = true;
                    unlockedLiveKey = {
                        key: {},
                        bp: { isLocked: false, keys: [{ id: 'key-id' }], user: { ids: [] } }
                    };
                    cache.get.and.returnValue(livekey);
                    livekey.unlock.and.returnValue(Promise.resolve(unlockedLiveKey));
                    cache.set.and.returnValue('unlocked-key-handle');
                });
                beforeEach(function (done) {
                    service.unlock('valid-key-handle', 'secret passphrase')
                        .then(function (res) { return result = res; })
                        .catch(function (err) { return error = err; })
                        .finally(function () { return setTimeout(done); });
                });
                it('retrieves the {OpgpLiveKey} instance referenced by the given handle', function () {
                    expect(cache.get).toHaveBeenCalledWith('valid-key-handle');
                });
                it('delegates to the retrieved {OpgpLiveKey} instance', function () {
                    expect(livekey.unlock).toHaveBeenCalledWith('secret passphrase');
                });
                it('stores the unlocked key in the underlying cache', function () {
                    expect(cache.set).toHaveBeenCalledWith(unlockedLiveKey);
                });
                it('returns a Promise that resolves to an {OpgpProxyKey} instance ' +
                    'of the unlocked {OpgpLiveKey} instance', function () {
                    expect(result).toEqual(jasmine.objectContaining({ handle: 'unlocked-key-handle' }));
                    expect(result).toEqual(jasmine.objectContaining(unlockedLiveKey.bp));
                    expect(error).not.toBeDefined();
                });
            });
            describe('when the referenced {OpgpLiveKey} instance is already unlocked', function () {
                var error;
                var result;
                beforeEach(function () {
                    livekey.bp.isLocked = false;
                    cache.get.and.returnValue(livekey);
                    livekey.unlock.and.returnValue(Promise.reject(new Error('key not locked')));
                });
                beforeEach(function (done) {
                    service.unlock('unlocked-key-handle', 'passphrase')
                        .then(function (res) { return result = res; })
                        .catch(function (err) { return error = err; })
                        .finally(function () { return setTimeout(done); });
                });
                it('retrieves the {OpgpLiveKey} instance referenced by the given handle', function () {
                    expect(cache.get).toHaveBeenCalledWith('unlocked-key-handle');
                });
                it('delegates to the retrieved {OpgpLiveKey} instance', function () {
                    expect(livekey.unlock).toHaveBeenCalledWith('passphrase');
                });
                it('returns a Promise that rejects with a `key not locked` {Error} ' +
                    'from the {OpgpLiveKey#unlock} method', function () {
                    expect(result).not.toBeDefined();
                    expect(error).toEqual(jasmine.any(Error));
                    expect(error.message).toBe('key not locked');
                });
            });
            describe('when given a stale or invalid handle', function () {
                var error;
                var result;
                beforeEach(function () {
                    cache.get.and.returnValue(undefined);
                });
                beforeEach(function (done) {
                    service.unlock('stale-key-handle', 'passphrase')
                        .then(function (res) { return result = res; })
                        .catch(function (err) { return error = err; })
                        .finally(function () { return setTimeout(done); });
                });
                it('attempts to retrieve the {OpgpLiveKey} instance ' +
                    'referenced by the given handle', function () {
                    expect(cache.get).toHaveBeenCalledWith('stale-key-handle');
                });
                it('returns a Promise that rejects ' +
                    'with an `invalid key reference: not a string or stale` {Error}', function () {
                    expect(result).not.toBeDefined();
                    expect(error).toEqual(jasmine.any(Error));
                    expect(error.message).toBe('invalid key reference: not a string or stale');
                });
            });
            describe('when given an incorrect passphrase', function () {
                var error;
                var result;
                beforeEach(function () {
                    livekey.bp.isLocked = true;
                    cache.get.and.returnValue(livekey);
                    livekey.unlock
                        .and.returnValue(Promise.reject(new Error('fail to unlock key')));
                });
                beforeEach(function (done) {
                    service.unlock('valid-key-handle', 'incorrect passphrase')
                        .then(function (res) { return result = res; })
                        .catch(function (err) { return error = err; })
                        .finally(function () { return setTimeout(done); });
                });
                it('retrieves the {OpgpLiveKey} instance referenced by the given handle', function () {
                    expect(cache.get).toHaveBeenCalledWith('valid-key-handle');
                });
                it('delegates to the retrieved {OpgpLiveKey} instance', function () {
                    expect(livekey.unlock).toHaveBeenCalledWith('incorrect passphrase');
                });
                it('returns a Promise that rejects with a `fail to unlock key` {Error} ' +
                    'from the {OpgpLiveKey#unlock} method', function () {
                    expect(result).not.toBeDefined();
                    expect(error).toEqual(jasmine.any(Error));
                    expect(error.message).toBe('fail to unlock key');
                });
            });
            describe('when the {OpgpLiveKey#unlock} method rejects with an {Error}', function () {
                var error;
                var result;
                beforeEach(function () {
                    livekey.bp.isLocked = true;
                    cache.get.and.returnValue(livekey);
                    livekey.unlock.and.returnValue(Promise.reject(new Error('boom')));
                });
                beforeEach(function (done) {
                    service.unlock('valid-key-handle', 'passphrase')
                        .then(function (res) { return result = res; })
                        .catch(function (err) { return error = err; })
                        .finally(function () { return setTimeout(done); });
                });
                it('retrieves the {OpgpLiveKey} instance referenced by the given handle', function () {
                    expect(cache.get).toHaveBeenCalledWith('valid-key-handle');
                });
                it('delegates to the retrieved {OpgpLiveKey} instance', function () {
                    expect(livekey.unlock).toHaveBeenCalledWith('passphrase');
                });
                it('returns a Promise that rejects with the {Error} ' +
                    'from the {OpgpLiveKey#unlock} method', function () {
                    expect(result).not.toBeDefined();
                    expect(error).toEqual(jasmine.any(Error));
                    expect(error.message).toBe('boom');
                });
            });
        });
        describe('lock (keyRef: KeyRef, passphrase: string, opts?: UnlockOpts)' +
            ': Promise<OpgpProxyKey>', function () {
            describe('when given a valid handle string of an unlocked key '
                + 'and a passphrase string', function () {
                var lockedLiveKey;
                var error;
                var result;
                beforeEach(function () {
                    livekey.bp.isLocked = false;
                    lockedLiveKey = {
                        key: {},
                        bp: { isLocked: true, keys: [{ id: 'key-id' }], user: { ids: [] } }
                    };
                    cache.get.and.returnValue(livekey);
                    livekey.lock.and.returnValue(Promise.resolve(lockedLiveKey));
                    cache.set.and.returnValue('locked-key-handle');
                });
                beforeEach(function (done) {
                    service.lock('unlocked-key-handle', 'secret passphrase')
                        .then(function (res) { return result = res; })
                        .catch(function (err) { return error = err; })
                        .finally(function () { return setTimeout(done); });
                });
                it('retrieves the {OpgpLiveKey} instance referenced by the given handle', function () {
                    expect(cache.get).toHaveBeenCalledWith('unlocked-key-handle');
                });
                it('invalidates the original {OpgpLiveKey} from the cache', function () {
                    expect(cache.del).toHaveBeenCalledWith('unlocked-key-handle');
                });
                it('delegates to the retrieved {OpgpLiveKey} instance', function () {
                    expect(livekey.lock).toHaveBeenCalledWith('secret passphrase');
                });
                it('stores the unlocked key in the underlying cache', function () {
                    expect(cache.set).toHaveBeenCalledWith(lockedLiveKey);
                });
                it('returns a Promise that resolves to an {OpgpProxyKey} instance ' +
                    'of the locked {OpgpLiveKey} instance', function () {
                    expect(result).toEqual(jasmine.objectContaining({ handle: 'locked-key-handle' }));
                    expect(result).toEqual(jasmine.objectContaining(lockedLiveKey.bp));
                    expect(error).not.toBeDefined();
                });
            });
            describe('when the referenced {OpgpLiveKey} instance is already locked', function () {
                var error;
                var result;
                beforeEach(function () {
                    livekey.bp.isLocked = true;
                    cache.get.and.returnValue(livekey);
                });
                beforeEach(function (done) {
                    service.lock('locked-key-handle', 'passphrase')
                        .then(function (res) { return result = res; })
                        .catch(function (err) { return error = err; })
                        .finally(function () { return setTimeout(done); });
                });
                it('retrieves the {OpgpLiveKey} instance referenced by the given handle', function () {
                    expect(cache.get).toHaveBeenCalledWith('locked-key-handle');
                });
                it('does not invalidate the original {OpgpLiveKey} from the cache', function () {
                    expect(cache.del).not.toHaveBeenCalled();
                });
                it('does notdelegate to the retrieved {OpgpLiveKey} instance', function () {
                    expect(livekey.lock).not.toHaveBeenCalled();
                });
                it('returns a Promise that rejects with a `key not unlocked` {Error} ' +
                    'from the {OpgpLiveKey#lock} method', function () {
                    expect(result).not.toBeDefined();
                    expect(error).toEqual(jasmine.any(Error));
                    expect(error.message).toBe('key not unlocked');
                });
            });
            describe('when given a stale or invalid handle', function () {
                var error;
                var result;
                beforeEach(function () {
                    cache.get.and.returnValue(undefined);
                });
                beforeEach(function (done) {
                    service.lock('stale-key-handle', 'secret passphrase')
                        .then(function (res) { return result = res; })
                        .catch(function (err) { return error = err; })
                        .finally(function () { return setTimeout(done); });
                });
                it('attempts to retrieve the {OpgpLiveKey} instance ' +
                    'referenced by the given handle', function () {
                    expect(cache.get).toHaveBeenCalledWith('stale-key-handle');
                });
                it('returns a Promise that rejects ' +
                    'with an `invalid key reference: not a string or stale` {Error}', function () {
                    expect(result).not.toBeDefined();
                    expect(error).toEqual(jasmine.any(Error));
                    expect(error.message).toBe('invalid key reference: not a string or stale');
                });
            });
            describe('when the {OpgpLiveKey#lock} method rejects with an {Error}', function () {
                var error;
                var result;
                beforeEach(function () {
                    cache.get.and.returnValue(livekey);
                    livekey.lock.and.returnValue(Promise.reject(new Error('boom')));
                });
                beforeEach(function (done) {
                    service.lock('valid-key-handle', 'passphrase')
                        .then(function (res) { return result = res; })
                        .catch(function (err) { return error = err; })
                        .finally(function () { return setTimeout(done); });
                });
                it('retrieves the {OpgpLiveKey} instance referenced by the given handle', function () {
                    expect(cache.get).toHaveBeenCalledWith('valid-key-handle');
                });
                it('invalidates the original {OpgpLiveKey} from the cache', function () {
                    expect(cache.del).toHaveBeenCalledWith('valid-key-handle');
                });
                it('delegates to the retrieved {OpgpLiveKey} instance', function () {
                    expect(livekey.lock).toHaveBeenCalledWith('passphrase');
                });
                it('returns a Promise that rejects with the {Error} ' +
                    'from the {OpgpLiveKey#lock} method', function () {
                    expect(result).not.toBeDefined();
                    expect(error).toEqual(jasmine.any(Error));
                    expect(error.message).toBe('boom');
                });
            });
        });
        describe('encrypt (keyRefs: KeyRefMap, plain: string, opts?: EncryptOpts)' +
            ': Promise<string>', function () {
            describe('when given a valid plain text string, and valid handles of valid ' +
                'public cipher and private authentication keys', function () {
                var error;
                var result;
                beforeEach(function () {
                    livekey.bp.isLocked = false;
                    cache.get.and.returnValue(livekey);
                    openpgp.encrypt.and.returnValue({ data: 'cipher text' });
                });
                beforeEach(function (done) {
                    var refs = {
                        cipher: 'valid-cipher-key-handle',
                        auth: 'valid-auth-key-handle'
                    };
                    service.encrypt(refs, 'plain text')
                        .then(function (res) { return result = res; })
                        .catch(function (err) { return error = err; })
                        .finally(function () { return setTimeout(done); });
                });
                it('retrieves the {OpgpLiveKey} instances ' +
                    'referenced by the given handles when compliant', function () {
                    expect(cache.get.calls.allArgs()).toEqual([
                        ['valid-auth-key-handle'],
                        ['valid-cipher-key-handle']
                    ]);
                });
                it('delegates to the openpgp primitive', function () {
                    expect(openpgp.encrypt)
                        .toHaveBeenCalledWith(jasmine.objectContaining({
                        data: 'plain text',
                        publicKeys: [livekey.key],
                        privateKeys: [livekey.key]
                    }));
                });
                it('returns a Promise that resolves to an armor string ' +
                    'of the given text string ' +
                    'encrypted with the referenced cipher {OpgpLiveKey} instances and ' +
                    'signed with the referenced authentication {OpgpLiveKey} instances ', function () {
                    expect(result).toBe('cipher text');
                    expect(error).not.toBeDefined();
                });
            });
            describe('when given a valid plain text string and a stale handle string', function () {
                var error;
                var result;
                beforeEach(function () {
                    cache.get.and.returnValue(undefined);
                });
                beforeEach(function (done) {
                    var refs = {
                        cipher: 'stale-key-handle',
                        auth: 'stale-key-handle'
                    };
                    service.encrypt(refs, 'plain text')
                        .then(function (res) { return result = res; })
                        .catch(function (err) { return error = err; })
                        .finally(function () { return setTimeout(done); });
                });
                it('attempts to retrieve the {OpgpLiveKey} instance ' +
                    'referenced by the given handle', function () {
                    expect(cache.get).toHaveBeenCalledWith('stale-key-handle');
                });
                it('does not delegate to the openpgp primitive', function () {
                    expect(openpgp.encrypt).not.toHaveBeenCalled();
                });
                it('returns a Promise that rejects ' +
                    'with an `invalid key reference: not a string or stale` {Error}', function () {
                    expect(result).not.toBeDefined();
                    expect(error).toBeDefined();
                    expect(error.message).toBe('invalid key reference: not a string or stale');
                });
            });
            describe('when given a valid plain text string, ' +
                'and a valid handle string of a locked private key', function () {
                var error;
                var result;
                beforeEach(function () {
                    livekey.bp.isLocked = true;
                    cache.get.and.returnValue(livekey);
                });
                beforeEach(function (done) {
                    var refs = {
                        cipher: 'cipher-key-handle',
                        auth: 'locked-auth-key-handle'
                    };
                    service.encrypt(refs, 'plain text')
                        .then(function (res) { return result = res; })
                        .catch(function (err) { return error = err; })
                        .finally(function () { return setTimeout(done); });
                });
                it('attempts to retrieve the {OpgpLiveKey} instance ' +
                    'referenced by the given handle', function () {
                    expect(cache.get).toHaveBeenCalledWith('locked-auth-key-handle');
                });
                it('does not delegate to the openpgp primitive', function () {
                    expect(openpgp.encrypt).not.toHaveBeenCalled();
                });
                it('returns a Promise that rejects ' +
                    'with an `private key not unlocked` {Error}', function () {
                    expect(result).not.toBeDefined();
                    expect(error).toBeDefined();
                    expect(error.message).toBe('private key not unlocked');
                });
            });
            describe('when the underlying openpgp primitive rejects with an {Error}', function () {
                var error;
                var result;
                beforeEach(function () {
                    livekey.bp.isLocked = false;
                    cache.get.and.returnValue(livekey);
                    openpgp.encrypt.and.returnValue(Promise.reject(new Error('boom')));
                });
                beforeEach(function (done) {
                    var refs = {
                        cipher: 'valid-cipher-key-handle',
                        auth: 'valid-auth-key-handle'
                    };
                    service.encrypt(refs, 'plain text')
                        .then(function (res) { return result = res; })
                        .catch(function (err) { return error = err; })
                        .finally(function () { return setTimeout(done); });
                });
                it('retrieves the {OpgpLiveKey} instances ' +
                    'referenced by the given handles when compliant', function () {
                    expect(cache.get.calls.allArgs()).toEqual([
                        ['valid-auth-key-handle'],
                        ['valid-cipher-key-handle']
                    ]);
                });
                it('delegates to the openpgp primitive', function () {
                    expect(openpgp.encrypt)
                        .toHaveBeenCalledWith(jasmine.objectContaining({
                        data: 'plain text',
                        publicKeys: [livekey.key],
                        privateKeys: [livekey.key]
                    }));
                });
                it('returns a Promise that rejects with the {Error} ' +
                    'from the openpgp primitive', function () {
                    expect(result).not.toBeDefined();
                    expect(error).toEqual(jasmine.any(Error));
                    expect(error.message).toBe('boom');
                });
            });
        });
        describe('decrypt (keyRefs: KeyRefMap, cipher: string, opts?: DecryptOpts)' +
            ': Promise<string>', function () {
            var message;
            beforeEach(function () {
                message = {};
            });
            describe('when given a valid cipher text string, and valid handles of valid ' +
                'public authentication and a private cipher key', function () {
                var error;
                var result;
                beforeEach(function () {
                    livekey.bp.isLocked = false;
                    cache.get.and.returnValue(livekey);
                    openpgp.message.readArmored.and.returnValue(message);
                    openpgp.decrypt.and.returnValue({ data: 'plain text' });
                });
                beforeEach(function (done) {
                    var refs = {
                        cipher: 'valid-cipher-key-handle',
                        auth: 'valid-auth-key-handle'
                    };
                    service.decrypt(refs, 'cipher text')
                        .then(function (res) { return result = res; })
                        .catch(function (err) { return error = err; })
                        .finally(function () { return setTimeout(done); });
                });
                it('retrieves the {OpgpLiveKey} instances ' +
                    'referenced by the given handles when compliant', function () {
                    expect(cache.get.calls.allArgs()).toEqual([
                        ['valid-cipher-key-handle'],
                        ['valid-auth-key-handle']
                    ]);
                });
                it('delegates to the openpgp primitive', function () {
                    expect(openpgp.message.readArmored).toHaveBeenCalledWith('cipher text');
                    expect(openpgp.decrypt)
                        .toHaveBeenCalledWith(jasmine.objectContaining({
                        message: message,
                        publicKeys: [livekey.key],
                        privateKey: livekey.key
                    }));
                });
                it('returns a Promise that resolves to an armor string ' +
                    'of the given text string ' +
                    'decrypted with the referenced cipher {OpgpLiveKey} instance and ' +
                    'authenticated with the referenced authentication {OpgpLiveKey} instances ', function () {
                    expect(result).toBe('plain text');
                    expect(error).not.toBeDefined();
                });
            });
            describe('when given a valid plain text string and a stale handle string', function () {
                var error;
                var result;
                beforeEach(function () {
                    cache.get.and.returnValue(undefined);
                });
                beforeEach(function (done) {
                    var refs = {
                        cipher: 'stale-key-handle',
                        auth: 'stale-key-handle'
                    };
                    service.decrypt(refs, 'cipher text')
                        .then(function (res) { return result = res; })
                        .catch(function (err) { return error = err; })
                        .finally(function () { return setTimeout(done); });
                });
                it('attempts to retrieve the {OpgpLiveKey} instance ' +
                    'referenced by the given handle', function () {
                    expect(cache.get).toHaveBeenCalledWith('stale-key-handle');
                });
                it('does not delegate to the openpgp primitive', function () {
                    expect(openpgp.message.readArmored).not.toHaveBeenCalled();
                    expect(openpgp.decrypt).not.toHaveBeenCalled();
                });
                it('returns a Promise that rejects ' +
                    'with an `invalid key reference: not a string or stale` {Error}', function () {
                    expect(result).not.toBeDefined();
                    expect(error).toBeDefined();
                    expect(error.message).toBe('invalid key reference: not a string or stale');
                });
            });
            describe('when given a valid plain text string, ' +
                'and a valid handle string of a locked private key', function () {
                var error;
                var result;
                beforeEach(function () {
                    livekey.bp.isLocked = true;
                    cache.get.and.returnValue(livekey);
                });
                beforeEach(function (done) {
                    var refs = {
                        cipher: 'locked-cipher-key-handle',
                        auth: 'auth-key-handle'
                    };
                    service.decrypt(refs, 'cipher text')
                        .then(function (res) { return result = res; })
                        .catch(function (err) { return error = err; })
                        .finally(function () { return setTimeout(done); });
                });
                it('attempts to retrieve the {OpgpLiveKey} instance ' +
                    'referenced by the given handle', function () {
                    expect(cache.get).toHaveBeenCalledWith('locked-cipher-key-handle');
                });
                it('does not delegate to the openpgp primitive', function () {
                    expect(openpgp.message.readArmored).not.toHaveBeenCalled();
                    expect(openpgp.decrypt).not.toHaveBeenCalled();
                });
                it('returns a Promise that rejects ' +
                    'with an `private key not unlocked` {Error}', function () {
                    expect(result).not.toBeDefined();
                    expect(error).toBeDefined();
                    expect(error.message).toBe('private key not unlocked');
                });
            });
            describe('when the underlying openpgp primitive rejects with an {Error}', function () {
                var error;
                var result;
                beforeEach(function () {
                    livekey.bp.isLocked = false;
                    cache.get.and.returnValue(livekey);
                    openpgp.message.readArmored.and.returnValue(message);
                    openpgp.decrypt.and.returnValue(Promise.reject(new Error('boom')));
                });
                beforeEach(function (done) {
                    var refs = {
                        cipher: 'valid-cipher-key-handle',
                        auth: 'valid-auth-key-handle'
                    };
                    service.decrypt(refs, 'cipher text')
                        .then(function (res) { return result = res; })
                        .catch(function (err) { return error = err; })
                        .finally(function () { return setTimeout(done); });
                });
                it('retrieves the {OpgpLiveKey} instances ' +
                    'referenced by the given handles when compliant', function () {
                    expect(cache.get.calls.allArgs()).toEqual([
                        ['valid-cipher-key-handle'],
                        ['valid-auth-key-handle']
                    ]);
                });
                it('delegates to the openpgp primitive', function () {
                    expect(openpgp.message.readArmored).toHaveBeenCalledWith('cipher text');
                    expect(openpgp.decrypt)
                        .toHaveBeenCalledWith(jasmine.objectContaining({
                        message: message,
                        publicKeys: [livekey.key],
                        privateKey: livekey.key
                    }));
                });
                it('returns a Promise that rejects with the {Error} ' +
                    'from the openpgp primitive', function () {
                    expect(result).not.toBeDefined();
                    expect(error).toEqual(jasmine.any(Error));
                    expect(error.message).toBe('boom');
                });
            });
        });
        describe('sign (keyRefs: KeyRef[]|KeyRef, text: string, opts?: SignOpts)' +
            ': Promise<string>', function () {
            var message;
            beforeEach(function () {
                message = jasmine.createSpyObj('message', ['sign', 'armor']);
            });
            describe('when given a text string and a valid handle string that is not stale', function () {
                var error;
                var result;
                beforeEach(function () {
                    cache.get.and.returnValue(livekey);
                    openpgp.message.fromText.and.returnValue(message);
                    message.sign.and.returnValue(message);
                    message.armor.and.returnValue('signed-armor-text');
                });
                beforeEach(function (done) {
                    service.sign('valid-key-handle', 'plain text')
                        .then(function (res) { return result = res; })
                        .catch(function (err) { return error = err; })
                        .finally(function () { return setTimeout(done); });
                });
                it('retrieves the {OpgpLiveKey} instance referenced by the given handle', function () {
                    expect(cache.get).toHaveBeenCalledWith('valid-key-handle');
                });
                it('delegates to the openpgp primitive', function () {
                    expect(openpgp.message.fromText).toHaveBeenCalledWith('plain text');
                    expect(message.sign).toHaveBeenCalledWith([livekey.key]);
                    expect(message.armor).toHaveBeenCalledWith();
                });
                it('returns a Promise that resolves to an armor string ' +
                    'of the given text string ' +
                    'signed with the referenced {OpgpLiveKey} instance ', function () {
                    expect(result).toBe('signed-armor-text');
                    expect(error).not.toBeDefined();
                });
            });
            describe('when given a text string and a stale handle string', function () {
                var error;
                var result;
                beforeEach(function () {
                    cache.get.and.returnValue(undefined);
                });
                beforeEach(function (done) {
                    service.sign('stale-key-handle', 'plain text')
                        .then(function (res) { return result = res; })
                        .catch(function (err) { return error = err; })
                        .finally(function () { return setTimeout(done); });
                });
                it('attempts to retrieve the {OpgpLiveKey} instance ' +
                    'referenced by the given handle', function () {
                    expect(cache.get).toHaveBeenCalledWith('stale-key-handle');
                });
                it('does not delegate to the openpgp primitive', function () {
                    expect(openpgp.message.fromText).not.toHaveBeenCalled();
                });
                it('returns a Promise that rejects ' +
                    'with an `invalid key reference: not a string or stale` {Error}', function () {
                    expect(result).not.toBeDefined();
                    expect(error).toBeDefined();
                    expect(error.message).toBe('invalid key reference: not a string or stale');
                });
            });
            describe('when given non-compliant arguments', function () {
                var error;
                var result;
                beforeEach(function () {
                    cache.get.and.returnValue(livekey);
                });
                beforeEach(function (done) {
                    var args = getInvalidAuthArgs();
                    Promise.any(args.map(function (args) { return service.sign.apply(service, args); }))
                        .then(function (res) { return result = res; })
                        .catch(function (err) { return error = err; })
                        .finally(function () { return setTimeout(done); });
                });
                it('attempts to retrieve the {OpgpLiveKey} instances ' +
                    'referenced by the given handles when compliant', function () {
                    cache.get.calls.allArgs()
                        .forEach(function (args) { return expect(args).toEqual(['compliant handle']); });
                });
                it('does not delegate to the openpgp primitive', function () {
                    expect(openpgp.message.fromText).not.toHaveBeenCalled();
                });
                it('returns a Promise that rejects ' +
                    'with an `invalid key reference: not a string or stale` or ' +
                    'an `invalid text: not a string` {Error}', function () {
                    expect(result).not.toBeDefined();
                    expect(error).toEqual(jasmine.any(Promise.AggregateError));
                    error.forEach(function (error) {
                        expect(error).toEqual(jasmine.any(Error));
                        expect(error.message).toEqual(jasmine
                            .stringMatching(/invalid key reference: not a string or stale|invalid text: not a string/));
                    });
                });
            });
        });
        describe('verify (keyRefs: KeyRef[]|KeyRef, armor: string, opts?: VerifyOpts)' +
            ': Promise<string>', function () {
            var message;
            beforeEach(function () {
                message = jasmine.createSpyObj('message', ['verify', 'getText']);
            });
            describe('when given a signed armor text string and the valid handle string ' +
                'of the corresponding authentication key', function () {
                var error;
                var result;
                beforeEach(function () {
                    cache.get.and.returnValue(livekey);
                    openpgp.message.readArmored.and.returnValue(message);
                    message.verify.and.returnValue([{ keyid: 'keyid', valid: true }]);
                    message.getText.and.returnValue('plain-text');
                });
                beforeEach(function (done) {
                    service.verify('valid-auth-key-handle', 'signed armor text')
                        .then(function (res) { return result = res; })
                        .catch(function (err) { return error = err; })
                        .finally(function () { return setTimeout(done); });
                });
                it('retrieves the {OpgpLiveKey} instance referenced by the given handle', function () {
                    expect(cache.get).toHaveBeenCalledWith('valid-auth-key-handle');
                });
                it('delegates to the openpgp primitive', function () {
                    expect(openpgp.message.readArmored).toHaveBeenCalledWith('signed armor text');
                    expect(message.verify).toHaveBeenCalledWith([livekey.key]);
                    expect(message.getText).toHaveBeenCalledWith();
                });
                it('returns a Promise that resolves to the plain text string', function () {
                    expect(result).toBe('plain-text');
                    expect(error).not.toBeDefined();
                });
            });
            describe('when given a signed armor text string and a valid handle string ' +
                'of the wrong authentication key', function () {
                var error;
                var result;
                beforeEach(function () {
                    cache.get.and.returnValue(livekey);
                    openpgp.message.readArmored.and.returnValue(message);
                    message.verify.and.returnValue([
                        { keyid: 'verified-keyid', valid: true },
                        { keyid: 'wrong-keyid', valid: false },
                        { keyid: 'another-wrong-keyid', valid: false }
                    ]);
                });
                beforeEach(function (done) {
                    service.verify([
                        'correct-key-handle', 'wrong-key-handle', 'another-wrong-key-handle'
                    ], 'signed armor text')
                        .then(function (res) { return result = res; })
                        .catch(function (err) { return error = err; })
                        .finally(function () { return setTimeout(done); });
                });
                it('retrieves the {OpgpLiveKey} instance referenced by the given handle', function () {
                    expect(cache.get.calls.allArgs()).toEqual([
                        ['correct-key-handle'],
                        ['wrong-key-handle'],
                        ['another-wrong-key-handle']
                    ]);
                });
                it('delegates to the openpgp primitive', function () {
                    expect(openpgp.message.readArmored).toHaveBeenCalledWith('signed armor text');
                    expect(message.verify).toHaveBeenCalledWith([livekey.key, livekey.key, livekey.key]);
                    expect(message.getText).not.toHaveBeenCalled();
                });
                it('returns a Promise that rejects with an {Error} containing a message ' +
                    'with a trailing list of the key IDs that fail authentication', function () {
                    expect(result).not.toBeDefined();
                    expect(error).toEqual(jasmine.any(Error));
                    expect(error.message)
                        .toBe('authentication failed: wrong-keyid,another-wrong-keyid');
                });
            });
            describe('when given a signed armor text string and a stale handle string', function () {
                var error;
                var result;
                beforeEach(function () {
                    cache.get.and.returnValue(undefined);
                });
                beforeEach(function (done) {
                    service.verify('stale-key-handle', 'signed armor text')
                        .then(function (res) { return result = res; })
                        .catch(function (err) { return error = err; })
                        .finally(function () { return setTimeout(done); });
                });
                it('attempts to retrieve the {OpgpLiveKey} instance ' +
                    'referenced by the given handle', function () {
                    expect(cache.get).toHaveBeenCalledWith('stale-key-handle');
                });
                it('does not delegate to the openpgp primitive', function () {
                    expect(openpgp.message.readArmored).not.toHaveBeenCalled();
                });
                it('returns a Promise that rejects ' +
                    'with an `invalid key reference: not a string or stale` {Error}', function () {
                    expect(result).not.toBeDefined();
                    expect(error).toBeDefined();
                    expect(error.message).toBe('invalid key reference: not a string or stale');
                });
            });
            describe('when given non-compliant arguments', function () {
                var error;
                var result;
                beforeEach(function () {
                    cache.get.and.returnValue(livekey);
                });
                beforeEach(function (done) {
                    var args = getInvalidAuthArgs();
                    Promise.any(args.map(function (args) { return service.verify.apply(service, args); }))
                        .then(function (res) { return result = res; })
                        .catch(function (err) { return error = err; })
                        .finally(function () { return setTimeout(done); });
                });
                it('attempts to retrieve the {OpgpLiveKey} instances ' +
                    'referenced by the given handles when compliant', function () {
                    cache.get.calls.allArgs()
                        .forEach(function (args) { return expect(args).toEqual(['compliant handle']); });
                });
                it('does not delegate to the openpgp primitive', function () {
                    expect(openpgp.message.readArmored).not.toHaveBeenCalled();
                });
                it('returns a Promise that rejects ' +
                    'with an `invalid key reference: not a string or stale` or ' +
                    'an `invalid armor: not a string` {Error}', function () {
                    expect(result).not.toBeDefined();
                    expect(error).toEqual(jasmine.any(Promise.AggregateError));
                    error.forEach(function (error) {
                        expect(error).toEqual(jasmine.any(Error));
                        expect(error.message).toEqual(jasmine
                            .stringMatching(/invalid key reference: not a string or stale|invalid armor: not a string/));
                    });
                });
            });
        });
    });
    function getInvalidAuthArgs() {
        var types = [
            undefined,
            null,
            NaN,
            true,
            42,
            'foo',
            ['foo'],
            { foo: 'foo' }
        ];
        function isString(val) {
            return typeof val === 'string';
        }
        var nonStringTypes = types
            .filter(function (val) { return !isString(val); });
        return nonStringTypes
            .filter(function (val) { return !Array.isArray(val); })
            .map(function (invalidKeyRef) { return [invalidKeyRef, 'compliant text']; })
            .concat(nonStringTypes
            .map(function (invalidKeyRef) { return [[invalidKeyRef], 'compliant text']; }))
            .concat(nonStringTypes
            .map(function (invalidText) { return ['compliant handle', invalidText]; }));
    }
}());

},{"../src/index.ts":8,"bluebird":undefined,"proxyquireify":5}],7:[function(require,module,exports){
"use strict";
;
var live_key_1 = require("../src/live-key");
var base64 = require("base64-js");
var getLiveKey;
var openpgp;
var key;
var subkeys;
var packets;
var msg;
var blueprint;
var cloneKey;
beforeEach(function () {
    openpgp = {
        crypto: { hash: jasmine.createSpyObj('hash', ['sha256']) },
        key: jasmine.createSpyObj('key', ['readArmored']),
        message: jasmine.createSpyObj('message', ['fromText', 'readArmored'])
    };
    key = jasmine.createSpyObj('key', [
        'armor',
        'getAllKeyPackets',
        'isPublic',
        'getUserIds',
        'getSigningKeyPacket',
        'getEncryptionKeyPacket',
        'verifyPrimaryKey',
        'getExpirationTime',
        'encrypt',
        'decrypt'
    ]);
    packets = [0, 1, 2, 3]
        .map(function (packet) { return jasmine.createSpyObj("packet" + packet, [
        'getFingerprint',
        'writeOld'
    ]); });
    subkeys = [0, 1, 2]
        .map(function (subkey) { return jasmine.createSpyObj("subkey" + subkey, [
        'isValidEncryptionKey',
        'isValidSigningKey',
        'verify',
        'getExpirationTime'
    ]); });
    msg = jasmine.createSpyObj('msg', ['sign', 'verify']);
    key.armor.and.returnValue('key-armor');
    key.getAllKeyPackets.and.returnValue(packets);
    key.isPublic.and.returnValue(false);
    key.getUserIds.and.returnValue(['user@test.io']);
    key.getSigningKeyPacket.and.returnValue(packets[0]);
    key.getEncryptionKeyPacket.and.returnValue(packets[0]);
    key.verifyPrimaryKey.and.returnValue(6510);
    packets.forEach(function (packet, index) {
        packet.getFingerprint.and.returnValue(index.toString());
        packet.writeOld.and.returnValue(["old" + index]);
    });
    subkeys.forEach(function (subkey, index) {
        subkey.isValidEncryptionKey.and.returnValue(true);
        subkey.isValidSigningKey.and.returnValue(true);
        subkey.verify.and.returnValue(6511 + index);
        subkey.getExpirationTime.and.returnValue(new Date(1984 - index));
    });
    key.primaryKey = { isDecrypted: false };
    key.subKeys = subkeys;
    cloneKey = function (key) {
        var clone = Object.assign({}, key);
        clone.primaryKey = { isDecrypted: key.primaryKey.isDecrypted };
        clone.subKeys = key.subKeys.slice();
        return clone;
    };
    openpgp.crypto.hash.sha256.and.returnValue(base64.toByteArray('c2hhMjU2'));
    openpgp.key.readArmored.and.callFake(function () { return ({ keys: [cloneKey(key)] }); });
    openpgp.message.readArmored.and.returnValue(msg);
    openpgp.message.fromText.and.returnValue(msg);
    blueprint = {
        isLocked: true,
        isPublic: false,
        keys: [0, 1, 2, 3].map(function (index) { return ({
            isAuth: true,
            isCiph: true,
            expires: !index ? Infinity : 1985 - index,
            fingerprint: index.toString(),
            hash: 'c2hhMjU2',
            status: 6510 + index
        }); }),
        user: { ids: ['user@test.io'] }
    };
});
beforeEach(function () {
    getLiveKey = live_key_1.default({ openpgp: openpgp });
});
describe('default export: ' +
    'getLiveKeyFactory (config: {openpgp:any}): LiveKeyFactory', function () {
    it('returns a {LiveKey} factory when given an instance of openpgp', function () {
        expect(getLiveKey).toEqual(jasmine.any(Function));
    });
});
describe('LiveKeyFactory: ' +
    'getLiveKey (key: any, opts?: LiveKeyFactoryOpts): OpgpLiveKey', function () {
    var livekey;
    beforeEach(function () {
        livekey = getLiveKey(key);
    });
    it('returns a {OpgpLiveKey} instance that wraps the given openpgp key', function () {
        expect(livekey).toEqual(jasmine.objectContaining({
            key: key,
            bp: jasmine.any(Object),
            armor: jasmine.any(Function),
            unlock: jasmine.any(Function),
            lock: jasmine.any(Function),
            sign: jasmine.any(Function),
            verify: jasmine.any(Function)
        }));
    });
});
describe('OpgpLiveKey', function () {
    var livekey;
    beforeEach(function () {
        livekey = getLiveKey(key);
    });
    describe('bp: OpgpKeyBlueprint', function () {
        var bp;
        beforeEach(function () {
            bp = livekey.bp;
        });
        it('is a blueprint of the openpgp wrapped in the {OpgpLiveKey} instance:\n' +
            '{\n  isLocked: boolean,\n  isPublic: boolean,\n  keys: OpgpKeyId[],\n  ' +
            'user: { ids: string[] }\n}\n' +
            'where each {OpgpKeyId} element in `keys` is a blueprint ' +
            'of the corresponding key component:\n' +
            '{\n  isAuth: boolean,\n  isCiph: boolean,\n  expires: number,\n  ' +
            'fingerprint: string,\n  hash: string,\n  status: number\n}', function () {
            expect(bp).toEqual(blueprint);
        });
    });
    describe('armor (): Promise<string>', function () {
        describe('when the openpgp primitive succeeds', function () {
            var error;
            var result;
            beforeEach(function (done) {
                livekey.armor()
                    .then(function (res) { return result = res; })
                    .catch(function (err) { return error = err; })
                    .finally(function () { return setTimeout(done); });
            });
            it('returns a Promise that resolves to an armored string representation ' +
                'of the wrapped openpgp key when the openpgp primitive succeeds', function () {
                expect(key.armor).toHaveBeenCalled();
                expect(result).toBe('key-armor');
                expect(error).not.toBeDefined();
            });
        });
        describe('when the openpgp primitive fails', function () {
            var error;
            var result;
            beforeEach(function (done) {
                key.armor.and.throwError('boom');
                livekey.armor()
                    .then(function (res) { return result = res; })
                    .catch(function (err) { return error = err; })
                    .finally(function () { return setTimeout(done); });
            });
            it('returns a Promise that rejects with the error ' +
                'from the openpgp primitive when it fails', function () {
                expect(key.armor).toHaveBeenCalled();
                expect(result).not.toBeDefined();
                expect(error).toBeDefined();
                expect(error.message).toBe('boom');
            });
        });
    });
    describe('unlock (passphrase: string, opts?: LiveKeyUnlockOpts): ' +
        'Promise<OpgpLiveKey>', function () {
        var unlocked;
        beforeEach(function () {
            unlocked = cloneKey(key);
            unlocked.primaryKey.isDecrypted = true;
        });
        describe('when given the correct passphrase', function () {
            var error;
            var result;
            beforeEach(function (done) {
                openpgp.key.readArmored.and.callFake(function () {
                    var clone = cloneKey(unlocked);
                    clone.decrypt = jasmine.createSpy('decrypt').and.returnValue(true);
                    return { keys: [clone] };
                });
                livekey.unlock('correct passphrase')
                    .then(function (res) { return result = res; })
                    .catch(function (err) { return error = err; })
                    .finally(function () { return setTimeout(done); });
            });
            it('returns a Promise that resolves to a new, '
                + 'unlocked {OpgpLiveKey} instance', function () {
                expect(error).not.toBeDefined();
                expect(result).not.toBe(livekey);
                expect(result.bp.isLocked).toBe(false);
            });
            it('does not change the state of its {OpgpLiveKey} instance', function () {
                expect(livekey.key).toBe(key);
                expect(livekey.key.primaryKey.isDecrypted).toBe(false);
                expect(livekey.bp.isLocked).toBe(true);
                expect(livekey.key.decrypt).not.toHaveBeenCalled();
            });
        });
        describe('when given an incorrect passphrase', function () {
            var error;
            var result;
            beforeEach(function (done) {
                key.decrypt.and.returnValue(false);
                livekey.unlock('incorrect passphrase')
                    .then(function (res) { return result = res; })
                    .catch(function (err) { return error = err; })
                    .finally(function () { return setTimeout(done); });
            });
            it('returns a Promise that rejects with a `fail to unlock key` {Error}', function () {
                expect(result).not.toBeDefined();
                expect(error).toEqual(jasmine.any(Error));
                expect(error.message).toBe('fail to unlock key');
            });
            it('does not change the state of its {OpgpLiveKey} instance', function () {
                expect(livekey.key).toBe(key);
                expect(livekey.key.primaryKey.isDecrypted).toBe(false);
                expect(livekey.bp.isLocked).toBe(true);
            });
        });
        describe('when its {OpgpLiveKey} is already unlocked', function () {
            var error;
            var result;
            beforeEach(function (done) {
                livekey = getLiveKey(unlocked);
                livekey.unlock('passphrase')
                    .then(function (res) { return result = res; })
                    .catch(function (err) { return error = err; })
                    .finally(function () { return setTimeout(done); });
            });
            it('returns a Promise that rejects with a `key not locked` {Error}', function () {
                expect(result).not.toBeDefined();
                expect(error).toEqual(jasmine.any(Error));
                expect(error.message).toBe('key not locked');
            });
            it('does not change the state of its {OpgpLiveKey} instance', function () {
                expect(livekey.key).toBe(unlocked);
                expect(livekey.key.primaryKey.isDecrypted).toBe(true);
                expect(livekey.bp.isLocked).toBe(false);
            });
        });
        describe('when the openpgp primitive throws an exception', function () {
            var error;
            var result;
            beforeEach(function (done) {
                key.decrypt.and.throwError('boom');
                livekey.unlock('passphrase')
                    .then(function (res) { return result = res; })
                    .catch(function (err) { return error = err; })
                    .finally(function () { return setTimeout(done); });
            });
            it('returns a Promise that rejects with the corresponding error', function () {
                expect(result).not.toBeDefined();
                expect(error).toEqual(jasmine.any(Error));
                expect(error.message).toBe('boom');
            });
            it('does not change the state of its {OpgpLiveKey} instance', function () {
                expect(livekey.key).toBe(key);
                expect(livekey.key.primaryKey.isDecrypted).toBe(false);
                expect(livekey.bp.isLocked).toBe(true);
            });
        });
    });
    describe('lock (passphrase: string, opts?: LiveKeyUnlockOpts): ' +
        'Promise<OpgpLiveKey>', function () {
        var unlocked;
        beforeEach(function () {
            unlocked = cloneKey(key);
            unlocked.primaryKey.isDecrypted = true;
        });
        describe('when given a passphrase', function () {
            var error;
            var result;
            beforeEach(function (done) {
                unlocked.encrypt = jasmine.createSpy('encrypt')
                    .and.callFake(function () { return unlocked.primaryKey.isDecrypted = false; });
                livekey = getLiveKey(unlocked);
                livekey.lock('passphrase')
                    .then(function (res) { return result = res; })
                    .catch(function (err) { return error = err; })
                    .finally(function () { return setTimeout(done); });
            });
            it('returns a Promise that resolves to a new, '
                + 'locked {OpgpLiveKey} instance', function () {
                expect(error).not.toBeDefined();
                expect(result).not.toBe(livekey);
                expect(result.bp.isLocked).toBe(true);
            });
            it('invalidates its {OpgpLiveKey} instance', function () {
                expect(livekey.key).not.toBeDefined();
            });
        });
        describe('when its {OpgpLiveKey} is already locked', function () {
            var error;
            var result;
            beforeEach(function (done) {
                livekey.lock('passphrase')
                    .then(function (res) { return result = res; })
                    .catch(function (err) { return error = err; })
                    .finally(function () { return setTimeout(done); });
            });
            it('returns a Promise that rejects with a `key not unlocked` {Error}', function () {
                expect(result).not.toBeDefined();
                expect(error).toEqual(jasmine.any(Error));
                expect(error.message).toBe('key not unlocked');
            });
            it('does not change the state of its {OpgpLiveKey} instance', function () {
                expect(livekey.key).toBe(key);
                expect(livekey.key.primaryKey.isDecrypted).toBe(false);
                expect(livekey.bp.isLocked).toBe(true);
            });
        });
        describe('when the openpgp primitive throws an exception', function () {
            var error;
            var result;
            beforeEach(function (done) {
                key.encrypt.and.throwError('boom');
                livekey = getLiveKey(unlocked);
                livekey.lock('incorrect passphrase')
                    .then(function (res) { return result = res; })
                    .catch(function (err) { return error = err; })
                    .finally(function () { return setTimeout(done); });
            });
            it('returns a Promise that rejects with the corresponding error', function () {
                expect(result).not.toBeDefined();
                expect(error).toEqual(jasmine.any(Error));
                expect(error.message).toBe('boom');
            });
            it('invalidates its {OpgpLiveKey} instance', function () {
                expect(livekey.key).not.toBeDefined();
            });
        });
    });
});

},{"../src/live-key":9,"base64-js":undefined}],8:[function(require,module,exports){
"use strict";
;
var live_key_1 = require("./live-key");
var proxy_key_1 = require("./proxy-key");
var utils_1 = require("./utils");
var csrkey_cache_1 = require("csrkey-cache");
var openpgp = require('openpgp');
var Promise = require("bluebird");
var tslib_1 = require("tslib");
var OpgpServiceClass = (function () {
    function OpgpServiceClass(cache, getLiveKey, getProxyKey, openpgp) {
        this.cache = cache;
        this.getLiveKey = getLiveKey;
        this.getProxyKey = getProxyKey;
        this.openpgp = openpgp;
    }
    OpgpServiceClass.prototype.configure = function (config) {
        var openpgp = configureOpenpgp(this.openpgp, config);
        return Promise.resolve(tslib_1.__assign({}, openpgp.config));
    };
    OpgpServiceClass.prototype.generateKey = function (passphrase, opts) {
        var _this = this;
        return !utils_1.isString(passphrase) ? reject('invalid passphrase: not a string')
            : Promise.try(function () {
                var options = {
                    userIds: opts && [].concat(opts.users),
                    passphrase: passphrase,
                    numBits: opts && opts.size || 4096,
                    unlocked: opts && !!opts.unlocked
                };
                return _this.openpgp.key.generateKey(options)
                    .then(function (key) { return _this.cacheAndProxyKey(_this.getLiveKey(key)); });
            });
    };
    OpgpServiceClass.prototype.getKeysFromArmor = function (armor, opts) {
        var _this = this;
        return !utils_1.isString(armor) ? reject('invalid armor: not a string')
            : Promise.try(function () {
                var keys = _this.openpgp.key.readArmored(armor).keys
                    .map(function (key) { return _this.cacheAndProxyKey(_this.getLiveKey(key)); });
                return keys.length > 1 ? keys : keys[0];
            });
    };
    OpgpServiceClass.prototype.getArmorFromKey = function (keyRef) {
        var _this = this;
        return Promise.try(function () { return _this.getCachedLiveKey(keyRef).armor(); });
    };
    OpgpServiceClass.prototype.unlock = function (keyRef, passphrase, opts) {
        var _this = this;
        return !utils_1.isString(passphrase) ? reject('invalid passphrase: not a string')
            : Promise.try(function () { return _this.getCachedLiveKey(keyRef).unlock(passphrase); })
                .then(function (unlocked) { return _this.cacheAndProxyKey(unlocked); });
    };
    OpgpServiceClass.prototype.lock = function (keyRef, passphrase, opts) {
        var _this = this;
        return !utils_1.isString(passphrase) ? reject('invalid passphrase: not a string')
            : Promise.try(function () {
                var livekey = _this.getCachedLiveKey(keyRef);
                if (livekey.bp.isLocked) {
                    return reject('key not unlocked');
                }
                var handle = getHandle(keyRef);
                _this.cache.del(handle);
                return livekey.lock(passphrase);
            })
                .then(function (locked) { return _this.cacheAndProxyKey(locked); });
    };
    OpgpServiceClass.prototype.encrypt = function (keyRefs, plain, opts) {
        var _this = this;
        return !utils_1.isString(plain) ? reject('invalid plain text: not a string')
            : Promise.try(function () { return _this.openpgp.encrypt({
                privateKeys: _this.getCachedPrivateOpenpgpKeys(keyRefs.auth),
                publicKeys: _this.getCachedOpenpgpKeys(keyRefs.cipher),
                data: plain
            }); })
                .get('data');
    };
    OpgpServiceClass.prototype.decrypt = function (keyRefs, cipher, opts) {
        var _this = this;
        return !utils_1.isString(cipher) ? reject('invalid cipher: not a string')
            : Promise.try(function () { return _this.openpgp.decrypt({
                privateKey: _this.getCachedPrivateOpenpgpKeys(keyRefs.cipher)[0],
                publicKeys: _this.getCachedOpenpgpKeys(keyRefs.auth),
                message: _this.openpgp.message.readArmored(cipher)
            }); })
                .get('data');
    };
    OpgpServiceClass.prototype.sign = function (keyRefs, text, opts) {
        var _this = this;
        return Promise.try(function () {
            var keys = _this.getCachedOpenpgpKeys(keyRefs);
            if (!utils_1.isString(text)) {
                return reject('invalid text: not a string');
            }
            var message = _this.openpgp.message.fromText(text);
            return message.sign(keys).armor();
        });
    };
    OpgpServiceClass.prototype.verify = function (keyRefs, armor, opts) {
        var _this = this;
        return Promise.try(function () {
            var keys = _this.getCachedOpenpgpKeys(keyRefs);
            if (!utils_1.isString(armor)) {
                return reject('invalid armor: not a string');
            }
            var message = _this.openpgp.message.readArmored(armor);
            var invalid = message.verify(keys)
                .filter(function (key) { return !key.valid; })
                .map(function (key) { return key.keyid; })
                .join();
            return !invalid ? message.getText()
                : reject('authentication failed: ' + invalid);
        });
    };
    OpgpServiceClass.prototype.getCachedLiveKey = function (keyRef) {
        var handle = getHandle(keyRef);
        var livekey = handle && this.cache.get(handle);
        if (!livekey) {
            throw new Error('invalid key reference: not a string or stale');
        }
        return livekey;
    };
    OpgpServiceClass.prototype.getCachedLiveKeys = function (keyRefs) {
        var _this = this;
        var refs = [].concat(keyRefs);
        if (!refs.length) {
            throw new Error('no key references');
        }
        return refs.map(function (keyRef) { return _this.getCachedLiveKey(keyRef); });
    };
    OpgpServiceClass.prototype.getCachedOpenpgpKeys = function (keyRefs) {
        return this.getCachedLiveKeys(keyRefs).map(function (livekey) { return livekey.key; });
    };
    OpgpServiceClass.prototype.getCachedPrivateOpenpgpKeys = function (keyRefs) {
        var keys = this.getCachedLiveKeys(keyRefs);
        if (keys.some(function (key) { return key.bp.isLocked; })) {
            throw new Error('private key not unlocked');
        }
        return keys.map(function (livekey) { return livekey.key; });
    };
    OpgpServiceClass.prototype.cacheAndProxyKey = function (livekey) {
        var handle = this.cache.set(livekey);
        if (!handle) {
            throw new Error('fail to cache key');
        }
        return this.getProxyKey(handle, livekey.bp);
    };
    return OpgpServiceClass;
}());
OpgpServiceClass.getInstance = function (config) {
    var spec = tslib_1.__assign({}, config);
    var cache = spec.cache || csrkey_cache_1.default();
    var openpgp = getOpenpgp(spec.openpgp);
    var getLiveKey = spec.getLiveKey || live_key_1.default({ openpgp: openpgp });
    var instance = new OpgpServiceClass(cache, getLiveKey, spec.getProxyKey || proxy_key_1.default, openpgp);
    return OpgpServiceClass.PUBLIC_METHODS.reduce(function (service, method) {
        service[method] = instance[method].bind(instance);
        return service;
    }, {});
};
OpgpServiceClass.PUBLIC_METHODS = [
    'configure',
    'generateKey',
    'getKeysFromArmor',
    'getArmorFromKey',
    'unlock',
    'lock',
    'encrypt',
    'decrypt',
    'sign',
    'verify'
];
function reject(reason) {
    return Promise.reject(new Error(reason));
}
function getHandle(keyRef) {
    var handle = utils_1.isString(keyRef) ? keyRef : !!keyRef && keyRef.handle;
    return utils_1.isString(handle) && handle;
}
var OPENPGP_CONFIG_DEFAULTS = {
    aead_protect: true
};
function getOpenpgp(config) {
    if (isOpenpgp(config)) {
        return config;
    }
    return configureOpenpgp(openpgp, OPENPGP_CONFIG_DEFAULTS, config);
}
function isOpenpgp(val) {
    return !!val && ['config', 'crypto', 'key', 'message']
        .every(function (prop) { return !!val[prop]; })
        && [
            val.crypto.encrypt, val.crypto.decrypt,
            val.crypto.hash && val.crypto.hash.sha256,
            val.key.readArmored, val.key.generateKey,
            val.message.fromText, val.message.readArmored
        ].every(function (fun) { return utils_1.isFunction(fun); });
}
function configureOpenpgp(openpgp) {
    var configs = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        configs[_i - 1] = arguments[_i];
    }
    var args = [openpgp.config].concat(configs.map(toValidOpenpgpConfig));
    tslib_1.__assign.apply(Object, args);
    return openpgp;
}
var OPENPGP_CONFIG_INTERFACE = {
    'prefer_hash_algorithm': utils_1.isNumber,
    'encryption_cipher': utils_1.isNumber,
    'compression': utils_1.isNumber,
    'aead_protect': utils_1.isBoolean,
    'integrity_protect': utils_1.isBoolean,
    'ignore_mdc_error': utils_1.isBoolean,
    'rsa_blinding': utils_1.isBoolean,
    'use_native': utils_1.isBoolean,
    'zero_copy': utils_1.isBoolean,
    'debug': utils_1.isBoolean,
    'show_version': utils_1.isBoolean,
    'show_comment': utils_1.isBoolean,
    'versionstring': utils_1.isString,
    'commentstring': utils_1.isString,
    'keyserver': utils_1.isString,
    'node_store': utils_1.isString
};
var OPENPGP_CONFIG_KEYS = Object.keys(OPENPGP_CONFIG_INTERFACE);
function toValidOpenpgpConfig(val) {
    return Object.keys(val || {})
        .reduce(function (config, key) {
        var isValid = OPENPGP_CONFIG_INTERFACE[key];
        if (!isValid) {
            return config;
        }
        var value = val[key];
        if (!isValid(value)) {
            return config;
        }
        config[key] = value;
        return config;
    }, {});
}
var getOpgpService = OpgpServiceClass.getInstance;
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = getOpgpService;

},{"./live-key":9,"./proxy-key":10,"./utils":11,"bluebird":undefined,"csrkey-cache":undefined,"openpgp":undefined,"tslib":undefined}],9:[function(require,module,exports){
"use strict";
;
var base64 = require("base64-js");
var Promise = require("bluebird");
var tslib_1 = require("tslib");
var LiveKeyClass = (function () {
    function LiveKeyClass(utils, key, bp) {
        this.utils = utils;
        this.key = key;
        this.bp = bp;
    }
    LiveKeyClass.prototype.armor = function () {
        var _this = this;
        return Promise.try(function () { return _this.key.armor(); });
    };
    LiveKeyClass.prototype.unlock = function (passphrase, opts) {
        var _this = this;
        return !this.bp.isLocked ? Promise.reject(new Error('key not locked'))
            : Promise.try(function () {
                var clone = _this.utils.cloneKey(_this.key);
                var unlocked = clone.decrypt(passphrase);
                return unlocked ? LiveKeyClass.getInstance(_this.utils, clone)
                    : Promise.reject(new Error('fail to unlock key'));
            });
    };
    LiveKeyClass.prototype.lock = function (passphrase, opts) {
        var _this = this;
        return this.bp.isLocked ? Promise.reject(new Error('key not unlocked'))
            : Promise.try(function () {
                _this.key.encrypt(passphrase);
                return LiveKeyClass.getInstance(_this.utils, _this.key);
            })
                .finally(function () { return delete _this.key; });
    };
    LiveKeyClass.prototype.sign = function (text, opts) {
        var _this = this;
        return Promise.try(function () {
            return _this.utils.openpgp.message.fromText(text).sign([_this.key]).armor();
        });
    };
    LiveKeyClass.prototype.verify = function (armor, opts) {
        var _this = this;
        return Promise.try(function () {
            var message = _this.utils.openpgp.message.readArmored(armor);
            var auth = message.verify([_this.key]);
            return !!auth.length && auth[0].valid && message.getText();
        });
    };
    LiveKeyClass.getInstance = function (utils, key, opts) {
        var bp = utils.getKeyBlueprint(key);
        return new LiveKeyClass(utils, key, bp);
    };
    return LiveKeyClass;
}());
LiveKeyClass.getFactory = function (config) {
    var utils = new OpenpgpKeyUtils(config.openpgp);
    return LiveKeyClass.getInstance.bind(LiveKeyClass, utils);
};
var OpenpgpKeyUtils = (function () {
    function OpenpgpKeyUtils(openpgp) {
        this.openpgp = openpgp;
    }
    OpenpgpKeyUtils.prototype.getKeyBlueprint = function (key) {
        var _this = this;
        var packets = key.getAllKeyPackets();
        var primary = this.getOpgpKeyId(key, packets[0]);
        var subkeys = packets.slice(1)
            .map(function (packet, index) { return _this.getOpgpKeyId(key, packet, index); });
        return {
            isLocked: isLocked(key),
            isPublic: key.isPublic(),
            keys: [primary].concat(subkeys),
            user: { ids: key.getUserIds() }
        };
    };
    OpenpgpKeyUtils.prototype.getHashes = function (packet) {
        return {
            hash: this.getFingerprintHash(packet),
            fingerprint: packet.getFingerprint()
        };
    };
    OpenpgpKeyUtils.prototype.getPrimaryKeyType = function (key) {
        var primary = this.cloneKey(key);
        primary.subKeys = null;
        return {
            isAuth: !!primary.getSigningKeyPacket(),
            isCiph: !!primary.getEncryptionKeyPacket()
        };
    };
    OpenpgpKeyUtils.prototype.getFingerprintHash = function (key, opts) {
        var packets = key.writeOld();
        var hash = this.openpgp.crypto.hash[opts && opts.hash || 'sha256'](packets);
        return base64.fromByteArray(hash);
    };
    OpenpgpKeyUtils.prototype.cloneKey = function (key) {
        return this.openpgp.key.readArmored(key.armor()).keys[0];
    };
    OpenpgpKeyUtils.prototype.getOpgpKeyId = function (key, packet, index) {
        return typeof index === 'undefined' ? this.getPrimaryOpgpKeyId(key, packet)
            : this.getSubkeyOpgpKeyId(key, packet, index);
    };
    OpenpgpKeyUtils.prototype.getPrimaryOpgpKeyId = function (key, packet) {
        return tslib_1.__assign(this.getHashes(packet), this.getPrimaryKeyType(key), {
            status: key.verifyPrimaryKey(),
            expires: getExpiry(key)
        });
    };
    OpenpgpKeyUtils.prototype.getSubkeyOpgpKeyId = function (key, packet, index) {
        var subkey = key.subKeys[index];
        return tslib_1.__assign(this.getHashes(packet), {
            isCiph: subkey.isValidEncryptionKey(key.primaryKey),
            isAuth: subkey.isValidSigningKey(key.primaryKey),
            status: subkey.verify(key.primaryKey),
            expires: getExpiry(subkey)
        });
    };
    return OpenpgpKeyUtils;
}());
function isLocked(key) {
    return !key.primaryKey.isDecrypted;
}
function getExpiry(key) {
    var expires = key.getExpirationTime();
    return expires ? expires.getTime() : Infinity;
}
var getLiveKeyFactory = LiveKeyClass.getFactory;
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = getLiveKeyFactory;

},{"base64-js":undefined,"bluebird":undefined,"tslib":undefined}],10:[function(require,module,exports){
"use strict";
;
var tslib_1 = require("tslib");
var getProxyKey = function (handle, blueprint) {
    var proxy = tslib_1.__assign({ handle: handle }, blueprint);
    proxy.keys = blueprint.keys.map(function (keyId) { return tslib_1.__assign({}, keyId); });
    proxy.user = { ids: blueprint.user.ids.slice() };
    return proxy;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = getProxyKey;

},{"tslib":undefined}],11:[function(require,module,exports){
"use strict";
;
function isString(val) {
    return typeof (val && val.valueOf()) === 'string';
}
exports.isString = isString;
function isNumber(val) {
    return typeof (val && val.valueOf()) === 'number';
}
exports.isNumber = isNumber;
function isBoolean(val) {
    return typeof (val && val.valueOf()) === 'boolean';
}
exports.isBoolean = isBoolean;
function isFunction(val) {
    return typeof val === 'function';
}
exports.isFunction = isFunction;

},{}]},{},[6,7]);
