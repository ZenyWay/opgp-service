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
import { OpgpKeyBlueprint, OpgpKeyId } from './proxy-key'
import * as base64 from 'base64-js'
import Promise = require('bluebird')

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
  (key: any, opts?: LiveKeyFactoryOpts): Promise<OpgpLiveKey>
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
  /**
   * @prop {*} key openpgp key
   *
   * @memberOf OpgpLiveKey
   */
  key: any
  /**
   * @prop {OpgpKeyBlueprint} bp
   *
   * @memberOf OpgpLiveKey
   */
  bp: OpgpKeyBlueprint
  /**
   * @returns {string} armor representation of the underlying openpgp key
   *
   * @memberOf LiveKey
   */
  armor (): Promise<string>
  /**
   * @returns {Promise<OpgpLiveKey>} public component of this key.
   *
   * @memberOf LiveKey
   */
  toPublicKey (): Promise<OpgpLiveKey>
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
  verify (armor: string, opts?: LiveKeyVerfyOpts): Promise<string | false>
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
  static getFactory: LiveKeyFactoryBuilder = function (
    config: LiveKeyFactoryConfig
  ): LiveKeyFactory {
    const utils = new OpenpgpKeyUtils(config.openpgp)

    return LiveKeyClass.getInstance.bind(LiveKeyClass, utils)
  }

  armor (): Promise<string> {
    return Promise.try(() => this.key.armor())
  }

  toPublicKey (): Promise<OpgpLiveKey> {
    return this.bp.isPublic
    ? Promise.resolve(this)
    : Promise.try<OpgpLiveKey>(() => this.key.toPublic())
      .then(
        key => this.utils.getKeyBlueprint(key).then(
          bp => new LiveKeyClass(this.utils, key, bp)
        )
      )
  }

  unlock (passphrase: string, opts?: LiveKeyUnlockOpts): Promise<OpgpLiveKey> {
    return !this.bp.isLocked
    ? Promise.reject(new Error('key not locked'))
    : Promise.try<OpgpLiveKey>(
        () => {
          const clone = this.utils.cloneKey(this.key) // mutate clone, not this.key
          return clone.decrypt(passphrase).then(
            (unlocked: boolean) => unlocked
              ? LiveKeyClass.getInstance(this.utils, clone)
              : Promise.reject(new Error('fail to unlock key'))
          )
        }
      )
  }

  lock (passphrase: string, opts?: LiveKeyLockOpts): Promise<OpgpLiveKey> {
    return this.bp.isLocked
    ? Promise.reject(new Error('key not unlocked'))
    : Promise.try<OpgpLiveKey>(
        () => this.key.encrypt(passphrase) // key packets are mutated !
          .then(
            (/* Array<keyPacket> */) => LiveKeyClass.getInstance(
              this.utils,
              this.key
            )
          )
      )
      .finally(() => delete this.key) // systematically invalidate this {LiveKey}
  }

  /**
   * WARNING: this method is not tested
   */
  sign (text: string, opts?: LiveKeySignOpts): Promise<string> {
    if (process.env.NODE_ENV !== 'production') {
      console.log('WARNING: opgp-service/live-key#sign method is not tested.')
    }
    return Promise.try<string>(
      () => this.utils.openpgp.message.fromText(text)
      .sign([ this.key ]).then((signed: any) => signed.armor())
    )
  }

  /**
   * WARNING: this method is not tested
   */
  verify (armor: string, opts?: LiveKeyVerfyOpts): Promise<string | false> {
    if (process.env.NODE_ENV !== 'production') {
      console.log('WARNING: opgp-service/live-key#verify method is not tested.')
    }
    return Promise.try<string | false>(
      () => {
        const message = this.utils.openpgp.message.readArmored(armor)
        return message.verify([ this.key ])
        .then(
          (auth: any[]) => !!auth.length && auth[0].valid
            ? message.getText()
            : Promise.reject(new Error('authentication failed'))
        )
      }
    )
  }

  constructor (
    private readonly utils: OpenpgpKeyUtils,
    public key: any,
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
  private static getInstance (
    utils: OpenpgpKeyUtils,
    key: any,
    opts?: LiveKeyFactoryOpts
  ): Promise<OpgpLiveKey> {
    return utils.getKeyBlueprint(key)
    .then(bp => new LiveKeyClass(utils, key, bp))
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
  getKeyBlueprint (key: any): Promise<OpgpKeyBlueprint> {
    const primary = this._getPrimaryOpgpKeyId(key)

    const subkeys = Promise.all<OpgpKeyId>(
      key.subKeys.map((subkey: any) => this._getSubkeyOpgpKeyId(key, subkey))
    )

    return Promise.all([ primary, subkeys ]).then(([ primary, subkeys ]) => ({
      isLocked: isLocked(key),
      isPublic: key.isPublic() as boolean,
      keys: [ primary ].concat(subkeys),
      user: { ids: key.getUserIds() as string[] }
    }))
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
  getHashes (packet: any): { hash: string, fingerprint: string } {
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
  getPrimaryKeyType (key: any): { isAuth: boolean, isCiph: boolean } {
    const primary = this.cloneKey(key)
    primary.subKeys = []
    return {
      isAuth: !!primary.getSigningKey(),
      isCiph: !!primary.getEncryptionKey()
    }
  }

  /**
   * @public
   * @method
   *
   * @param {*} key openpgp key packet
   * @param {{hash?:string}} opts?
   *   @prop {string=sha256} hash
   *
   * @returns {string} hash of `key` as base64 string
   *
   * @memberOf OpenpgpKeyUtils
   */
  getFingerprintHash (key: any, opts?: { hash: string }): string {
    const packets = key.writeOld()
    const hash = this.openpgp.crypto.hash[opts && opts.hash || 'sha256'](packets)
    return base64.fromByteArray(hash)
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
   * @param {*} packet
   *
   * @returns {OpgpKeyId}
   *
   * @memberOf OpenpgpKeyUtils
   */
  private _getPrimaryOpgpKeyId (key: any): Promise<OpgpKeyId> {
    const expires = key.getExpirationTime().then((date: Date) => date.valueOf())
    const status: Promise<number> = key.verifyPrimaryKey()
    return Promise.all([ expires, status ])
    .then(([ expires, status ]) => ({
      ...this.getHashes(key.primaryKey),
      ...this.getPrimaryKeyType(key),
      status,
      expires: expires.valueOf()
    }))
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
  private _getSubkeyOpgpKeyId (key: any, subkey: any): Promise<OpgpKeyId> {
    return subkey.verify(key.primaryKey)
    .then((status: number) => ({ ...this.getHashes(subkey.keyPacket),
      isCiph: !!key.getEncryptionKey(subkey.getKeyId()),
      isAuth: !!key.getSigningKey(subkey.getKeyId()),
      status,
      expires: subkey.getExpirationTime().valueOf()
    }))
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
  return !key.primaryKey.isDecrypted()
}

const getLiveKeyFactory: LiveKeyFactoryBuilder = LiveKeyClass.getFactory
export default getLiveKeyFactory
