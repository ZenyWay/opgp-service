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
import getLiveKeyFactory from '../src/live-key'
import * as base64 from 'base64-js'

let getLiveKey: any
let openpgp: any // API from openpgp@3.1.2
let key: any
let keyId: any
let primaryKey: any
let subkeys: any
let packets: any
let msg: any
let blueprint: any
let livekeyInterface: any
let cloneKey: (key: any) => any

beforeEach(() => { // mock dependencies
  openpgp = {
    crypto: { hash: jasmine.createSpyObj('hash', [ 'sha256' ]) },
    key: jasmine.createSpyObj('key', [ 'readArmored' ]),
    message: jasmine.createSpyObj('message', [ 'fromText', 'readArmored' ])
  }

  keyId = { bytes: 'key-id' }
  key = jasmine.createSpyObj('key', [
    'armor',
    'toPublic',
    'isPublic',
    'getUserIds',
    'getSigningKey',
    'getEncryptionKey',
    'verifyPrimaryKey',
    'getExpirationTime',
    'encrypt',
    'decrypt'
  ])

  packets = [ 0, 1, 2, 3 ] // primary and 3 subkeys
  .map(packet => jasmine.createSpyObj(`packet${packet}`, [
    'getFingerprint',
    'writeOld'
  ]))

  subkeys = [ 0, 1, 2 ] // 3 subkeys
  .map(subkey => jasmine.createSpyObj(`subkey${subkey}`, [
    'verify',
    'getKeyId',
    'getExpirationTime'
  ]))

  msg = jasmine.createSpyObj('msg', [ 'sign', 'verify' ])

  key.armor.and.returnValue('key-armor')
  key.isPublic.and.returnValue(false)
  key.getUserIds.and.returnValue([ 'user@test.io' ])
  key.getSigningKey.and.returnValue(packets[0])
  key.getEncryptionKey.and.returnValue(packets[0])
  key.verifyPrimaryKey.and.returnValue(Promise.resolve(6510))
  key.getExpirationTime.and.returnValue(Promise.resolve(Infinity))

  primaryKey = jasmine.createSpyObj('primaryKey', [
    'isDecrypted',
    'getFingerprint',
    'writeOld'
  ])
  primaryKey.isDecrypted.and.returnValue(false)
  primaryKey.getFingerprint.and.returnValue('0')
  primaryKey.writeOld.and.returnValue([ `old-primary-key-bytes` ])
  key.primaryKey = primaryKey

  packets.forEach((packet: any, index: number) => {
    packet.getFingerprint.and.returnValue(index.toString())
    packet.writeOld.and.returnValue([ `old${index}` ])
  })

  subkeys.forEach((subkey: any, index: number) => {
    subkey.verify.and.returnValue(Promise.resolve(6511 + index))
    subkey.getKeyId.and.returnValue({ ...keyId })
    subkey.getExpirationTime.and.returnValue(new Date(1984 - index))
    subkey.keyPacket = packets[index + 1]
  })
  key.subKeys = subkeys

  cloneKey = function (key: any): any {
    const clone = { ...key }
    clone.primaryKey = { ...key.primaryKey }
    clone.subKeys = key.subKeys.map((subkey: any) => ({ ...subkey }))
    return clone
  }

  openpgp.crypto.hash.sha256.and.returnValue(base64.toByteArray('c2hhMjU2'))
  openpgp.key.readArmored.and.callFake(() => ({ keys: [ cloneKey(key) ] }))
  openpgp.message.readArmored.and.returnValue(msg)
  openpgp.message.fromText.and.returnValue(msg)

  livekeyInterface = {
    key: key,
    bp: jasmine.any(Object),
    armor: jasmine.any(Function),
    unlock: jasmine.any(Function),
    lock: jasmine.any(Function),
    sign: jasmine.any(Function),
    verify: jasmine.any(Function)
  }

  blueprint = { // expected
    isLocked: true,
    isPublic: false,
    keys: [ 0, 1, 2, 3 ].map(index => ({
      isAuth: true,
      isCiph: true,
      expires: !index ? Infinity : 1985 - index,
      fingerprint: index.toString(),
      hash: 'c2hhMjU2', // 'sha256' in base64
      status: 6510 + index
    })),
    user: {  ids: [ 'user@test.io' ] }
  }
})

beforeEach(() => {
  getLiveKey = getLiveKeyFactory({ openpgp: openpgp })
})

describe('default export: ' +
'getLiveKeyFactory (config: {openpgp:any}): LiveKeyFactory', () => {
  it('returns a {LiveKey} factory when given an instance of openpgp', () => {
    expect(getLiveKey).toEqual(jasmine.any(Function))
  })
})

describe('LiveKeyFactory: ' +
'getLiveKey (key: any, opts?: LiveKeyFactoryOpts): Promise<OpgpLiveKey>', () => {
  let livekey: any
  let error: any

  beforeEach((done) => {
    getLiveKey(key).then(
      (res: any) =>
        livekey = res
    )
    .catch((err: any) => error = err)
    .finally(() => setTimeout(done))
  })

  it('return a Promise that resolves to a {OpgpLiveKey} instance, ' +
  'that wraps the given openpgp key', () => {
    expect(livekey).toEqual(jasmine.objectContaining(livekeyInterface))
    expect(error).toBeUndefined()
  })
})

describe('OpgpLiveKey', () => {
  let livekey: any

  beforeEach((done) => {
    getLiveKey(key).then((res: any) => livekey = res)
    .finally(() => setTimeout(done))
  })

  describe('bp: OpgpKeyBlueprint', () => {
    let bp: any
    beforeEach(() => {
      bp = livekey.bp
    })

    it('is a blueprint of the openpgp wrapped in the {OpgpLiveKey} instance:\n' +
    '{\n  isLocked: boolean,\n  isPublic: boolean,\n  keys: OpgpKeyId[],\n  ' +
    'user: { ids: string[] }\n}\n' +
    'where each {OpgpKeyId} element in `keys` is a blueprint ' +
    'of the corresponding key component:\n' +
    '{\n  isAuth: boolean,\n  isCiph: boolean,\n  expires: number,\n  ' +
    'fingerprint: string,\n  hash: string,\n  status: number\n}', () => {
      expect(bp).toEqual(blueprint)
    })
  })

  describe('armor (): Promise<string>', () => {
    describe('when the openpgp primitive succeeds', () => {
      let error: any
      let result: any
      beforeEach((done) => {
        livekey.armor()
        .then((res: any) => result = res)
        .catch((err: any) => error = err)
        .finally(() => setTimeout(done))
      })

      it('returns a Promise that resolves to an armored string representation ' +
      'of the wrapped openpgp key when the openpgp primitive succeeds', () => {
        expect(key.armor).toHaveBeenCalled()
        expect(result).toBe('key-armor')
        expect(error).not.toBeDefined()
      })
    })

    describe('when the openpgp primitive fails', () => {
      let error: any
      let result: any
      beforeEach((done) => {
        key.armor.and.throwError('boom')
        livekey.armor()
        .then((res: any) => result = res)
        .catch((err: any) => error = err)
        .finally(() => setTimeout(done))
      })

      it('returns a Promise that rejects with the error ' +
      'from the openpgp primitive when it fails', () => {
        expect(key.armor).toHaveBeenCalled()
        expect(result).not.toBeDefined()
        expect(error).toBeDefined()
        expect(error.message).toBe('boom')
      })
    })
  })

  describe('toPublicKey (): Promise<OpgpLiveKey>', () => {
    let publickey: any
    beforeEach(() => {
      publickey = cloneKey(key)
      publickey.isPublic = jasmine.createSpy('armor').and.returnValue(true)
    })
    describe('when this {LiveKey} wraps a private openpgp key', () => {
      let error: any
      let result: any
      beforeEach((done) => {
        livekeyInterface.key = publickey
        key.toPublic.and.returnValue(publickey)
        livekey.toPublicKey()
        .then((res: any) => result = res)
        .catch((err: any) => error = err)
        .finally(() => setTimeout(done))
      })

      it('delegates to the underlying openpgp primitive', () => {
        expect(key.toPublic).toHaveBeenCalledWith()
      })

      it('returns a Promise that resolves to a {OpgpLiveKey} instance ' +
      'that wraps the public openpgp key of the wrapped openpgp key of this {LiveKey}',
      () => {
        expect(result).toEqual(jasmine.objectContaining(livekeyInterface))
        expect(error).not.toBeDefined()
      })
    })

    describe('when this {LiveKey} wraps a public openpgp key', () => {
      let error: any
      let result: any
      let publicLivekey: any
      beforeEach((done) => {
        getLiveKey(publickey)
        .then((res: any) => publicLivekey = res)
        .finally(() => setTimeout(done))
      })

      beforeEach((done) => {
        publicLivekey.toPublicKey()
        .then((res: any) => result = res)
        .catch((err: any) => error = err)
        .finally(() => setTimeout(done))
      })

      it('does not delegate to the underlying openpgp primitive', () => {
        expect(key.toPublic).not.toHaveBeenCalled()
      })

      it('returns this {OpgpLiveKey} instance ', () => {
        expect(result).toEqual(publicLivekey)
        expect(error).not.toBeDefined()
      })
    })

    describe('when the openpgp primitive fails', () => {
      let error: any
      let result: any
      beforeEach((done) => {
        key.toPublic.and.throwError('boom')
        livekey.toPublicKey()
        .then((res: any) => result = res)
        .catch((err: any) => error = err)
        .finally(() => setTimeout(done))
      })

      it('returns a Promise that rejects with the error ' +
      'from the openpgp primitive', () => {
        expect(key.toPublic).toHaveBeenCalled()
        expect(result).not.toBeDefined()
        expect(error).toBeDefined()
        expect(error.message).toBe('boom')
      })
    })
  })

  describe('unlock (passphrase: string, opts?: LiveKeyUnlockOpts): ' +
  'Promise<OpgpLiveKey>', () => {
    let unlocked: any
    beforeEach(() => {
      unlocked = cloneKey(key)
      unlocked.primaryKey.isDecrypted = jasmine.createSpy('isDecrypted')
      .and.returnValue(true)
    })

    describe('when given the correct passphrase', () => {
      let error: any
      let result: any
      beforeEach((done) => {
        openpgp.key.readArmored.and.callFake(() => {
          const clone = cloneKey(unlocked)
          clone.decrypt = jasmine.createSpy('decrypt')
          .and.returnValue(Promise.resolve(true))
          return { keys: [ clone ] }
        })

        livekey.unlock('correct passphrase')
        .then((res: any) => result = res)
        .catch((err: any) => error = err)
        .finally(() => setTimeout(done))
      })

      it('returns a Promise that resolves to a new, '
      + 'unlocked {OpgpLiveKey} instance', () => {
        expect(error).not.toBeDefined()
        expect(result).not.toBe(livekey)
        expect(result.bp.isLocked).toBe(false)
      })
      it('does not change the state of its {OpgpLiveKey} instance', () => {
        expect(livekey.key).toBe(key)
        expect(livekey.key.primaryKey.isDecrypted()).toBe(false)
        expect(livekey.bp.isLocked).toBe(true)
        expect(livekey.key.decrypt).not.toHaveBeenCalled()
      })
    })

    describe('when given an incorrect passphrase', () => {
      let error: any
      let result: any
      beforeEach((done) => {
        key.decrypt.and.returnValue(Promise.resolve(false))

        livekey.unlock('incorrect passphrase')
        .then((res: any) => result = res)
        .catch((err: any) => error = err)
        .finally(() => setTimeout(done))
      })

      it('returns a Promise that rejects with a `fail to unlock key` {Error}',
      () => {
        expect(result).not.toBeDefined()
        expect(error).toEqual(jasmine.any(Error))
        expect(error.message).toBe('fail to unlock key')
      })
      it('does not change the state of its {OpgpLiveKey} instance', () => {
        expect(livekey.key).toBe(key)
        expect(livekey.key.primaryKey.isDecrypted()).toBe(false)
        expect(livekey.bp.isLocked).toBe(true)
      })
    })

    describe('when its {OpgpLiveKey} is already unlocked', () => {
      let error: any
      let result: any
      beforeEach((done) => {
        getLiveKey(unlocked)
        .then((res: any) => livekey = res)
        .finally(() => setTimeout(done))
      })

      beforeEach((done) => {
        livekey.unlock('passphrase')
        .then((res: any) => result = res)
        .catch((err: any) => error = err)
        .finally(() => setTimeout(done))
      })

      it('returns a Promise that rejects with a `key not locked` {Error}', () => {
        expect(result).not.toBeDefined()
        expect(error).toEqual(jasmine.any(Error))
        expect(error.message).toBe('key not locked')
      })
      it('does not change the state of its {OpgpLiveKey} instance', () => {
        expect(livekey.key).toBe(unlocked)
        expect(livekey.key.primaryKey.isDecrypted()).toBe(true)
        expect(livekey.bp.isLocked).toBe(false)
      })
    })

    describe('when the openpgp primitive throws an exception', () => {
      let error: any
      let result: any
      beforeEach((done) => {
        key.decrypt.and.returnValue(Promise.reject(new Error('boom')))

        livekey.unlock('passphrase')
        .then((res: any) => result = res)
        .catch((err: any) => error = err)
        .finally(() => setTimeout(done))
      })

      it('returns a Promise that rejects with the corresponding error', () => {
        expect(result).not.toBeDefined()
        expect(error).toEqual(jasmine.any(Error))
        expect(error.message).toBe('boom')
      })
      it('does not change the state of its {OpgpLiveKey} instance', () => {
        expect(livekey.key).toBe(key)
        expect(livekey.key.primaryKey.isDecrypted()).toBe(false)
        expect(livekey.bp.isLocked).toBe(true)
      })
    })
  })

  describe('lock (passphrase: string, opts?: LiveKeyUnlockOpts): ' +
  'Promise<OpgpLiveKey>', () => {
    let unlocked: any
    beforeEach(() => {
      unlocked = cloneKey(key)
      unlocked.primaryKey.isDecrypted = jasmine.createSpy('isDecrypted')
      .and.returnValue(true)
    })

    describe('when given a passphrase', () => {
      let error: any
      let result: any
      beforeEach((done) => {
        unlocked.encrypt = jasmine.createSpy('encrypt')
        .and.callFake(function () {
          // key packets are mutated !
          unlocked.primaryKey.isDecrypted.and.returnValue(false)
          return Promise.resolve(/* Array<keyPacket> */)
        })

        getLiveKey(unlocked)
        .then((res: any) => livekey = res)
        .finally(() => setTimeout(done))
      })

      beforeEach((done) => {
        livekey.lock('passphrase')
        .then((res: any) => result = res)
        .catch((err: any) => error = err)
        .finally(() => setTimeout(done))
      })

      it('returns a Promise that resolves to a new, '
      + 'locked {OpgpLiveKey} instance', () => {
        expect(error).not.toBeDefined()
        expect(result).not.toBe(livekey)
        expect(result.bp.isLocked).toBe(true)
      })
      it('invalidates its {OpgpLiveKey} instance', () => {
        expect(livekey.key).not.toBeDefined()
      })
    })

    describe('when its {OpgpLiveKey} is already locked', () => {
      let error: any
      let result: any
      beforeEach((done) => {
        livekey.lock('passphrase')
        .then((res: any) => result = res)
        .catch((err: any) => error = err)
        .finally(() => setTimeout(done))
      })

      it('returns a Promise that rejects with a `key not unlocked` {Error}', () => {
        expect(result).not.toBeDefined()
        expect(error).toEqual(jasmine.any(Error))
        expect(error.message).toBe('key not unlocked')
      })
      it('does not change the state of its {OpgpLiveKey} instance', () => {
        expect(livekey.key).toBe(key)
        expect(livekey.key.primaryKey.isDecrypted()).toBe(false)
        expect(livekey.bp.isLocked).toBe(true)
      })
    })

    describe('when the openpgp primitive throws an exception', () => {
      let error: any
      let result: any
      beforeEach((done) => {
        key.encrypt.and.returnValue(Promise.reject(new Error('boom')))

        getLiveKey(unlocked)
        .then((res: any) => livekey = res)
        .finally(() => setTimeout(done))
      })

      beforeEach((done) => {
        livekey.lock('incorrect passphrase')
        .then((res: any) => result = res)
        .catch((err: any) => error = err)
        .finally(() => setTimeout(done))
      })

      it('returns a Promise that rejects with the corresponding error', () => {
        expect(result).not.toBeDefined()
        expect(error).toEqual(jasmine.any(Error))
        expect(error.message).toBe('boom')
      })
      it('invalidates its {OpgpLiveKey} instance', () => {
        expect(livekey.key).not.toBeDefined()
      })
    })
  })
})
