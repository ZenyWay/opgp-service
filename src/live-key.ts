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
import { OpgpKeyBlueprint, OpgpKeyId } from './proxy-key'
const Buffer = require('buffer').Buffer // incorrect type definitions
import Promise = require('bluebird')
import { __assign as assign } from 'tslib'

export interface LiveKeyFactoryBuilder {
  (config: LiveKeyFactoryConfig): LiveKeyFactory
}

export interface LiveKeyFactoryConfig {
  /**
   * openpgp instance
   *
   * @type {*}
   * @memberOf LiveKeyFactoryConfig
   */
  openpgp: any
}
/**
 * @function
 * @interface LiveKeyFactory
 *
 * @param {openpgp.key.Key} key
 * @param {LiveKeyFactoryOpts=} opts
 *
 * @returns {LiveKey}
 *
 * @static
 * @type {LiveKeyFactory}
 * @memberOf LiveKeyClass
 */
export interface LiveKeyFactory {
  (key: any, opts?: LiveKeyFactoryOpts): OpgpLiveKey
}

export interface LiveKeyFactoryOpts {}

/**
 * immutable-like wrapper of openpgp key instance.
 * all methods return a new instance.
 * only the lock method inevitably mutates the state of its instance:
 * to help prevent unpleasant surprises,
 * the lock method invalidates its instance,
 * i.e. subsequent calls to any method of the instance
 * will consistently be rejected.
 *
 * @export
 * @interface LiveKey
 */
export interface OpgpLiveKey {
  bp: OpgpKeyBlueprint
  /**
   * @returns {string} armor representation of the underlying openpgp key
   *
   * @memberOf LiveKey
   */
  armor (): string
  /**
   *
   * @param {string} passphrase
   * @param {LiveKeyUnlockOpts} [opts]
   *
   * @returns {Promise<LiveKey>}
   * * a new {LiveKey} instance, unlocked
   * * or this {LiveKey} instance when it is already unlocked,
   * or when unlocking fails.
   *
   * @memberOf LiveKeyClass
   */
  unlock (passphrase: string, opts?: LiveKeyUnlockOpts): Promise<OpgpLiveKey>
  /**
   * WARNING: unfortunately, this method mutates the underlying openpgp key !
   *
   * to help prevent unpleasant surprises,
   * this {LiveKey} instance is systematically invalidated
   * when calling this method:
   * subsequent calls to any method of this instance
   * will consistently be rejected.
   *
   * always discard this {LiveKey} instance after calling this method.
   *
   * @param {string} passphrase
   * @param {LiveKeyLockOpts} [opts]
   *
   * @returns {Promise<LiveKey>}
   *
   * @error {Error} when key encryption fails.
   * this key is in an undefined state and should be discarded!
   *
   * @memberOf LiveKeyClass
   */
  lock (passphrase: string, opts?: LiveKeyLockOpts): Promise<OpgpLiveKey>
  /**
   * sign a given text string with this {LiveKey}.
   *
   * @param {string} text
   * @param {LiveKeySignOpts} [opts]
   *
   * @returns {Promise<string>} armored string of signed text.
   *
   * @memberOf LiveKeyClass
   */
  sign (text: string, opts?: LiveKeySignOpts): Promise<string>
  /**
   * verify the PGP signature of a given armored string with this {LiveKey}.
   *
   * @param {string} armor signed text.
   * @param {LiveKeyVerfyOpts} [opts]
   *
   * @returns {Promise<string|boolean>}
   * the unsigned message when the signature is authentic,
   * or `false` otherwise.
   *
   * @memberOf LiveKeyClass
   */
  verify (armor: string, opts?: LiveKeyVerfyOpts): Promise<string|false>
}

export interface LiveKeyLockOpts {}

export interface LiveKeyUnlockOpts {}

export interface LiveKeySignOpts {}

export interface LiveKeyVerfyOpts {}

/**
 *
 * @private
 * @class LiveKeyClass
 * @implements {LiveKey}
 */
class LiveKeyClass implements OpgpLiveKey {
  static getFactory: LiveKeyFactoryBuilder
  = function (config: LiveKeyFactoryConfig): LiveKeyFactory {
    const utils = new OpenpgpKeyUtils(config.openpgp)

    return LiveKeyClass.getInstance.bind(LiveKeyClass, utils)
  }

  armor (): string {
    return this.key.armor()
  }

  unlock (passphrase: string, opts?: LiveKeyUnlockOpts): Promise<OpgpLiveKey> {
  	return !this.bp.isLocked ? Promise.resolve(this) : Promise.try(() => {
      try {
        const clone = this.utils.cloneKey(this.key) // mutate clone, not this.key
        return LiveKeyClass.getInstance(this.utils, clone.decrypt(passphrase))
      } catch (err) {
        // fallback to this locked key if unlock fails
      }
      return this
    })
  }

  lock (passphrase: string, opts?: LiveKeyLockOpts): Promise<OpgpLiveKey> {
  	return this.bp.isLocked ? Promise.resolve(this)
    : Promise.try(() =>
      LiveKeyClass.getInstance(this.utils, this.key.encrypt(passphrase)))
      .finally (() => delete this.key) // systematically invalidate this {LiveKey}
  }

  sign (text: string, opts?: LiveKeySignOpts): Promise<string> {
    return Promise.try(() =>
      this.utils.openpgp.message.fromText(text).sign([ this.key ]).armor())
  }

  verify (armor: string, opts?: LiveKeyVerfyOpts): Promise<string|false> {
    return Promise.try(() => {
    	const message = this.utils.openpgp.message.readArmored(armor)
    	const auth = message.verify([ this.key ])
      return !!auth.length && auth[0].valid && message.getText()
    })
  }

  constructor (
    private readonly utils: any,
    private key: any,
    public readonly bp: OpgpKeyBlueprint
  ) {}

  /**
   * @private
   * @function
   *
   * @param {openpgp} openpgp
   * @param {openpgp.key.Key} key
   * @param {LiveKeyFactoryOpts=} opts
   *
   * @returns {LiveKey}
   *
   * @static
   * @type {LiveKeyFactory}
   * @memberOf LiveKeyClass
   */
	private static getInstance (utils: OpenpgpKeyUtils, key: any, opts?: LiveKeyFactoryOpts): OpgpLiveKey {
    const bp = utils.getKeyBlueprint(key)

    return new LiveKeyClass(utils, key, bp)
  }
}

/**
 * collection of openpgp key processing utilities
 * that require access to an instance of openpgp.
 *
 * @private
 * @class OpenpgpKeyUtils
 */
class OpenpgpKeyUtils {
  /**
   * @public
   * @method
   *
   * @param {*} key openpgp key
   *
   * @returns {OpgpKeyBlueprint}
   *
   * @memberOf OpenpgpKeyUtils
   */
  getKeyBlueprint (key: any): OpgpKeyBlueprint {
    const packets = key.getAllKeyPackets()

    const primary = this.getOpgpKeyId(key, packets[0])

    const subkeys = packets.slice(1)
    .map((packet: any, index: number) => this.getOpgpKeyId(key, packet, index))

    return {
      isLocked: isLocked(key),
      isPublic: <boolean> key.isPublic(),
      keys: [ primary ].concat(subkeys),
      user: { ids: <string[]> key.getUserIds() }
    }
  }

  /**
   * @public
   * @method
   *
   * @param {*} packet openpgp key packet
   *
   * @returns {{hash:string,fingerpring:string}}
   *
   * @memberOf OpenpgpKeyUtils
   */
  getHashes (packet: any): {hash:string,fingerprint:string} {
    return {
      hash: this.getFingerprintHash(packet),
      fingerprint: packet.getFingerprint()
    }
  }

  /**
   * @public
   * @method
   *
   * @param {*} key openpgp key
   *
   * @returns {{isAuth:boolean,isCiph:boolean}} openpgp key type enum
   *
   * @memberOf OpenpgpKeyUtils
   */
  getPrimaryKeyType (key: any): {isAuth:boolean,isCiph:boolean} {
    const primary = this.cloneKey(key)
    primary.subKeys = null
    return {
      isAuth: !!primary.getSigningKeyPacket(),
      isCiph: !!primary.getEncryptionKeyPacket()
    }
  }

  /**
   * @public
   * @method
   *
   * @param {*} key openpgp key packet
   * @param {{format?:string,hash?:string}} opts?
   * 	 @prop {string=base64} format 'hex' for standard pgp fingerprint
   *   @prop {string=sha256} hash 'sha1' for standard pgp fingerprint
   *
   * @returns {string}
   *
   * @memberOf OpenpgpKeyUtils
   */
  getFingerprintHash (key: any, opts?: { format: string, hash: string }): string {
    const packets = key.writeOld()
    const hash = this.openpgp.crypto.hash[opts && opts.hash || 'sha256'](packets)
    return Buffer.from(hash).toString(opts && opts.format || 'base64')
  }

  /**
   * @public
   * @method
   *
   * @param {*} key openpgp key
   *
   * @returns {*} new openpgp key instance, cloned from `key`
   *
   * @memberOf OpenpgpKeyUtils
   */
  cloneKey (key: any): any {
    return this.openpgp.key.readArmored(key.armor()).keys[0]
  }

  constructor (public openpgp: any) {}

  /**
   * @private
   * @method
   *
   * @param {*} key
   * @param {*} packet of primary or subkey
   * @param {number=} index of subkey
   *
   * @returns {OpgpKeyId}
   *
   * @memberOf OpenpgpKeyUtils
   */
  private getOpgpKeyId (key: any, packet: any, index?: number): OpgpKeyId {
    return typeof index === 'undefined' ? this.getPrimaryOpgpKeyId(key, packet)
    : this.getSubkeyOpgpKeyId(key, packet, index)
  }

  /**
   * @private
   * @method
   *
   * @param {*} key
   * @param {*} packet
   *
   * @returns {OpgpKeyId}
   *
   * @memberOf OpenpgpKeyUtils
   */
  private getPrimaryOpgpKeyId (key: any, packet: any): OpgpKeyId {
    return assign(this.getHashes(packet), this.getPrimaryKeyType(key), {
      status: key.verifyPrimaryKey(),
      expires: getExpiry(key)
    })
  }

  /**
   * @private
   * @method
   *
   * @param {*} key
   * @param {*} packet of subkey
   * @param {number} index of subkey
   *
   * @returns {OpgpKeyId}
   *
   * @memberOf OpenpgpKeyUtils
   */
  private getSubkeyOpgpKeyId (key: any, packet: any, index: number): OpgpKeyId {
    const subkey = key.subKeys[index]

    return assign(this.getHashes(packet), {
      isCiph: subkey.isValidEncryptionKey(key.primaryKey),
      isAuth: subkey.isValidSigningKey(key.primaryKey),
      status: subkey.verify(key.primaryKey),
      expires: getExpiry(subkey)
    })
  }
}

/**
 * @private
 * @function
 *
 * @param {*} key openpgp key
 *
 * @returns {boolean}
 */
function isLocked (key: any): boolean {
  return !key.primaryKey.isDecrypted
}

/**
 * @private
 * @function
 *
 * @param {*} key openpgp key
 *
 * @returns {number} milliseconds since EPOCH
 */
function getExpiry (key: any): number {
	const expires = key.getExpirationTime()
	return expires ? expires.getTime() : Infinity
}

const getLiveKeyFactory: LiveKeyFactoryBuilder = LiveKeyClass.getFactory
export default getLiveKeyFactory