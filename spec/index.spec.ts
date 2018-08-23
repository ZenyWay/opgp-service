/**
 * Copyright 2018 Stephane M. Catala
 * @author Stephane M. Catala
 * @license Apache@2.0
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *  http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * Limitations under the License.
 */
//
import getService from '../src'
import Promise = require('bluebird')

let cache: any
let getLiveKey: any
let getProxyKey: any
let openpgp: any // API from openpgp@3.1.2
let livekey: any
let types: any

beforeEach(() => { // mock dependencies
  cache = jasmine.createSpyObj('cache', [ 'set', 'del', 'get', 'has' ])
  getLiveKey = jasmine.createSpy('getLiveKey')
  getProxyKey = jasmine.createSpy('getProxyKey')
  openpgp = {
    config: {},
    crypto: { hash: jasmine.createSpyObj('hash', [ 'sha256' ]) },
    key: jasmine.createSpyObj('key', [ 'readArmored', 'generate' ]),
    message: jasmine.createSpyObj('message', [ 'fromText', 'readArmored' ]),
    encrypt: jasmine.createSpy('encrypt'),
    decrypt: jasmine.createSpy('decrypt')
  }
  livekey = {
    key: {},
    bp: { keys: [ { id: 'key-id' } ], user: { ids: [] } },
    armor: jasmine.createSpy('armor'),
    toPublicKey: jasmine.createSpy('toPublicKey'),
    lock: jasmine.createSpy('lock'),
    unlock: jasmine.createSpy('unlock')
  }
})

describe('default export: getOpgpService (config?: OpgpServiceFactoryConfig): ' +
'OpgpService', () => {
  let opgpService: any
  beforeEach(() => {
    const methods = [
      'configure', 'generateKey', 'getPublicKey', 'getKeysFromArmor',
      'getArmorFromKey', 'encrypt', 'decrypt', 'sign', 'verify'
    ]
    opgpService =
    jasmine.objectContaining(methods.reduce((methods: any, method) => {
      methods[method] = jasmine.any(Function)
      return methods
    }, {}))
  })

  describe('when called without arguments', () => {
    let service: any
    beforeEach(() => {
      service = getService()
    })

    it('returns an {OpgpService} instance', () => {
      expect(service).toEqual(opgpService)
    })
  })

  describe('when called with { cache?: CsrKeyCache<OpgpLiveKey>, ' +
  'getLiveKey?: LiveKeyFactory, getProxyKey?: ProxyKeyFactory, ' +
  'openpgp?: openpgp }', () => {
    let service: any
    beforeEach(() => {
      openpgp.key.readArmored.and.returnValue({ keys: [ livekey.key ] })
      getLiveKey.and.returnValue(Promise.resolve(livekey))
      cache.set.and.returnValue('key-handle')
    })

    beforeEach((done) => {
      service = getService({
        cache: cache,
        getLiveKey: getLiveKey,
        getProxyKey: getProxyKey,
        openpgp: openpgp
      })
      service.getKeysFromArmor('key-armor')
      .then(() => setTimeout(done))
      .catch(() => setTimeout(done.fail))
    })

    it('returns an {OpgpService} instance based on the given dependencies ', () => {
      expect(service).toEqual(opgpService)
      expect(openpgp.key.readArmored).toHaveBeenCalledWith('key-armor')
      expect(getLiveKey).toHaveBeenCalledWith(livekey.key)
      expect(cache.set).toHaveBeenCalledWith(livekey)
      expect(getProxyKey).toHaveBeenCalledWith('key-handle', livekey.bp)
    })
  })

  describe('when called with { openpgp?: config } ' +
  'where config is a valid configuration object for `openpgp.config`', () => {
    let error: any
    let result: any

    beforeEach((done) => {
      const service = getService({
        openpgp: { debug: true }
      })
      service.configure()
      .then((res: any) => result = res)
      .catch((err: any) => error = err)
      .finally(() => setTimeout(done))
    })

    it('returns an {OpgpService} instance based on an openpgp instance ' +
    'with the given configuration', () => {
      expect(error).not.toBeDefined()
      expect(result).toEqual(jasmine.objectContaining({ debug: true }))
    })
  })
})

describe('OpgpService', () => {
  let service: any
  beforeEach(() => {
    service = getService({
      cache: cache, // unit-tested separately
      getLiveKey: getLiveKey, // unit-tested separately
      // default getProxyKey
      openpgp: openpgp
    })
  })

  describe('configure (config?: Eventual<OpenpgpConfig>): Promise<OpenpgpConfig>', () => {
    let error: any
    let result: any
    beforeEach(() => {
      openpgp.config = {
        debug: false,
        use_native: false
      }
    })
    describe('when called without config argument', () => {
      beforeEach((done) => {
        service.configure()
        .then((res: any) => result = res)
        .catch((err: any) => error = err)
        .finally(() => setTimeout(done))
      })
      it('returns a Promise that resolves to the current openpgp configuration',
      () => {
        expect(error).not.toBeDefined()
        expect(result).toEqual(openpgp.config)
      })
    })
    describe('when called with an openpgp configuration object', () => {
      let config: any
      beforeEach(() => {
        config = {
          compression: 42, // number
          debug: true, // boolean, overwrite default
          versionstring: 'test-version', // string
          use_native: 'true', // known configuration key, wrong type
          foo: 'foo' // unknown configuration key
        }
      })
      beforeEach((done) => {
        service.configure(config)
        .then((res: any) => result = res)
        .catch((err: any) => error = err)
        .finally(() => setTimeout(done))
      })
      it('returns a Promise that resolves to the current openpgp configuration',
      () => {
        expect(error).not.toBeDefined()
        expect(result).toEqual({
          compression: 42,
          debug: true,
          use_native: false,
          versionstring: 'test-version'
        })
      })
    })
  })

  describe('getPublicKey (keyRef: Eventual<KeyRef>): Promise<OpgpProxyKey>', () => {
    describe('when given a valid private key handle string', () => {
      let error: any
      let result: any
      beforeEach(() => {
        cache.get.and.returnValue(livekey)
      })

      beforeEach((done) => {
        service.isValidKeyHandle(Promise.resolve('valid-key-handle'))
        .then((res: any) => result = res)
        .catch((err: any) => error = err)
        .finally(() => setTimeout(done))
      })

      it('retrieves the {OpgpLiveKey} instance referenced by the given handle',
      () => {
        expect(cache.get).toHaveBeenCalledWith('valid-key-handle')
      })

      it('returns a Promise that resolves to `true`', () => {
        expect(result).toBe(true)
        expect(error).not.toBeDefined()
      })
    })

    describe('when given a stale or invalid handle', () => {
      let error: any
      let result: any
      beforeEach(() => {
        cache.get.and.returnValue(undefined)
      })

      beforeEach((done) => {
        service.isValidKeyHandle('stale-key-handle')
        .then((res: any) => result = res)
        .catch((err: any) => error = err)
        .finally(() => setTimeout(done))
      })

      it('attempts to retrieve the {OpgpLiveKey} instance ' +
      'referenced by the given handle', () => {
        expect(cache.get).toHaveBeenCalledWith('stale-key-handle')
      })

      it('returns a Promise that resolves to `false`', () => {
        expect(result).toBe(false)
        expect(error).not.toBeDefined()
      })
    })
  })

  describe('generateKey (user: Eventual<UserId[]|UserId>, ' +
  'opts?: Eventual<OpgpKeyOpts)>: Promise<OpgpProxyKey>', () => {
    it('delegates to the openpgp primitive', (done) => {
      service.generateKey('john.doe@test.com', { passphrase: 'secret passphrase' })
      .catch(() => { /* no operation */ }) // ignore
      .finally(() => {
        expect(openpgp.key.generate).toHaveBeenCalledWith(jasmine.objectContaining({
          userIds: jasmine.arrayContaining([ 'john.doe@test.com' ]),
          passphrase: 'secret passphrase',
          numBits: 4096,
          unlocked: false
        }))
        setTimeout(done)
      })
    })

    describe('when the underlying openpgp primitive returns a newly generated key',
    () => {
      let error: any
      let result: any
      beforeEach(() => {
        openpgp.key.generate.and.returnValue(Promise.resolve(livekey.key))
        getLiveKey.and.returnValue(Promise.resolve(livekey))
        cache.set.and.returnValue('key-handle')
      })

      beforeEach((done) => {
        service.generateKey('john.doe@test.com')
        .then((res: any) => result = res)
        .catch((err: any) => error = err)
        .finally(() => setTimeout(done))
      })

      it('creates a new {OpgpLiveKey} instance from the new openpgp key', () => {
        expect(getLiveKey).toHaveBeenCalledWith(livekey.key)
      })

      it('stores the new {OpgpLiveKey} instance in the underlying cache', () => {
        expect(cache.set).toHaveBeenCalledWith(livekey)
      })

      it('returns a Promise that resolves to the new {OpgpProxyKey} instance',
      () => {
        expect(result).toEqual(jasmine.objectContaining({ handle: 'key-handle' }))
        expect(result).toEqual(jasmine.objectContaining(livekey.bp))
        expect(error).not.toBeDefined()
      })
    })

    describe('when the underlying openpgp primitive throws an error', () => {
      let error: any
      let result: any
      beforeEach(() => {
        openpgp.key.generate.and.throwError('boom')
      })

      beforeEach((done) => {
        service.generateKey('john.doe@test.com')
        .then((res: any) => result = res)
        .catch((err: any) => error = err)
        .finally(() => setTimeout(done))
      })

      it('returns a Promise that resolves to an {OpgpProxyKey} instance', () => {
        expect(error).toBeDefined()
        expect(error.message).toBe('boom')
        expect(result).not.toBeDefined()
      })
    })

    describe('OgpgKeyOpts', () => {
      // TODO
    })
  })

  describe('getPublicKey (keyRef: Eventual<KeyRef>): Promise<OpgpProxyKey>', () => {
    let publickey: any
    beforeEach(() => {
      publickey = {
        key: {},
        bp: { isPublic: true, keys: [ { id: 'key-id' } ], user: { ids: [] } }
      }
    })
    describe('when given a valid private key handle string', () => {
      let error: any
      let result: any
      beforeEach(() => {
        cache.get.and.returnValue(livekey)
        cache.set.and.returnValue('public-key-handle')
        livekey.toPublicKey.and.returnValue(Promise.resolve(publickey))
      })

      beforeEach((done) => {
        service.getPublicKey(Promise.resolve('valid-private-key-handle'))
        .then((res: any) => result = res)
        .catch((err: any) => error = err)
        .finally(() => setTimeout(done))
      })

      it('retrieves the {OpgpLiveKey} instance referenced by the given handle',
      () => {
        expect(cache.get).toHaveBeenCalledWith('valid-private-key-handle')
      })

      it('delegates to the retrieved {OpgpLiveKey} instance', () => {
        expect(livekey.toPublicKey).toHaveBeenCalledWith()
      })

      it('stores the new public {OpgpLiveKey} instance in the underlying cache',
      () => {
        expect(cache.set).toHaveBeenCalledWith(publickey)
      })

      it('returns a Promise that resolves to a {OpgpProxyKey} instance ' +
      'of the public component of the referenced {OpgpLiveKey} instance', () => {
        expect(result).toEqual(jasmine.objectContaining({ handle: 'public-key-handle' }))
        expect(result).toEqual(jasmine.objectContaining(livekey.bp))
        expect(error).not.toBeDefined()
      })
    })

    describe('when given a valid public key handle string', () => {
      let error: any
      let result: any
      beforeEach(() => {
        cache.get.and.returnValue(publickey)
      })

      beforeEach((done) => {
        service.getPublicKey(Promise.resolve('valid-private-key-handle'))
        .then((res: any) => result = res)
        .catch((err: any) => error = err)
        .finally(() => setTimeout(done))
      })

      it('retrieves the {OpgpLiveKey} instance referenced by the given handle',
      () => {
        expect(cache.get).toHaveBeenCalledWith('valid-private-key-handle')
      })

      it('does not delegate to the retrieved {OpgpLiveKey} instance', () => {
        expect(livekey.toPublicKey).not.toHaveBeenCalled()
      })

      it('returns a Promise that resolves to ' +
      'the referenced {OpgpLiveKey} instance', () => {
        expect(result).toEqual(jasmine.objectContaining({ handle: 'valid-private-key-handle' }))
        expect(result).toEqual(jasmine.objectContaining(publickey.bp))
        expect(error).not.toBeDefined()
      })
    })

    describe('when given a stale or invalid handle', () => {
      let error: any
      let result: any
      beforeEach(() => {
        cache.get.and.returnValue(undefined)
      })

      beforeEach((done) => {
        service.getPublicKey('stale-key-handle')
        .then((res: any) => result = res)
        .catch((err: any) => error = err)
        .finally(() => setTimeout(done))
      })

      it('attempts to retrieve the {OpgpLiveKey} instance ' +
      'referenced by the given handle', () => {
        expect(cache.get).toHaveBeenCalledWith('stale-key-handle')
      })

      it('returns a Promise that rejects ' +
      'with an `invalid key reference: not a string or stale` {Error}', () => {
        expect(result).not.toBeDefined()
        expect(error).toEqual(jasmine.any(Error))
        expect(error.message).toBe('invalid key reference: not a string or stale')
      })
    })

    describe('when the {OpgpLiveKey#toPublicKey} method rejects with an {Error}', () => {
      let error: any
      let result: any
      beforeEach(() => {
        cache.get.and.returnValue(livekey)
        livekey.toPublicKey.and.returnValue(Promise.reject(new Error('boom')))
      })

      beforeEach((done) => {
        service.getPublicKey('valid-key-handle')
        .then((res: any) => result = res)
        .catch((err: any) => error = err)
        .finally(() => setTimeout(done))
      })

      it('retrieves the {OpgpLiveKey} instance referenced by the given handle',
      () => {
        expect(cache.get).toHaveBeenCalledWith('valid-key-handle')
      })

      it('delegates to the retrieved {OpgpLiveKey} instance', () => {
        expect(livekey.toPublicKey).toHaveBeenCalledWith()
      })

      it('returns a Promise that rejects with the {Error} ' +
      'from the {OpgpLiveKey#armor} method', () => {
        expect(result).not.toBeDefined()
        expect(error).toEqual(jasmine.any(Error))
        expect(error.message).toBe('boom')
      })
    })
  })

  describe('getKeysFromArmor (armor: Eventual<string>, opts?: Eventual<OpgpKeyringOpts>)' +
  ': Promise<OpgpProxyKey[]|OpgpProxyKey>', () => {

    it('delegates to the openpgp primitive', (done) => {
      service.getKeysFromArmor('key-armor')
      .catch(() => { /* no operation */ }) // ignore
      .finally(() => {
        expect(openpgp.key.readArmored).toHaveBeenCalledWith('key-armor')
        setTimeout(done)
      })
    })

    describe('when the underlying openpgp primitive returns a single key', () => {
      let error: any
      let result: any
      beforeEach(() => {
        openpgp.key.readArmored.and.returnValue({ keys: [ livekey.key ] })
        getLiveKey.and.returnValue(Promise.resolve(livekey))
        cache.set.and.returnValue('key-handle')
      })

      beforeEach((done) => {
        service.getKeysFromArmor('key-armor')
        .then((res: any) => result = res)
        .catch((err: any) => error = err)
        .finally(() => setTimeout(done))
      })

      it('creates a new {OpgpLiveKey} instance from the openpgp key', () => {
        expect(getLiveKey).toHaveBeenCalledWith(livekey.key)
      })

      it('stores the new {OpgpLiveKey} instance in the underlying cache', () => {
        expect(cache.set).toHaveBeenCalledWith(livekey)
      })

      it('returns a Promise that resolves to a corresponding {OpgpProxyKey} instance',
      () => {
        expect(result).toEqual(jasmine.objectContaining({ handle: 'key-handle' }))
        expect(result).toEqual(jasmine.objectContaining(livekey.bp))
        expect(error).not.toBeDefined()
      })
    })

    describe('when the underlying openpgp primitive returns multiple keys', () => {
      let error: any
      let result: any
      beforeEach(() => {
        openpgp.key.readArmored.and.returnValue({ keys: [ livekey.key, livekey.key ] })
        getLiveKey.and.returnValue(Promise.resolve(livekey))
        cache.set.and.returnValue('key-handle') // would normally return unique values for each stored key
      })

      beforeEach((done) => {
        service.getKeysFromArmor('keys-armor')
        .then((res: any) => result = res)
        .catch((err: any) => error = err)
        .finally(() => setTimeout(done))
      })

      it('creates new {OpgpLiveKey} instances from each openpgp key', () => {
        expect(getLiveKey.calls.allArgs())
        .toEqual([ [ livekey.key ], [ livekey.key ] ])
      })

      it('stores the new {OpgpLiveKey} instances in the underlying cache', () => {
        expect(cache.set.calls.allArgs()).toEqual([ [ livekey ], [ livekey ] ])
      })

      it('returns a Promise that resolves to corresponding {OpgpProxyKey} instances',
      () => {
        expect(result).toEqual(jasmine.any(Array))
        expect(result.length).toBe(2)
        result.forEach((res: any) => {
          expect(res).toEqual(jasmine.objectContaining({ handle: 'key-handle' }))
          expect(res).toEqual(jasmine.objectContaining(livekey.bp))
        })
        expect(error).not.toBeDefined()
      })
    })

    describe('when the underlying openpgp primitive throws an error', () => {
      let error: any
      let result: any
      beforeEach(() => {
        openpgp.key.readArmored.and.throwError('boom')
      })

      beforeEach((done) => {
        service.getKeysFromArmor('key-armor')
        .then((res: any) => result = res)
        .catch((err: any) => error = err)
        .finally(() => setTimeout(done))
      })

      it('returns a Promise that rejects with the thrown error', () => {
        expect(error).toBeDefined()
        expect(error.message).toBe('boom')
        expect(result).not.toBeDefined()
      })
    })
  })

  describe('getArmorFromKey (keyRef: Eventual<KeyRef>): Promise<string>', () => {
    describe('when given a valid key handle string', () => {
      let error: any
      let result: any
      beforeEach(() => {
        cache.get.and.returnValue(livekey)
        livekey.armor.and.returnValue('armor')
      })

      beforeEach((done) => {
        service.getArmorFromKey(Promise.resolve('valid-key-handle'))
        .then((res: any) => result = res)
        .catch((err: any) => error = err)
        .finally(() => setTimeout(done))
      })

      it('retrieves the {OpgpLiveKey} instance referenced by the given handle',
      () => {
        expect(cache.get).toHaveBeenCalledWith('valid-key-handle')
      })

      it('delegates to the retrieved {OpgpLiveKey} instance', () => {
        expect(livekey.armor).toHaveBeenCalledWith()
      })

      it('returns a Promise that resolves to an armored {string} representation ' +
      'of the referenced {OpgpLiveKey} instance', () => {
        expect(result).toEqual('armor')
        expect(error).not.toBeDefined()
      })
    })

    describe('when given a stale or invalid handle', () => {
      let error: any
      let result: any
      beforeEach(() => {
        cache.get.and.returnValue(undefined)
      })

      beforeEach((done) => {
        service.getArmorFromKey('stale-key-handle')
        .then((res: any) => result = res)
        .catch((err: any) => error = err)
        .finally(() => setTimeout(done))
      })

      it('attempts to retrieve the {OpgpLiveKey} instance ' +
      'referenced by the given handle', () => {
        expect(cache.get).toHaveBeenCalledWith('stale-key-handle')
      })

      it('returns a Promise that rejects ' +
      'with an `invalid key reference: not a string or stale` {Error}', () => {
        expect(result).not.toBeDefined()
        expect(error).toEqual(jasmine.any(Error))
        expect(error.message).toBe('invalid key reference: not a string or stale')
      })
    })

    describe('when the {OpgpLiveKey#armor} method rejects with an {Error}', () => {
      let error: any
      let result: any
      beforeEach(() => {
        cache.get.and.returnValue(livekey)
        livekey.armor.and.returnValue(Promise.reject(new Error('boom')))
      })

      beforeEach((done) => {
        service.getArmorFromKey('valid-key-handle')
        .then((res: any) => result = res)
        .catch((err: any) => error = err)
        .finally(() => setTimeout(done))
      })

      it('retrieves the {OpgpLiveKey} instance referenced by the given handle',
      () => {
        expect(cache.get).toHaveBeenCalledWith('valid-key-handle')
      })

      it('delegates to the retrieved {OpgpLiveKey} instance', () => {
        expect(livekey.armor).toHaveBeenCalledWith()
      })

      it('returns a Promise that rejects with the {Error} ' +
      'from the {OpgpLiveKey#armor} method', () => {
        expect(result).not.toBeDefined()
        expect(error).toEqual(jasmine.any(Error))
        expect(error.message).toBe('boom')
      })
    })
  })

  describe('unlock (keyRef: Eventual<KeyRef>, passphrase: Eventual<string>, ' +
  'opts?: Eventual<UnlockOpts>): Promise<OpgpProxyKey>', () => {
    describe('when given a valid handle string of a locked key ' +
    'and the correct passphrase', () => {
      let unlockedLiveKey: any
      let error: any
      let result: any
      beforeEach(() => {
        livekey.bp.isLocked = true
        unlockedLiveKey = {
          key: {},
          bp: { isLocked: false, keys: [ { id: 'key-id' } ], user: { ids: [] } }
        }

        cache.get.and.returnValue(livekey)
        livekey.unlock.and.returnValue(Promise.resolve(unlockedLiveKey))
        cache.set.and.returnValue('unlocked-key-handle')
      })

      beforeEach((done) => {
        service.unlock(Promise.resolve('valid-key-handle'), 'secret passphrase')
        .then((res: any) => result = res)
        .catch((err: any) => error = err)
        .finally(() => setTimeout(done))
      })

      it('retrieves the {OpgpLiveKey} instance referenced by the given handle',
      () => {
        expect(cache.get).toHaveBeenCalledWith('valid-key-handle')
      })

      it('delegates to the retrieved {OpgpLiveKey} instance', () => {
        expect(livekey.unlock).toHaveBeenCalledWith('secret passphrase')
      })

      it('stores the unlocked key in the underlying cache', () => {
        expect(cache.set).toHaveBeenCalledWith(unlockedLiveKey)
      })

      it('returns a Promise that resolves to an {OpgpProxyKey} instance ' +
      'of the unlocked {OpgpLiveKey} instance', () => {
        expect(result).toEqual(jasmine.objectContaining({ handle: 'unlocked-key-handle' }))
        expect(result).toEqual(jasmine.objectContaining(unlockedLiveKey.bp))
        expect(error).not.toBeDefined()
      })
    })

    describe('when the referenced {OpgpLiveKey} instance is already unlocked',
    () => {
      let error: any
      let result: any
      beforeEach(() => {
        livekey.bp.isLocked = false
        cache.get.and.returnValue(livekey)
        livekey.unlock.and.returnValue(Promise.reject(new Error('key not locked')))
      })

      beforeEach((done) => {
        service.unlock('unlocked-key-handle', 'passphrase')
        .then((res: any) => result = res)
        .catch((err: any) => error = err)
        .finally(() => setTimeout(done))
      })

      it('retrieves the {OpgpLiveKey} instance referenced by the given handle',
      () => {
        expect(cache.get).toHaveBeenCalledWith('unlocked-key-handle')
      })

      it('delegates to the retrieved {OpgpLiveKey} instance', () => {
        expect(livekey.unlock).toHaveBeenCalledWith('passphrase')
      })

      it('returns a Promise that rejects with a `key not locked` {Error} ' +
      'from the {OpgpLiveKey#unlock} method', () => {
        expect(result).not.toBeDefined()
        expect(error).toEqual(jasmine.any(Error))
        expect(error.message).toBe('key not locked')
      })
    })

    describe('when given a stale or invalid handle', () => {
      let error: any
      let result: any
      beforeEach(() => {
        cache.get.and.returnValue(undefined)
      })

      beforeEach((done) => {
        service.unlock('stale-key-handle', 'passphrase')
        .then((res: any) => result = res)
        .catch((err: any) => error = err)
        .finally(() => setTimeout(done))
      })

      it('attempts to retrieve the {OpgpLiveKey} instance ' +
      'referenced by the given handle', () => {
        expect(cache.get).toHaveBeenCalledWith('stale-key-handle')
      })

      it('returns a Promise that rejects ' +
      'with an `invalid key reference: not a string or stale` {Error}', () => {
        expect(result).not.toBeDefined()
        expect(error).toEqual(jasmine.any(Error))
        expect(error.message).toBe('invalid key reference: not a string or stale')
      })
    })

    describe('when given an incorrect passphrase', () => {
      let error: any
      let result: any
      beforeEach(() => {
        livekey.bp.isLocked = true
        cache.get.and.returnValue(livekey)
        livekey.unlock
        .and.returnValue(Promise.reject(new Error('fail to unlock key')))
      })

      beforeEach((done) => {
        service.unlock('valid-key-handle', 'incorrect passphrase')
        .then((res: any) => result = res)
        .catch((err: any) => error = err)
        .finally(() => setTimeout(done))
      })

      it('retrieves the {OpgpLiveKey} instance referenced by the given handle',
      () => {
        expect(cache.get).toHaveBeenCalledWith('valid-key-handle')
      })

      it('delegates to the retrieved {OpgpLiveKey} instance', () => {
        expect(livekey.unlock).toHaveBeenCalledWith('incorrect passphrase')
      })

      it('returns a Promise that rejects with a `fail to unlock key` {Error} ' +
      'from the {OpgpLiveKey#unlock} method', () => {
        expect(result).not.toBeDefined()
        expect(error).toEqual(jasmine.any(Error))
        expect(error.message).toBe('fail to unlock key')
      })
    })

    describe('when the {OpgpLiveKey#unlock} method rejects with an {Error}', () => {
      let error: any
      let result: any
      beforeEach(() => {
        livekey.bp.isLocked = true
        cache.get.and.returnValue(livekey)
        livekey.unlock.and.returnValue(Promise.reject(new Error('boom')))
      })

      beforeEach((done) => {
        service.unlock('valid-key-handle', 'passphrase')
        .then((res: any) => result = res)
        .catch((err: any) => error = err)
        .finally(() => setTimeout(done))
      })

      it('retrieves the {OpgpLiveKey} instance referenced by the given handle',
      () => {
        expect(cache.get).toHaveBeenCalledWith('valid-key-handle')
      })

      it('delegates to the retrieved {OpgpLiveKey} instance', () => {
        expect(livekey.unlock).toHaveBeenCalledWith('passphrase')
      })

      it('returns a Promise that rejects with the {Error} ' +
      'from the {OpgpLiveKey#unlock} method', () => {
        expect(result).not.toBeDefined()
        expect(error).toEqual(jasmine.any(Error))
        expect(error.message).toBe('boom')
      })
    })
  })

  describe('lock (keyRef: Eventual<KeyRef>, passphrase: Eventual<string>, ' +
  'opts?: Eventual<UnlockOpts>): Promise<OpgpProxyKey>', () => {
    describe('when given a valid handle string of an unlocked key '
    + 'and a passphrase string', () => {
      let lockedLiveKey: any
      let error: any
      let result: any
      beforeEach(() => {
        livekey.bp.isLocked = false
        lockedLiveKey = {
          key: {},
          bp: { isLocked: true, keys: [ { id: 'key-id' } ], user: { ids: [] } }
        }

        cache.get.and.returnValue(livekey)
        livekey.lock.and.returnValue(Promise.resolve(lockedLiveKey))
        cache.set.and.returnValue('locked-key-handle')
      })

      beforeEach((done) => {
        service.lock(Promise.resolve('unlocked-key-handle'), 'secret passphrase')
        .then((res: any) => result = res)
        .catch((err: any) => error = err)
        .finally(() => setTimeout(done))
      })

      it('retrieves the {OpgpLiveKey} instance referenced by the given handle',
      () => {
        expect(cache.get).toHaveBeenCalledWith('unlocked-key-handle')
      })

      it('invalidates the original {OpgpLiveKey} from the cache', () => {
        expect(cache.del).toHaveBeenCalledWith('unlocked-key-handle')
      })

      it('delegates to the retrieved {OpgpLiveKey} instance', () => {
        expect(livekey.lock).toHaveBeenCalledWith('secret passphrase')
      })

      it('stores the unlocked key in the underlying cache', () => {
        expect(cache.set).toHaveBeenCalledWith(lockedLiveKey)
      })

      it('returns a Promise that resolves to an {OpgpProxyKey} instance ' +
      'of the locked {OpgpLiveKey} instance', () => {
        expect(result).toEqual(jasmine.objectContaining({ handle: 'locked-key-handle' }))
        expect(result).toEqual(jasmine.objectContaining(lockedLiveKey.bp))
        expect(error).not.toBeDefined()
      })
    })

    describe('when the referenced {OpgpLiveKey} instance is already locked',
    () => {
      let error: any
      let result: any
      beforeEach(() => {
        livekey.bp.isLocked = true
        cache.get.and.returnValue(livekey)
      })

      beforeEach((done) => {
        service.lock('locked-key-handle', 'passphrase')
        .then((res: any) => result = res)
        .catch((err: any) => error = err)
        .finally(() => setTimeout(done))
      })

      it('retrieves the {OpgpLiveKey} instance referenced by the given handle',
      () => {
        expect(cache.get).toHaveBeenCalledWith('locked-key-handle')
      })

      it('does not invalidate the original {OpgpLiveKey} from the cache', () => {
        expect(cache.del).not.toHaveBeenCalled()
      })

      it('does notdelegate to the retrieved {OpgpLiveKey} instance', () => {
        expect(livekey.lock).not.toHaveBeenCalled()
      })

      it('returns a Promise that rejects with a `key not unlocked` {Error} ' +
      'from the {OpgpLiveKey#lock} method', () => {
        expect(result).not.toBeDefined()
        expect(error).toEqual(jasmine.any(Error))
        expect(error.message).toBe('key not unlocked')
      })
    })

    describe('when given a stale or invalid handle', () => {
      let error: any
      let result: any
      beforeEach(() => {
        cache.get.and.returnValue(undefined)
      })

      beforeEach((done) => {
        service.lock('stale-key-handle', 'secret passphrase')
        .then((res: any) => result = res)
        .catch((err: any) => error = err)
        .finally(() => setTimeout(done))
      })

      it('attempts to retrieve the {OpgpLiveKey} instance ' +
      'referenced by the given handle', () => {
        expect(cache.get).toHaveBeenCalledWith('stale-key-handle')
      })

      it('returns a Promise that rejects ' +
      'with an `invalid key reference: not a string or stale` {Error}', () => {
        expect(result).not.toBeDefined()
        expect(error).toEqual(jasmine.any(Error))
        expect(error.message).toBe('invalid key reference: not a string or stale')
      })
    })

    describe('when the {OpgpLiveKey#lock} method rejects with an {Error}', () => {
      let error: any
      let result: any
      beforeEach(() => {
        cache.get.and.returnValue(livekey)
        livekey.lock.and.returnValue(Promise.reject(new Error('boom')))
      })

      beforeEach((done) => {
        service.lock('valid-key-handle', 'passphrase')
        .then((res: any) => result = res)
        .catch((err: any) => error = err)
        .finally(() => setTimeout(done))
      })

      it('retrieves the {OpgpLiveKey} instance referenced by the given handle',
      () => {
        expect(cache.get).toHaveBeenCalledWith('valid-key-handle')
      })

      it('invalidates the original {OpgpLiveKey} from the cache', () => {
        expect(cache.del).toHaveBeenCalledWith('valid-key-handle')
      })

      it('delegates to the retrieved {OpgpLiveKey} instance', () => {
        expect(livekey.lock).toHaveBeenCalledWith('passphrase')
      })

      it('returns a Promise that rejects with the {Error} ' +
      'from the {OpgpLiveKey#lock} method', () => {
        expect(result).not.toBeDefined()
        expect(error).toEqual(jasmine.any(Error))
        expect(error.message).toBe('boom')
      })
    })
  })

  describe('encrypt (keyRefs: Eventual<KeyRefMap>, plain: Eventual<string>, ' +
  'opts?: Eventual<EncryptOpts>): Promise<string>', () => {
    describe('when given a valid plain text string, and valid handles of valid ' +
    'public cipher and private authentication keys', () => {
      let error: any
      let result: any
      beforeEach(() => {
        livekey.bp.isLocked = false
        cache.get.and.returnValue(livekey)
        openpgp.encrypt.and.returnValue({ data: 'cipher text' })
      })

      beforeEach((done) => {
        const refs = {
          cipher: 'valid-cipher-key-handle',
          auth: 'valid-auth-key-handle'
        }
        service.encrypt(Promise.resolve(refs), 'plain text')
        .then((res: any) => result = res)
        .catch((err: any) => error = err)
        .finally(() => setTimeout(done))
      })

      it('retrieves the {OpgpLiveKey} instances ' +
      'referenced by the given handles when compliant', () => {
        expect(cache.get.calls.allArgs()).toEqual([
          [ 'valid-auth-key-handle' ],
          [ 'valid-cipher-key-handle' ]
        ])
      })

      it('delegates to the openpgp primitive', () => {
        expect(openpgp.encrypt)
        .toHaveBeenCalledWith(jasmine.objectContaining({
          data: 'plain text',
          publicKeys: [ livekey.key ],
          privateKeys: [ livekey.key ]
        }))
      })

      it('returns a Promise that resolves to an armor string ' +
      'of the given text string ' +
      'encrypted with the referenced cipher {OpgpLiveKey} instances and ' +
      'signed with the referenced authentication {OpgpLiveKey} instances ', () => {
        expect(result).toBe('cipher text')
        expect(error).not.toBeDefined()
      })
    })

    describe('when given a valid plain text string and a stale handle string',
    () => {
      let error: any
      let result: any
      beforeEach(() => {
        cache.get.and.returnValue(undefined)
      })

      beforeEach((done) => {
        const refs = {
          cipher: 'stale-key-handle',
          auth: 'stale-key-handle'
        }
        service.encrypt(refs, 'plain text')
        .then((res: any) => result = res)
        .catch((err: any) => error = err)
        .finally(() => setTimeout(done))
      })

      it('attempts to retrieve the {OpgpLiveKey} instance ' +
      'referenced by the given handle', () => {
        expect(cache.get).toHaveBeenCalledWith('stale-key-handle')
      })

      it('does not delegate to the openpgp primitive', () => {
        expect(openpgp.encrypt).not.toHaveBeenCalled()
      })

      it('returns a Promise that rejects ' +
      'with an `invalid key reference: not a string or stale` {Error}', () => {
        expect(result).not.toBeDefined()
        expect(error).toBeDefined()
        expect(error.message).toBe('invalid key reference: not a string or stale')
      })
    })

    describe('when given a valid plain text string, ' +
    'and a valid handle string of a locked private key', () => {
      let error: any
      let result: any
      beforeEach(() => {
        livekey.bp.isLocked = true
        cache.get.and.returnValue(livekey)
      })

      beforeEach((done) => {
        const refs = {
          cipher: 'cipher-key-handle',
          auth: 'locked-auth-key-handle'
        }
        service.encrypt(refs, 'plain text')
        .then((res: any) => result = res)
        .catch((err: any) => error = err)
        .finally(() => setTimeout(done))
      })

      it('attempts to retrieve the {OpgpLiveKey} instance ' +
      'referenced by the given handle', () => {
        expect(cache.get).toHaveBeenCalledWith('locked-auth-key-handle')
      })

      it('does not delegate to the openpgp primitive', () => {
        expect(openpgp.encrypt).not.toHaveBeenCalled()
      })

      it('returns a Promise that rejects ' +
      'with an `private key not unlocked` {Error}', () => {
        expect(result).not.toBeDefined()
        expect(error).toBeDefined()
        expect(error.message).toBe('private key not unlocked')
      })
    })

    describe('when the underlying openpgp primitive rejects with an {Error}', () => {
      let error: any
      let result: any
      beforeEach(() => {
        livekey.bp.isLocked = false
        cache.get.and.returnValue(livekey)
        openpgp.encrypt.and.returnValue(Promise.reject(new Error('boom')))
      })

      beforeEach((done) => {
        const refs = {
          cipher: 'valid-cipher-key-handle',
          auth: 'valid-auth-key-handle'
        }
        service.encrypt(refs, 'plain text')
        .then((res: any) => result = res)
        .catch((err: any) => error = err)
        .finally(() => setTimeout(done))
      })

      it('retrieves the {OpgpLiveKey} instances ' +
      'referenced by the given handles when compliant', () => {
        expect(cache.get.calls.allArgs()).toEqual([
          [ 'valid-auth-key-handle' ],
          [ 'valid-cipher-key-handle' ]
        ])
      })

      it('delegates to the openpgp primitive', () => {
        expect(openpgp.encrypt)
        .toHaveBeenCalledWith(jasmine.objectContaining({
          data: 'plain text',
          publicKeys: [ livekey.key ],
          privateKeys: [ livekey.key ]
        }))
      })

      it('returns a Promise that rejects with the {Error} ' +
      'from the openpgp primitive', () => {
        expect(result).not.toBeDefined()
        expect(error).toEqual(jasmine.any(Error))
        expect(error.message).toBe('boom')
      })
    })
  })

  describe('decrypt (keyRefs: Eventual<KeyRefMap>, cipher: Eventual<string>, ' +
  'opts?: Eventual<DecryptOpts>): Promise<string>', () => {
    let message: any
    beforeEach(() => {
      message = {}
    })

    describe('when given a valid cipher text string, and valid handles of valid ' +
    'public authentication and a private cipher key', () => {
      let error: any
      let result: any
      beforeEach(() => {
        livekey.bp.isLocked = false
        cache.get.and.returnValue(livekey)
        openpgp.message.readArmored.and.returnValue(message)
        openpgp.decrypt.and.returnValue({ data: 'plain text' })
      })

      beforeEach((done) => {
        const refs = {
          cipher: 'valid-cipher-key-handle',
          auth: 'valid-auth-key-handle'
        }
        service.decrypt(Promise.resolve(refs), 'cipher text')
        .then((res: any) => result = res)
        .catch((err: any) => error = err)
        .finally(() => setTimeout(done))
      })

      it('retrieves the {OpgpLiveKey} instances ' +
      'referenced by the given handles when compliant', () => {
        expect(cache.get.calls.allArgs()).toEqual([
          [ 'valid-cipher-key-handle' ],
          [ 'valid-auth-key-handle' ]
        ])
      })

      it('delegates to the openpgp primitive', () => {
        expect(openpgp.message.readArmored).toHaveBeenCalledWith('cipher text')
        expect(openpgp.decrypt)
        .toHaveBeenCalledWith(jasmine.objectContaining({
          message: message,
          publicKeys: [ livekey.key ],
          privateKeys: livekey.key
        }))
      })

      it('returns a Promise that resolves to an armor string ' +
      'of the given text string ' +
      'decrypted with the referenced cipher {OpgpLiveKey} instance and ' +
      'authenticated with the referenced authentication {OpgpLiveKey} instances ',
      () => {
        expect(result).toBe('plain text')
        expect(error).not.toBeDefined()
      })
    })

    describe('when given a valid plain text string and a stale handle string',
    () => {
      let error: any
      let result: any
      beforeEach(() => {
        cache.get.and.returnValue(undefined)
      })

      beforeEach((done) => {
        const refs = {
          cipher: 'stale-key-handle',
          auth: 'stale-key-handle'
        }
        service.decrypt(refs, 'cipher text')
        .then((res: any) => result = res)
        .catch((err: any) => error = err)
        .finally(() => setTimeout(done))
      })

      it('attempts to retrieve the {OpgpLiveKey} instance ' +
      'referenced by the given handle', () => {
        expect(cache.get).toHaveBeenCalledWith('stale-key-handle')
      })

      it('does not delegate to the openpgp primitive', () => {
        expect(openpgp.message.readArmored).not.toHaveBeenCalled()
        expect(openpgp.decrypt).not.toHaveBeenCalled()
      })

      it('returns a Promise that rejects ' +
      'with an `invalid key reference: not a string or stale` {Error}', () => {
        expect(result).not.toBeDefined()
        expect(error).toBeDefined()
        expect(error.message).toBe('invalid key reference: not a string or stale')
      })
    })

    describe('when given a valid plain text string, ' +
    'and a valid handle string of a locked private key', () => {
      let error: any
      let result: any
      beforeEach(() => {
        livekey.bp.isLocked = true
        cache.get.and.returnValue(livekey)
      })

      beforeEach((done) => {
        const refs = {
          cipher: 'locked-cipher-key-handle',
          auth: 'auth-key-handle'
        }
        service.decrypt(refs, 'cipher text')
        .then((res: any) => result = res)
        .catch((err: any) => error = err)
        .finally(() => setTimeout(done))
      })

      it('attempts to retrieve the {OpgpLiveKey} instance ' +
      'referenced by the given handle', () => {
        expect(cache.get).toHaveBeenCalledWith('locked-cipher-key-handle')
      })

      it('does not delegate to the openpgp primitive', () => {
        expect(openpgp.message.readArmored).not.toHaveBeenCalled()
        expect(openpgp.decrypt).not.toHaveBeenCalled()
      })

      it('returns a Promise that rejects ' +
      'with an `private key not unlocked` {Error}', () => {
        expect(result).not.toBeDefined()
        expect(error).toBeDefined()
        expect(error.message).toBe('private key not unlocked')
      })
    })

    describe('when the underlying openpgp primitive rejects with an {Error}', () => {
      let error: any
      let result: any
      beforeEach(() => {
        livekey.bp.isLocked = false
        cache.get.and.returnValue(livekey)
        openpgp.message.readArmored.and.returnValue(message)
        openpgp.decrypt.and.returnValue(Promise.reject(new Error('boom')))
      })

      beforeEach((done) => {
        const refs = {
          cipher: 'valid-cipher-key-handle',
          auth: 'valid-auth-key-handle'
        }
        service.decrypt(refs, 'cipher text')
        .then((res: any) => result = res)
        .catch((err: any) => error = err)
        .finally(() => setTimeout(done))
      })

      it('retrieves the {OpgpLiveKey} instances ' +
      'referenced by the given handles when compliant', () => {
        expect(cache.get.calls.allArgs()).toEqual([
          [ 'valid-cipher-key-handle' ],
          [ 'valid-auth-key-handle' ]
        ])
      })

      it('delegates to the openpgp primitive', () => {
        expect(openpgp.message.readArmored).toHaveBeenCalledWith('cipher text')
        expect(openpgp.decrypt)
        .toHaveBeenCalledWith(jasmine.objectContaining({
          message: message,
          publicKeys: [ livekey.key ],
          privateKeys: livekey.key
        }))
      })

      it('returns a Promise that rejects with the {Error} ' +
      'from the openpgp primitive', () => {
        expect(result).not.toBeDefined()
        expect(error).toEqual(jasmine.any(Error))
        expect(error.message).toBe('boom')
      })
    })
  })

  describe('sign (keyRefs: Eventual<KeyRef[]|KeyRef>, text: Eventual<string>, ' +
  'opts?: Eventual<SignOpts>): Promise<string>', () => {
    let message: any
    beforeEach(() => {
      message = jasmine.createSpyObj('message', [ 'sign', 'armor' ])
    })

    describe('when given a text string and a valid handle string that is not stale',
    () => {
      let error: any
      let result: any
      beforeEach(() => {
        cache.get.and.returnValue(livekey)
        openpgp.message.fromText.and.returnValue(message)
        message.sign.and.returnValue(Promise.resolve(message))
        message.armor.and.returnValue('signed-armor-text')
      })

      beforeEach((done) => {
        service.sign(Promise.resolve('valid-key-handle'), 'plain text')
        .then((res: any) => result = res)
        .catch((err: any) => error = err)
        .finally(() => setTimeout(done))
      })

      it('retrieves the {OpgpLiveKey} instance referenced by the given handle',
      () => {
        expect(cache.get).toHaveBeenCalledWith('valid-key-handle')
      })

      it('delegates to the openpgp primitive', () => {
        expect(openpgp.message.fromText).toHaveBeenCalledWith('plain text')
        expect(message.sign).toHaveBeenCalledWith([ livekey.key ])
        expect(message.armor).toHaveBeenCalledWith()
      })

      it('returns a Promise that resolves to an armor string ' +
      'of the given text string ' +
      'signed with the referenced {OpgpLiveKey} instance ', () => {
        expect(result).toBe('signed-armor-text')
        expect(error).not.toBeDefined()
      })
    })

    describe('when given a text string and a stale handle string',
    () => {
      let error: any
      let result: any
      beforeEach(() => {
        cache.get.and.returnValue(undefined)
      })

      beforeEach((done) => {
        service.sign('stale-key-handle', 'plain text')
        .then((res: any) => result = res)
        .catch((err: any) => error = err)
        .finally(() => setTimeout(done))
      })

      it('attempts to retrieve the {OpgpLiveKey} instance ' +
      'referenced by the given handle', () => {
        expect(cache.get).toHaveBeenCalledWith('stale-key-handle')
      })

      it('does not delegate to the openpgp primitive', () => {
        expect(openpgp.message.fromText).not.toHaveBeenCalled()
      })

      it('returns a Promise that rejects ' +
      'with an `invalid key reference: not a string or stale` {Error}', () => {
        expect(result).not.toBeDefined()
        expect(error).toBeDefined()
        expect(error.message).toBe('invalid key reference: not a string or stale')
      })
    })

    describe('when given non-compliant arguments', () => {
      let error: any
      let result: any
      beforeEach(() => {
        cache.get.and.returnValue(livekey)
      })

      beforeEach((done) => {
        const args = getInvalidAuthArgs()
        Promise.any(args.map((args: any[]) => service.sign.apply(service, args)))
        .then((res: any) => result = res)
        .catch((err: any) => error = err)
        .finally(() => setTimeout(done))
      })

      it('attempts to retrieve the {OpgpLiveKey} instances ' +
      'referenced by the given handles when compliant', () => {
        cache.get.calls.allArgs()
        .forEach((args: any) => expect(args).toEqual([ 'compliant handle' ]))
      })

      it('does not delegate to the openpgp primitive', () => {
        expect(openpgp.message.fromText).not.toHaveBeenCalled()
      })

      it('returns a Promise that rejects ' +
      'with an `invalid key reference: not a string or stale` or ' +
      'an `invalid text: not a string` {Error}', () => {
        expect(result).not.toBeDefined()
        expect(error).toEqual(jasmine.any(Promise.AggregateError))
        error.forEach((error: any) => {
          expect(error).toEqual(jasmine.any(Error))
          expect(error.message).toEqual(jasmine
          .stringMatching(/invalid key reference: not a string or stale|invalid text: not a string/))
        })
      })
    })
  })

  describe('verify (keyRefs: Eventual<KeyRef[]|KeyRef>, armor: Eventual<string>, ' +
  'opts?: Eventual<VerifyOpts>): Promise<string>', () => {
    let message: any
    beforeEach(() => {
      message = jasmine.createSpyObj('message', [ 'verify', 'getText' ])
    })

    describe('when given a signed armor text string and the valid handle string ' +
    'of the corresponding authentication key', () => {
      let error: any
      let result: any
      beforeEach(() => {
        cache.get.and.returnValue(livekey)
        openpgp.message.readArmored.and.returnValue(message)
        message.verify.and.returnValue(Promise.resolve([ { keyid: 'keyid', valid: true }]))
        message.getText.and.returnValue('plain-text')
      })

      beforeEach((done) => {
        service.verify(Promise.resolve('valid-auth-key-handle'), 'signed armor text')
        .then((res: any) => result = res)
        .catch((err: any) => error = err)
        .finally(() => setTimeout(done))
      })

      it('retrieves the {OpgpLiveKey} instance referenced by the given handle',
      () => {
        expect(cache.get).toHaveBeenCalledWith('valid-auth-key-handle')
      })

      it('delegates to the openpgp primitive', () => {
        expect(openpgp.message.readArmored).toHaveBeenCalledWith('signed armor text')
        expect(message.verify).toHaveBeenCalledWith([ livekey.key ])
        expect(message.getText).toHaveBeenCalledWith()
      })

      it('returns a Promise that resolves to the plain text string', () => {
        expect(result).toBe('plain-text')
        expect(error).not.toBeDefined()
      })
    })

    describe('when given a signed armor text string and a valid handle string ' +
    'of the wrong authentication key', () => {
      let error: any
      let result: any
      beforeEach(() => {
        cache.get.and.returnValue(livekey)
        openpgp.message.readArmored.and.returnValue(message)
        message.verify.and.returnValue(Promise.resolve([
          { keyid: 'verified-keyid', valid: true },
          { keyid: 'wrong-keyid', valid: false },
          { keyid: 'another-wrong-keyid', valid: false }
        ]))
      })

      beforeEach((done) => {
        service.verify([
          'correct-key-handle', 'wrong-key-handle', 'another-wrong-key-handle'
        ], 'signed armor text')
        .then((res: any) => result = res)
        .catch((err: any) => error = err)
        .finally(() => setTimeout(done))
      })

      it('retrieves the {OpgpLiveKey} instance referenced by the given handle',
      () => {
        expect(cache.get.calls.allArgs()).toEqual([
          [ 'correct-key-handle' ],
          [ 'wrong-key-handle' ],
          [ 'another-wrong-key-handle' ]
        ])
      })

      it('delegates to the openpgp primitive', () => {
        expect(openpgp.message.readArmored).toHaveBeenCalledWith('signed armor text')
        expect(message.verify).toHaveBeenCalledWith([ livekey.key, livekey.key, livekey.key ])
        expect(message.getText).not.toHaveBeenCalled()
      })

      it('returns a Promise that rejects with an {Error} containing a message ' +
      'with a trailing list of the key IDs that fail authentication', () => {
        expect(result).not.toBeDefined()
        expect(error).toEqual(jasmine.any(Error))
        expect(error.message)
        .toBe('authentication failed: wrong-keyid,another-wrong-keyid')
      })
    })

    describe('when given a signed armor text string and a stale handle string',
    () => {
      let error: any
      let result: any
      beforeEach(() => {
        cache.get.and.returnValue(undefined)
      })

      beforeEach((done) => {
        service.verify('stale-key-handle', 'signed armor text')
        .then((res: any) => result = res)
        .catch((err: any) => error = err)
        .finally(() => setTimeout(done))
      })

      it('attempts to retrieve the {OpgpLiveKey} instance ' +
      'referenced by the given handle', () => {
        expect(cache.get).toHaveBeenCalledWith('stale-key-handle')
      })

      it('does not delegate to the openpgp primitive', () => {
        expect(openpgp.message.readArmored).not.toHaveBeenCalled()
      })

      it('returns a Promise that rejects ' +
      'with an `invalid key reference: not a string or stale` {Error}', () => {
        expect(result).not.toBeDefined()
        expect(error).toBeDefined()
        expect(error.message).toBe('invalid key reference: not a string or stale')
      })
    })

    describe('when given non-compliant arguments', () => {
      let error: any
      let result: any
      beforeEach(() => {
        cache.get.and.returnValue(livekey)
      })

      beforeEach((done) => {
        const args = getInvalidAuthArgs()
        Promise.any(args.map((args: any[]) => service.verify.apply(service, args)))
        .then((res: any) => result = res)
        .catch((err: any) => error = err)
        .finally(() => setTimeout(done))
      })

      it('attempts to retrieve the {OpgpLiveKey} instances ' +
      'referenced by the given handles when compliant', () => {
        cache.get.calls.allArgs()
        .forEach((args: any) => expect(args).toEqual([ 'compliant handle' ]))
      })

      it('does not delegate to the openpgp primitive', () => {
        expect(openpgp.message.readArmored).not.toHaveBeenCalled()
      })

      it('returns a Promise that rejects ' +
      'with an `invalid key reference: not a string or stale` or ' +
      'an `invalid armor: not a string` {Error}', () => {
        expect(result).not.toBeDefined()
        expect(error).toEqual(jasmine.any(Promise.AggregateError))
        error.forEach((error: any) => {
          expect(error).toEqual(jasmine.any(Error))
          expect(error.message).toEqual(jasmine
          .stringMatching(/invalid key reference: not a string or stale|invalid armor: not a string/))
        })
      })
    })
  })
})

function getInvalidAuthArgs () {
  const types = [
    undefined,
    null,
    NaN,
    true,
    42,
    'foo',
    [ 'foo' ],
    { foo: 'foo' }
  ]

  function isString (val: any): val is String {
    return typeof val === 'string'
  }

  const nonStringTypes = types
  .filter((val: any) => !isString(val))

  return nonStringTypes
  .filter((val: any) => !Array.isArray(val))
  .map((invalidKeyRef: any) => [ invalidKeyRef, 'compliant text' ])
  .concat(nonStringTypes
    .map((invalidKeyRef: any) => [ [ invalidKeyRef ], 'compliant text' ]))
  .concat(nonStringTypes
    .map((invalidText: any) => [ 'compliant handle', invalidText ]))
}
