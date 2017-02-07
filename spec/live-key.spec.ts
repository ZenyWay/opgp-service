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
import getLiveKeyFactory from '../src/live-key'
import * as base64 from 'base64-js'

let getLiveKey: any
let openpgp: any
let key: any
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

  key = jasmine.createSpyObj('key', [
    'armor',
    'toPublic',
    'getAllKeyPackets',
    'isPublic',
    'getUserIds',
    'getSigningKeyPacket',
    'getEncryptionKeyPacket',
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
    'isValidEncryptionKey',
    'isValidSigningKey',
    'verify',
    'getExpirationTime'
  ]))

  msg = jasmine.createSpyObj('msg', [ 'sign', 'verify' ])

  key.armor.and.returnValue('key-armor')
  key.getAllKeyPackets.and.returnValue(packets)
  key.isPublic.and.returnValue(false)
  key.getUserIds.and.returnValue([ 'user@test.io' ])
  key.getSigningKeyPacket.and.returnValue(packets[0])
  key.getEncryptionKeyPacket.and.returnValue(packets[0])
  key.verifyPrimaryKey.and.returnValue(6510)
  // key.getExpirationTime.and.returnValue()

  packets.forEach((packet: any, index: number) => {
    packet.getFingerprint.and.returnValue(index.toString())
    packet.writeOld.and.returnValue([ `old${index}` ])
  })

  subkeys.forEach((subkey: any, index: number) => {
    subkey.isValidEncryptionKey.and.returnValue(true)
    subkey.isValidSigningKey.and.returnValue(true)
    subkey.verify.and.returnValue(6511 + index)
    subkey.getExpirationTime.and.returnValue(new Date(1984 - index))
  })

  key.primaryKey = { isDecrypted: false }
  key.subKeys = subkeys

  cloneKey = function (key: any): any {
    const clone = Object.assign({}, key)
    clone.primaryKey = { isDecrypted: key.primaryKey.isDecrypted }
    clone.subKeys = key.subKeys.slice()
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
'getLiveKey (key: any, opts?: LiveKeyFactoryOpts): OpgpLiveKey', () => {
  let livekey: any
  beforeEach(() => {
    livekey = getLiveKey(key)
  })

  it('returns a {OpgpLiveKey} instance that wraps the given openpgp key', () => {
    expect(livekey).toEqual(jasmine.objectContaining(livekeyInterface))
  })
})

describe('OpgpLiveKey', () => {
  let livekey: any
  beforeEach(() => {
    livekey = getLiveKey(key)
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
        publicLivekey = getLiveKey(publickey)
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
      unlocked.primaryKey.isDecrypted = true
    })

    describe('when given the correct passphrase', () => {
      let error: any
      let result: any
      beforeEach((done) => {
        openpgp.key.readArmored.and.callFake(() => {
          const clone = cloneKey(unlocked)
          clone.decrypt = jasmine.createSpy('decrypt').and.returnValue(true)
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
        expect(livekey.key.primaryKey.isDecrypted).toBe(false)
        expect(livekey.bp.isLocked).toBe(true)
        expect(livekey.key.decrypt).not.toHaveBeenCalled()
      })
    })

    describe('when given an incorrect passphrase', () => {
      let error: any
      let result: any
      beforeEach((done) => {
        key.decrypt.and.returnValue(false)

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
        expect(livekey.key.primaryKey.isDecrypted).toBe(false)
        expect(livekey.bp.isLocked).toBe(true)
      })
    })

    describe('when its {OpgpLiveKey} is already unlocked', () => {
      let error: any
      let result: any
      beforeEach((done) => {
        livekey = getLiveKey(unlocked)

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
        expect(livekey.key.primaryKey.isDecrypted).toBe(true)
        expect(livekey.bp.isLocked).toBe(false)
      })
    })

    describe('when the openpgp primitive throws an exception', () => {
      let error: any
      let result: any
      beforeEach((done) => {
        key.decrypt.and.throwError('boom')

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
        expect(livekey.key.primaryKey.isDecrypted).toBe(false)
        expect(livekey.bp.isLocked).toBe(true)
      })
    })
  })

  describe('lock (passphrase: string, opts?: LiveKeyUnlockOpts): ' +
  'Promise<OpgpLiveKey>', () => {
    let unlocked: any
    beforeEach(() => {
      unlocked = cloneKey(key)
      unlocked.primaryKey.isDecrypted = true
    })

    describe('when given a passphrase', () => {
      let error: any
      let result: any
      beforeEach((done) => {
        unlocked.encrypt = jasmine.createSpy('encrypt')
        .and.callFake(() => unlocked.primaryKey.isDecrypted = false)
        livekey = getLiveKey(unlocked)

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
        expect(livekey.key.primaryKey.isDecrypted).toBe(false)
        expect(livekey.bp.isLocked).toBe(true)
      })
    })

    describe('when the openpgp primitive throws an exception', () => {
      let error: any
      let result: any
      beforeEach((done) => {
        key.encrypt.and.throwError('boom');
        livekey = getLiveKey(unlocked)

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