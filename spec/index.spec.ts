/*
 * Copyright 2016 Stephane M. Catala
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
;
import getService from '../src'

let opgpService: any
let cache: any
let getLiveKey: any
let getProxyKey: any
let openpgp: any
let key: any
let livekey: any

beforeEach(() => { // mock dependencies
  cache = jasmine.createSpyObj('cache', [ 'set', 'del', 'get', 'has' ])
  getLiveKey = jasmine.createSpy('getLiveKey')
  getProxyKey = jasmine.createSpy('getProxyKey')
  openpgp = {
    crypto: { hash: jasmine.createSpyObj('hash', [ 'sha256' ]) },
    key: jasmine.createSpyObj('key', [ 'readArmored' ]),
    message: jasmine.createSpyObj('message', [ 'fromText', 'readArmored' ])
  }
  cache.set.and.returnValue('key-handle')
  key = {}
  livekey = { key: {}, bp: { keys: [ { id: 'key-id' } ], user: { ids: [] } } }
  openpgp.key.readArmored.and.returnValue({ keys: [ key ] })
  getLiveKey.and.returnValue(livekey)
  opgpService = jasmine.objectContaining({
    getKeysFromArmor: jasmine.any(Function),
    encrypt: jasmine.any(Function),
    decrypt: jasmine.any(Function),
    sign: jasmine.any(Function),
    verify: jasmine.any(Function)
  })
})

describe('default export: getOpgpService (config?: OpgpServiceFactoryConfig): ' +
'OpgpService', () => {

  describe('when called without arguments', () => {
    let service: any
    beforeEach(() => {
      service = getService()
    })

    it('returns an {OpgpService} instance', () =>{
      expect(service).toEqual(opgpService)
    })
  })

  describe('when called with { cache?: CsrKeyCache<OpgpLiveKey>, ' +
  'getLiveKey?: LiveKeyFactory, getProxyKey?: ProxyKeyFactory, ' +
  'openpgp?: openpgp }', () => {
    let service: any
    beforeEach(() => {
      service = getService({
        cache: cache,
        getLiveKey: getLiveKey,
        getProxyKey: getProxyKey,
        openpgp: openpgp
      })
      service.getKeysFromArmor('key-armor')
    })

    it('returns an {OpgpService} instance based on the given dependencies ', () =>{
      expect(service).toEqual(opgpService)
      expect(openpgp.key.readArmored).toHaveBeenCalledWith('key-armor')
      expect(getLiveKey).toHaveBeenCalledWith(key)
      expect(cache.set).toHaveBeenCalledWith(livekey)
      expect(getProxyKey).toHaveBeenCalledWith('key-handle', livekey.bp)
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

  describe('getKeysFromArmor (armor: string, opts?: OpgpKeyringOpts)' +
  ': Promise<OpgpProxyKey[]|OpgpProxyKey>', () => {
    describe('when the underlying openpgp primitive returns a single key', () => {
      let error: any
      let result: any
      beforeEach((done) => {
        service.getKeysFromArmor('key-armor')
        .then((res: any) => result = res)
        .catch((err: any) => error = err)
        .finally(() => setTimeout(done))
      })

      it('returns a Promise that resolves to an {OpgpProxyKey} instance', () => {
        expect(result).toEqual(jasmine.objectContaining({ handle: 'key-handle' }))
        expect(result).toEqual(jasmine.objectContaining(livekey.bp))
        expect(error).not.toBeDefined()
      })
    })

    describe('when the underlying openpgp primitive returns multiple keys', () => {
      let error: any
      let result: any
      beforeEach((done) => {
        openpgp.key.readArmored.and.returnValue({ keys: [ key, key, key ] })
        service.getKeysFromArmor('keys-armor')
        .then((res: any) => result = res)
        .catch((err: any) => error = err)
        .finally(() => setTimeout(done))
      })

      it('returns a Promise that resolves to an {OpgpProxyKey} instance', () => {
        expect(result).toEqual(jasmine.any(Array))
        expect(result.length).toBe(3)
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
      beforeEach((done) => {
        openpgp.key.readArmored.and.throwError('boom')
        service.getKeysFromArmor('key-armor')
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
  })
})