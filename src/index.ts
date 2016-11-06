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
import getLiveKeyFactory, { LiveKeyFactory, OpgpLiveKey } from './live-key'
import getProxyKey, { ProxyKeyFactory, OpgpProxyKey } from './proxy-key'
import { isString } from './utils'
import getCache, { CsrKeyCache } from 'csrkey-cache'
import * as Promise from 'bluebird'
import { __assign as assign } from 'tslib'

export interface OpgpServiceFactory {
  (config?: OpgpServiceFactoryConfig): OpgpService
}

export interface OpgpServiceFactoryConfig {
  cache?: CsrKeyCache<OpgpLiveKey>
  getLiveKey?: LiveKeyFactory
  getProxyKey?: ProxyKeyFactory
  openpgp?: any
}

export interface OpgpService {
  /**
   * @public
   * @method
   *
   * Generate a new OpenPGP key pair.
   * Currently only supports RSA keys.
   * Primary and subkey will be of same type.
   *
   * @param {String} passphrase the passphrase used to encrypt the generated key.
   * @param {OpgpKeyOpts={}} opts
   *
   * @returns {Promise<OpgpProxyKey>}
   */
  generateKey (passphrase: string, opts?: OpgpKeyOpts): Promise<OpgpProxyKey>
  /**
   * @public
   * @method
   *
   * @param {string} armor
   * @param {OpgpKeyringOpts} [opts] ignored
   *
   * @returns {(Promise<OpgpProxyKey[]|OpgpProxyKey>)} extracted from `armor`
   *
   * @memberOf OpgpService
   */
  getKeysFromArmor (armor: string, opts?: OpgpKeyringOpts): Promise<OpgpProxyKey[]|OpgpProxyKey>
  /**
   * @public
   * @method
   *
   * @param {KeyRef} keyRef reference of key to unlock.
   * @param {string} passphrase for unlocking referenced key.
   * @param {UnlockOpts=} opts ignored
   *
   * @returns {Promise<OpgpProxyKey>} new unlocked instance
   *
   * @error {Error} 'key not locked'
   *
   * @error {Error} 'fail to unlock key'
   *
   * @error {Error} from the openpgp decrypt primitive
   *
   * @memberOf OpgpService
   */
  unlock (keyRef: KeyRef, passphrase: string, opts?: UnlockOpts): Promise<OpgpProxyKey>
  /**
   * @public
   * @method
   *
   * WARNING: unfortunately, this method mutates the underlying openpgp key !
   *
   * to help prevent unpleasant surprises,
   * the referenced {OpgpProxyKey} instance is systematically invalidated
   * when calling this method:
   * subsequent calls to any {OpgpService} methods with this instance
   * will consistently be rejected.
   *
   * @param {KeyRef} keyRef reference of key to unlock.
   * always discard this {OpgpProxyKey} instance after calling this method.
   * @param {string} passphrase
   * @param {LockOpts} [opts]
   *
   * @returns {Promise<OpgpProxyKey>} new locked instance
   *
   * @error {Error} 'key not unlocked'
   * the referenced {OpgpProxyKey} and its corresponding {OpgpLiveKey}
   * are not mutated.
   *
   * @error {Error} from the openpgp key primitive
   * the referenced {OpgpProxyKey} and its corresponding {OpgpLiveKey}
   * are in an undefined state and should be discarded!
   *
   * @memberOf OpgpService
   */
  lock (keyRef: KeyRef, passphrase: string, opts?: LockOpts): Promise<OpgpProxyKey>
  /**
   * @public
   * @method
   *
   * @param {KeyProxyMap} keyRefs
   * must include both private authentication keys
   * with which to sign the message,
   * and the public encryption keys.
   * @param {string} plain text
   * @param {EncryptOpts} [opts] ignored
   *
   * @returns {Promise<string>} signed and encrypted text.
   *
   * @error {Error} when encryption fails
   *
   * @memberOf OpgpService
   */
  encrypt (keyRefs: KeyRefMap, plain: string, opts?: EncryptOpts): Promise<string>
  /**
   * @public
   * @method
   *
   * @param {KeyProxyMap} keyRefs
   * must include both the private decryption key,
   * and public authentication keys
   * with which to verify the message signatures.
   * @param {string} cipher text
   * @param {DecryptOpts} [opts] ignored
   *
   * @returns {Promise<string>} authenticated and decrypted plain text.
   *
   * @error {Error} when decryption fails
   *
   * @memberOf OpgpService
   */
  decrypt (keyRefs: KeyRefMap, cipher: string, opts?: DecryptOpts): Promise<string>
  /**
   * @public
   * @method
   *
   * @param {KeyRef[]|KeyRef} keyRefs of private authentication keys
   * with which to sign the message.
   * @param {string} text
   * @param {SignOpts} [opts] ignored
   *
   * @returns {Promise<string>} signed text.
   *
   * @error {Error} when signature fails
   *
   * @memberOf OpgpService
   */
  sign (keyRefs: KeyRef[]|KeyRef, text: string, opts?: SignOpts): Promise<string>
  /**
   * @public
   * @method
   *
   * @param {KeyRef[]|KeyRef} keyRefs of public authentication keys
   * with which to verify the message signatures.
   * @param {string} armor text
   * @param {SignOpts} [opts] ignored
   *
   * @returns {Promise<string>} verified plain text.
   *
   * @error {Error} when verification fails.
   * tail of error message lists all IDs of keys for which authentication fails.
   *
   * @memberOf OpgpService
   */
  verify (keyRefs: KeyRef[]|KeyRef, armor: string, opts?: VerifyOpts): Promise<string>
}

export type KeyRef = OpgpProxyKey|string

export interface KeyRefMap {
  auth: KeyRef[]|KeyRef
  cipher: KeyRef[]|KeyRef
}

export interface OpgpKeyOpts {
  /**
   * @prop {number=4096} size number of bits of the generated key.
   * should be 2048 or 4096.
   */
  size: number
  /**
   * @prop {boolean=false} unlocked when true, the generated key is unlocked.
   */
  unlocked: boolean
  /**
   * @prop {(UserId[]|UserId)=} users
   * e.g. { name:'Phil Zimmermann', email:'phil@openpgp.org' }
   * or 'Phil Zimmermann <phil@openpgp.org>'
   */
  users: UserId[]|UserId
}

export type UserId = UserIdSpec|string

export interface UserIdSpec {
  name?: string
  email: string
}

export interface OpgpKeyringOpts {}

export interface UnlockOpts {}

export interface LockOpts {}

export interface EncryptOpts {}

export interface DecryptOpts {}

export interface SignOpts {}

export interface VerifyOpts {}

export interface CommonOpts {
  /**
   * time lapse in milliseconds after which
   * the returned {LiveKey}
   *
   * @type {number}
   * @memberOf CommonOpts
   */
  valid: number
}

class OpgpServiceClass implements OpgpService {
  static getInstance: OpgpServiceFactory =
  function (config?: OpgpServiceFactoryConfig): OpgpService {
    const spec = assign({}, config)
    const cache = spec.cache || getCache<OpgpLiveKey>()
    const openpgp = getOpenpgp(spec.openpgp)
    const getLiveKey = spec.getLiveKey || getLiveKeyFactory(openpgp)
    return new OpgpServiceClass(cache, getLiveKey, spec.getProxyKey || getProxyKey, openpgp)
  }

  generateKey (passphrase: string, opts?: OpgpKeyOpts): Promise<OpgpProxyKey> {
    return Promise.try(() => {
      const options = {
        userIds: opts && [].concat(opts.users),
        passphrase: passphrase,
        numBits: opts && opts.size || 4096,
        unlocked: opts && !!opts.unlocked
      }

    	return this.openpgp.key.generateKey(options)
			.then((key: any) => this.cacheAndProxyKey(this.getLiveKey(key)))
    })
  }

  getKeysFromArmor (armor: string, opts?: OpgpKeyringOpts)
  : Promise<OpgpProxyKey[]|OpgpProxyKey> {
  	return Promise.try(() => {
    	const keys = this.openpgp.key.readArmored(armor).keys
			.map((key: any) => this.cacheAndProxyKey(this.getLiveKey(key)))

      return keys.length > 1 ? keys : keys[0]
    })
  }

  unlock (keyRef: KeyRef, passphrase: string, opts?: UnlockOpts): Promise<OpgpProxyKey> {
    return Promise.try(() => this.getCachedLiveKey(keyRef).unlock(passphrase))
    .then(unlocked => this.cacheAndProxyKey(unlocked))
  }

  lock (keyRef: KeyRef, passphrase: string, opts?: LockOpts): Promise<OpgpProxyKey> {
    return Promise.try(() => {
      const livekey = this.getCachedLiveKey(keyRef)
      if (livekey.bp.isLocked) { // avoid unnecessary invalidation
        return Promise.reject(new Error('key not unlocked'))
      }
      const handle = <string>getHandle(keyRef) // always valid because already successfully fetched from cache
      this.cache.del(handle) // systematically invalidate original key from cache before mutation
      return livekey.lock(passphrase) // mutates original key, regardless of outcome !
    })
    .then(locked => this.cacheAndProxyKey(locked))
  }

  encrypt (keyRefs: KeyRefMap, plain: string, opts?: EncryptOpts): Promise<string> {
    return
  }

  decrypt (keyRefs: KeyRefMap, cipher: string, opts?: DecryptOpts): Promise<string> {
    return
  }

  sign (keyRefs: KeyRef[]|KeyRef, text: string, opts?: SignOpts): Promise<string> {
  	return Promise.try(() => {
      const keys = [].concat(keyRefs)
      .map(keyRef => this.getCachedLiveKey(keyRef))

      if (!isString(text)) { return Promise.reject(new Error('invalid text: not a string')) }
      const message = this.openpgp.message.fromText(text)

      return message.sign(keys).armor()
    })
  }

  verify (keyRefs: KeyRef[]|KeyRef, armor: string, opts?: VerifyOpts): Promise<string> {
  	return Promise.try(() => {
      const keys = [].concat(keyRefs)
      .map(keyRef => this.getCachedLiveKey(keyRef))

      if (!isString(armor)) { return Promise.reject(new Error('invalid armor: not a string')) }
      const message = this.openpgp.message.readArmored(armor)

      /**
       * comma-separated list of IDs of keys for which authenticaion fails
       */
      const invalid = message.verify(keys)
      .filter((key: any) => !key.valid)
      .map((key: any) => key.keyid)
      .join()

      return !invalid ? message.getText()
      : Promise.reject(new Error('authentication failed: ' + invalid))
    })
  }

  constructor (
    private cache: CsrKeyCache<OpgpLiveKey>,
    private getLiveKey: LiveKeyFactory,
    private getProxyKey: ProxyKeyFactory,
    private openpgp: any
  ) {}

  /**
   * @private
   * @method
   *
   * @param {KeyRef} keyRef
   * key proxy or handle from key proxy
   *
   * @returns {OpgpLiveKey}
   * from cache when proxy/handle is valid and not stale
   *
   * @error {Error} 'invalid or stale key reference'
   *
   * @memberOf OpgpServiceClass
   */
  getCachedLiveKey (keyRef: KeyRef): OpgpLiveKey {
    const handle = getHandle(keyRef)
    const livekey = handle && this.cache.get(handle)
    if (!livekey) { throw new Error('invalid key reference: not a string or stale') }
    return livekey
  }

  /**
   * @private
   * @method
   *
   * cache the given livekey, and create a corresponding {OpgpProxyKey}.
   *
   * @param {OpgpLiveKey} livekey
   *
   * @returns {OpgpProxyKey} of the cached `livekey`
   *
   * @error {Error} 'fail to cache key'
   *
   * @memberOf OpgpServiceClass
   */
  cacheAndProxyKey (livekey: OpgpLiveKey): OpgpProxyKey {
    const handle = this.cache.set(livekey)
    if (!handle) {
      throw new Error('fail to cache key')
    }
    return this.getProxyKey(handle, livekey.bp)
  }
}

/**
 * @private
 * @function
 *
 * @param {KeyRef} keyRef
 *
 * @returns {string|false}
 * `false` when a `string` handle could not be extracted from the given `keyRef`
 */
function getHandle (keyRef: KeyRef): string|false {
  const handle = isString(keyRef) ? keyRef : !!keyRef && keyRef.handle
  return isString(handle) && handle
}

function getOpenpgp (config: any): any {
  const openpgp = isOpenpgp(config) ? config : require('openpgp')
  // TODO configure openpgp
  return openpgp
}

function isOpenpgp (val: any): boolean {
  return !!val && [ 'crypto', 'key', 'message' ]
  .every(prop => !!val[prop])
}

const getOpgpService = OpgpServiceClass.getInstance
export default getOpgpService