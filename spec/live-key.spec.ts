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
const Buffer = require('buffer').Buffer

let openpgp: any
let key: any
let subkeys: any
let packets: any
let msg: any
let blueprint: any

beforeEach(() => { // mock dependencies
  openpgp = {
    crypto: { hash: jasmine.createSpyObj('hash', [ 'sha256' ]) },
    key: jasmine.createSpyObj('key', [ 'readArmored' ]),
    message: jasmine.createSpyObj('message', [ 'fromText', 'readArmored' ])
  }

  key = jasmine.createSpyObj('key', [
    'armor',
    'getAllKeyPackets',
    'isPublic',
    'getUserIds',
    'getSigningKeyPacket',
    'getEncryptionKeyPacket',
    'verifyPrimaryKey',
    'getExpirationTime'
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

  openpgp.crypto.hash.sha256.and.returnValue(Buffer.from('c2hhMjU2', 'base64'))
  openpgp.key.readArmored.and.returnValue({ keys: [ Object.assign({}, key ) ] })
  openpgp.message.readArmored.and.returnValue(msg)
  openpgp.message.fromText.and.returnValue(msg)

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

describe('default export: ' +
'getLiveKeyFactory (config: {openpgp:any}): LiveKeyFactory', () => {
  let factory: any
  beforeEach(() => {
    factory = getLiveKeyFactory({ openpgp: openpgp })
  })

  it('returns a {LiveKey} factory when given an instance of openpgp', () => {
    expect(factory).toEqual(jasmine.any(Function))
  })
})

describe('LiveKeyFactory: ' +
'getLiveKey (key: any, opts?: LiveKeyFactoryOpts): OpgpLiveKey', () => {
  let livekey: any
  beforeEach(() => {
    const getLiveKey = getLiveKeyFactory({ openpgp: openpgp })
    livekey = getLiveKey(key)
  })

  it('returns a {OpgpLiveKey} instance that wraps the given openpgp key', () => {
    expect(livekey).toEqual(jasmine.objectContaining({
      key: key,
      bp: jasmine.any(Object),
      armor: jasmine.any(Function),
      unlock: jasmine.any(Function),
      lock: jasmine.any(Function),
      sign: jasmine.any(Function),
      verify: jasmine.any(Function)
    }))
  })
})

describe('OpgpLiveKey', () => {
  describe('bp: OpgpKeyBlueprint', () => {
    let bp: any
    beforeEach(() => {
      const getLiveKey = getLiveKeyFactory({ openpgp: openpgp })
      bp = getLiveKey(key).bp
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
    let armor: any
    beforeEach((done) => {
      const getLiveKey = getLiveKeyFactory({ openpgp: openpgp })
      getLiveKey(key).armor()
      .then(_armor => armor = _armor)
      .finally(() => setTimeout(done))
    })

    it('returns an armored string representation of the wrapped openpgp key', () => {
      expect(key.armor).toHaveBeenCalled()
      expect(armor).toBe('key-armor')
    })
  })

  describe('unlock (passphrase: string, opts?: LiveKeyUnlockOpts): ' +
  'Promise<OpgpLiveKey>', () => {

  })
})