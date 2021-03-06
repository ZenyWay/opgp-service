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
import getLiveKeyFactory, { LiveKeyFactory, OpgpLiveKey } from './live-key'
import getProxyKey, { ProxyKeyFactory, OpgpProxyKey } from './proxy-key'
import { isString, isNumber, isBoolean, isFunction } from './utils'
import getCache, { CsrKeyCache } from 'csrkey-cache'
import * as Promise from 'bluebird'
import getResolve from 'resolve-call'
const resolve = getResolve({ Promise: Promise as any })

export type Eventual<T> = T | PromiseLike<T>
export type OneOrMore<T> = T[] | T

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
   * read or set the current `openpgp.config` settings.
   *
   * @param {OpenpgpConfig=} config
   *
   * @returns {Promise<OpenpgpConfig>}
   * current openpgp settings when `config` is `undefined`
   * or empty or does not include any valid setting entries,
   * otherwise the openpgp settings after applying
   * the valid setting entries from `config`.
   *
   * @memberOf OpgpService
   */
  configure (config?: Eventual<OpenpgpConfig>): Promise<OpenpgpConfig>

  /**
   * @public
   * @method
   *
   * @param {Eventual<KeyRef>} keyRef
   *
   * @returns {boolean} `true` when the given key reference
   * corresponds to a valid cached {OpgpLiveKey},
   * `false` otherwise.
   */
  isValidKeyHandle (keyRef: Eventual<KeyRef>): Promise<boolean>

  /**
   * @public
   * @method
   *
   * Generate a new OpenPGP key pair.
   * Currently only supports RSA keys.
   * Primary and subkey will be of same type.
   *
   * @param {UserId[]|UserId} user
   * e.g. { name:'Phil Zimmermann', email:'phil@openpgp.org' }
   * or 'Phil Zimmermann <phil@openpgp.org>'
   * @param {OpgpKeyOpts={}} opts
   *
   * @error {Error} 'invalid user'
   * @error {Error} 'invalid key options'
   *
   * @returns {Promise<OpgpProxyKey>}
   */
  generateKey (
    user: Eventual<OneOrMore<UserId>>,
    opts?: Eventual<OpgpKeyOpts>
  ): Promise<OpgpProxyKey>
  /**
   * @public
   * @method
   *
   * @param {Eventual<KeyRef>} keyRef
   *
   * @error {Error} 'invalid or stale key reference'
   *
   * @returns {Promise<OpgpProxyKey>} public component of the given key.
   */
  getPublicKey (keyRef: Eventual<KeyRef>): Promise<OpgpProxyKey>
  /**
   * @public
   * @method
   *
   * @param {string} armor
   * @param {OpgpKeyringOpts} [opts] ignored
   *
   * @returns {(Promise<OpgpProxyKey[]|OpgpProxyKey>)} extracted from `armor`
   *
   * @error {Error} 'invalid armor: not a string'
   *
   * @memberOf OpgpService
   */
  getKeysFromArmor (
    armor: Eventual<string>,
    opts?: Eventual<OpgpKeyringOpts>
  ): Promise<OneOrMore<OpgpProxyKey>>
  /**
   * @public
   * @method
   *
   * @param {KeyRef} keyRef
   *
   * @return {Promise<string>}
   * armored string representation of the referenced key.
   *
   * @memberOf OpgpService
   */
  getArmorFromKey (keyRef: Eventual<KeyRef>): Promise<string>
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
   * @error {Error} 'invalid passphrase: not a string'
   *
   * @error {Error} 'invalid or stale key reference'
   *
   * @error {Error} 'no key references'
   *
   * @error {Error} 'key not locked'
   *
   * @error {Error} 'fail to unlock key'
   *
   * @error {Error} from the openpgp decrypt primitive
   *
   * @memberOf OpgpService
   */
  unlock (
    keyRef: Eventual<KeyRef>,
    passphrase: Eventual<string>,
    opts?: Eventual<UnlockOpts>
  ): Promise<OpgpProxyKey>
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
   * @error {Error} 'invalid passphrase: not a string'
   *
   * @error {Error} 'invalid or stale key reference'
   *
   * @error {Error} 'no key references'
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
  lock (
    keyRef: Eventual<KeyRef>,
    passphrase: Eventual<string>,
    opts?: Eventual<LockOpts>
  ): Promise<OpgpProxyKey>
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
   * @error {Error} 'invalid plain text: not a string'
   *
   * @error {Error} 'invalid or stale key reference'
   *
   * @error {Error} 'no key references'
   *
   * @error {Error} 'private key not unlocked'
   *
   * @memberOf OpgpService
   */
  encrypt (
    keyRefs: Eventual<KeyRefMap>,
    plain: Eventual<string>,
    opts?: Eventual<EncryptOpts>
  ): Promise<string>
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
   * @error {Error} 'invalid cipher: not a string'
   *
   * @error {Error} 'invalid or stale key reference'
   *
   * @error {Error} 'no key references'
   *
   * @error {Error} 'private key not unlocked'
   *
   * @memberOf OpgpService
   */
  decrypt (
    keyRefs: Eventual<KeyRefMap>,
    cipher: Eventual<string>,
    opts?: Eventual<DecryptOpts>
  ): Promise<string>
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
   * @error {Error} 'invalid text: not a string'
   *
   * @error {Error} 'invalid or stale key reference'
   *
   * @error {Error} 'no key references'
   *
   * @memberOf OpgpService
   */
  sign (
    keyRefs: Eventual<OneOrMore<KeyRef>>,
    text: Eventual<string>,
    opts?: Eventual<SignOpts>
  ): Promise<string>
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
   * @error {Error} 'invalid armor: not a string'
   *
   * @error {Error} 'invalid or stale key reference'
   *
   * @error {Error} 'no key references'
   *
   * @memberOf OpgpService
   */
  verify (
    keyRefs: Eventual<OneOrMore<KeyRef>>,
    armor: Eventual<string>,
    opts?: Eventual<VerifyOpts>
  ): Promise<string>
}

export interface KeyRefMap {
  auth: OneOrMore<KeyRef>
  cipher: OneOrMore<KeyRef>
}

export type KeyRef = OpgpProxyKey | string

export { OpgpProxyKey }

export interface OpgpKeyOpts {
  /**
   * @prop {String=} passphrase the passphrase used to encrypt the generated key.
   */
  passphrase?: string
  /**
   * @prop {number=4096} size number of bits of the generated key.
   * should be 2048 or 4096.
   */
  size?: number
  /**
   * @prop {boolean=false} unlocked when true, the generated key is unlocked.
   */
  unlocked?: boolean
}

export type UserId = UserIdSpec | string

export interface UserIdSpec {
  name?: string
  email: string
}

/**
 * subset of openpgp's configuration object, as of openpgp 3.1.2
 *
 * @public
 * @interface OpenpgpConfig
 */
export interface OpenpgpConfig {
  prefer_hash_algorithm: number,
  encryption_cipher: number,
  compression: number,
  /**
   * use Authenticated Encryption with Additional Data (AEAD) protection
   * for symmetric encryption.
   *
   * @type {boolean=true}
   * @memberOf OpenpgpConfig
   */
  aead_protect: boolean,
  /**
   * 0 for compatibility with `aead_protect = true` from openpgp@2
   *
   * @type {number=0}
   * @memberOf OpenpgpConfig
   */
  aead_protect_version: number
  /**
   * use integrity protection for symmetric encryption.
   *
   * @type {boolean=true}
   * @memberOf OpenpgpConfig
   */
  integrity_protect: boolean,
  /**
   * fail on decrypt if message is not integrity protected.
   *
   * @type {boolean=false}
   * @memberOf OpenpgpConfig
   */
  ignore_mdc_error: boolean,
  /**
   *
   * @type {boolean=true}
   * @memberOf OpenpgpConfig
   */
  rsa_blinding: boolean,
  /**
   * use native node.js crypto and Web Crypto apis (if available).
   *
   * @type {boolean=true}
   * @memberOf OpenpgpConfig
   */
  use_native: boolean,
  /**
   * use transferable objects between the Web Worker and main thread.
   *
   * @type {boolean=false}
   * @memberOf OpenpgpConfig
   */
  zero_copy: boolean,
  /**
   *
   * @type {boolean=false}
   * @memberOf OpenpgpConfig
   */
  debug: false,
  /**
   *
   * @type {boolean=true}
   * @memberOf OpenpgpConfig
   */
  show_version: true,
  /**
   *
   * @type {boolean=true}
   * @memberOf OpenpgpConfig
   */
  show_comment: true,
  /**
   *
   * @type {string='OpenPGP.js VERSION'}
   * @memberOf OpenpgpConfig
   */
  versionstring: string,
  /**
   *
   * @type {string='http://openpgpjs.org'}
   * @memberOf OpenpgpConfig
   */
  commentstring: string,
  /**
   *
   * @type {string='https://keyserver.ubuntu.com'}
   * @memberOf OpenpgpConfig
   */
  keyserver: string,
  /**
   *
   * @type {string='./openpgp.store'}
   * @memberOf OpenpgpConfig
   */
  node_store: string

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

const OPGP_KEY_DEFAULTS = {
  size: 4096,
  unlocked: false
}

class OpgpServiceClass {
  static getInstance: OpgpServiceFactory = function (
    config?: OpgpServiceFactoryConfig
  ): OpgpService {
    const spec = { ...config }
    const cache = spec.cache || getCache<OpgpLiveKey>()
    const openpgp = getOpenpgp(spec.openpgp)
    const getLiveKey = spec.getLiveKey || getLiveKeyFactory({ openpgp: openpgp })

    const instance = new OpgpServiceClass(
      cache, getLiveKey, spec.getProxyKey || getProxyKey, openpgp
    )

    return OpgpServiceClass.PUBLIC_METHODS.reduce(
      function (service, method) {
        service[method] = resolve(instance[method]).bind(instance)
        return service
      },
      {} as OpgpService
    )
  }

  configure (config?: OpenpgpConfig): Promise<OpenpgpConfig> {
    const openpgp = configureOpenpgp(this.openpgp, config)
    return Promise.resolve({ ...openpgp.config })
  }

  isValidKeyHandle (keyRef: KeyRef): Promise<boolean> {
    return Promise.try(() => this._getCachedLiveKey(keyRef))
    .catch(() => false)
    .then(Boolean)
  }

  generateKey (
    user: OneOrMore<UserId>,
    opts?: OpgpKeyOpts
  ): Promise<OpgpProxyKey> {
    return !isValidUser(user)
    ? reject('invalid user')
    : (
      !isValidKeyOpts(opts)
      ? reject('invalid key options')
      : this._generateKey(toKeySpec(user, opts))
    )
  }

  getPublicKey (keyRef: KeyRef): Promise<OpgpProxyKey> {
    return Promise.try(() => this._getCachedLiveKey(keyRef))
    .then(
      key => key.bp.isPublic
      ? this.getProxyKey(getHandle(keyRef) as string, key.bp) // handle is available after this#getCachedLiveKey
      : key.toPublicKey().then(key => this._cacheAndProxyKey(key)) // cache a new public ProxyKey instance
    )
  }

  getKeysFromArmor (armor: string, opts?: OpgpKeyringOpts)
  : Promise<OneOrMore<OpgpProxyKey>> {
    return !isString(armor)
    ? reject('invalid armor: not a string')
    : Promise.try(
      () => {
        const keys: Promise<OpgpProxyKey[]> =
        this.openpgp.key.readArmored(armor).keys
        .map(
          (key: any) => this.getLiveKey(key)
            .then(key => this._cacheAndProxyKey(key))
        )

        return Promise.all(keys)
        .then(keys => keys.length > 1 ? keys : keys[0])
      }
    )
  }

  getArmorFromKey (keyRef: KeyRef): Promise<string> {
    return Promise.try(() => this._getCachedLiveKey(keyRef).armor())
  }

  unlock (
    keyRef: KeyRef,
    passphrase: string,
    opts?: UnlockOpts
  ): Promise<OpgpProxyKey> {
    return !isString(passphrase)
    ? reject('invalid passphrase: not a string')
    : Promise.try(() => this._getCachedLiveKey(keyRef).unlock(passphrase))
      .then(unlocked => this._cacheAndProxyKey(unlocked))
  }

  lock (
    keyRef: KeyRef,
    passphrase: string,
    opts?: LockOpts
  ): Promise<OpgpProxyKey> {
    return !isString(passphrase)
    ? reject('invalid passphrase: not a string')
    : Promise.try<OpgpLiveKey>(
        () => {
          const livekey = this._getCachedLiveKey(keyRef)
          if (livekey.bp.isLocked) { // avoid unnecessary invalidation
            return reject('key not unlocked')
          }
          const handle = getHandle(keyRef) as string // always valid because already successfully fetched from cache
          this.cache.del(handle) // systematically invalidate original key from cache before mutation
          return livekey.lock(passphrase) // mutates original key, regardless of outcome !
        }
      )
      .then(locked => this._cacheAndProxyKey(locked))
  }

  encrypt (
    keyRefs: KeyRefMap,
    plain: string,
    opts?: EncryptOpts
  ): Promise<string> {
    return !isString(plain)
    ? reject('invalid plain text: not a string')
    : Promise.try(
        () => this.openpgp.encrypt({
          privateKeys: this._getCachedPrivateOpenpgpKeys(keyRefs.auth),
          publicKeys: this._getCachedOpenpgpKeys(keyRefs.cipher),
          data: plain
        })
      )
      .get('data')
  }

  decrypt (
    keyRefs: KeyRefMap,
    cipher: string,
    opts?: DecryptOpts
  ): Promise<string> {
    return !isString(cipher)
    ? reject('invalid cipher: not a string')
    : Promise.try(
        () => this.openpgp.decrypt({
          privateKeys: this._getCachedPrivateOpenpgpKeys(keyRefs.cipher)[0],
          publicKeys: this._getCachedOpenpgpKeys(keyRefs.auth),
          message: this.openpgp.message.readArmored(cipher)
        })
      )
      .then(
        function ({ data, signatures }: { data: string, signatures: any[] }) {
          const invalid = getKeysOfInvalidSignatures(signatures).join()
          return invalid
          ? reject('authentication failed: ' + invalid)
          : data
        }
      )
  }

  sign (
    keyRefs: OneOrMore<KeyRef>,
    text: string,
    opts?: SignOpts
  ): Promise<string> {
    return Promise.try(
      () => {
        const keys = this._getCachedOpenpgpKeys(keyRefs)

        if (!isString(text)) { return reject('invalid text: not a string') }
        const message = this.openpgp.message.fromText(text)

        return message.sign(keys).then((signed: any) => signed.armor())
      }
    )
  }

  verify (
    keyRefs: OneOrMore<KeyRef>,
    armor: string,
    opts?: VerifyOpts
  ): Promise<string> {
    return Promise.try(
      () => {
        const keys = this._getCachedOpenpgpKeys(keyRefs)

        if (!isString(armor)) { return reject('invalid armor: not a string') }
        const message = this.openpgp.message.readArmored(armor)

        return message.verify(keys)
        .then(
          function (verified: any[]) {
            const invalid = getKeysOfInvalidSignatures(verified).join()
            return invalid
            ? reject('authentication failed: ' + invalid)
            : message.getText()
          }
        )
      }
    )
  }

  constructor (
    private cache: CsrKeyCache<OpgpLiveKey>,
    private getLiveKey: LiveKeyFactory,
    private getProxyKey: ProxyKeyFactory,
    private openpgp: any
  ) {}

  private static PUBLIC_METHODS = [
    'configure',
    'isValidKeyHandle',
    'generateKey',
    'getPublicKey',
    'getKeysFromArmor',
    'getArmorFromKey',
    'unlock',
    'lock',
    'encrypt',
    'decrypt',
    'sign',
    'verify'
  ]

  private _generateKey (spec: OpenpgpKeySpec): Promise<OpgpProxyKey> {
    const { unlocked, ...opts } = spec
    return Promise.try(() => this.openpgp.key.generate(opts))
      .then(key => Object.assign(key, { revocationSignatures: [] })) // ignore revocation certificate
      .then(key => !unlocked ? key : unlockKey(key, opts.passphrase))
      .then(key => this.getLiveKey(key))
      .then(livekey => this._cacheAndProxyKey(livekey))
  }

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
  private _getCachedLiveKey (keyRef: KeyRef): OpgpLiveKey {
    const handle = getHandle(keyRef)
    const livekey = handle && this.cache.get(handle)
    if (!livekey) {
      throw new Error('invalid key reference: not a string or stale')
    }
    return livekey
  }

  /**
   * @private
   * @method
   *
   * @param {(KeyRef[]|KeyRef)} keyRefs
   * key proxies and/or handles from key proxies
   *
   * @returns {OpgpLiveKey[]}
   * from cache when proxies/handles are valid and not stale
   *
   * @error {Error} 'invalid or stale key reference'
   *
   * @error {Error} 'no key references'
   *
   * @memberOf OpgpServiceClass
   */
  private _getCachedLiveKeys (keyRefs: KeyRef[] | KeyRef): OpgpLiveKey[] {
    const refs = [].concat(keyRefs)
    if (!refs.length) { throw new Error('no key references') }

    return refs.map(keyRef => this._getCachedLiveKey(keyRef))
  }

  /**
   * @private
   * @method
   *
   * @param {(KeyRef[]|KeyRef)} keyRefs
   * key proxies and/or handles from key proxies
   *
   * @returns {any[]} openpgp key
   * from cache when proxies/handles are valid and not stale
   *
   * @error {Error} 'invalid or stale key reference'
   *
   * @error {Error} 'no key references'
   *
   * @memberOf OpgpServiceClass
   */
  private _getCachedOpenpgpKeys (keyRefs: KeyRef[] | KeyRef): any[] {
    return this._getCachedLiveKeys(keyRefs).map(livekey => livekey.key)
  }

  /**
   * @private
   * @method
   *
   * @param {(KeyRef[]|KeyRef)} keyRefs
   * key proxies and/or handles from key proxies
   *
   * @returns {any[]} private openpgp key
   * from cache when proxies/handles are valid, not stale and not locked
   *
   * @error {Error} 'invalid or stale key reference'
   *
   * @error {Error} 'no key references'
   *
   * @error {Error} 'private key not unlocked'
   *
   * @memberOf OpgpServiceClass
   */
  private _getCachedPrivateOpenpgpKeys (keyRefs: KeyRef[] | KeyRef): any[] {
    const keys = this._getCachedLiveKeys(keyRefs)
    if (keys.some(key => key.bp.isLocked)) {
      throw new Error('private key not unlocked')
    }
    return keys.map(livekey => livekey.key)
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
  private _cacheAndProxyKey (livekey: OpgpLiveKey): OpgpProxyKey {
    const handle = this.cache.set(livekey)
    if (!handle) { throw new Error('fail to cache key') }
    return this.getProxyKey(handle, livekey.bp)
  }
}

function unlockKey (key: any, passphrase: string) {
  return key.decrypt(passphrase).then(
    (unlocked: boolean) => !unlocked
    ? reject('fail to unlock key')
    : key
  )
}

function getKeysOfInvalidSignatures (
  verifications: { keyid: string, valid: boolean }[]
) {
  return verifications.filter(({ valid }) => !valid).map(({ keyid }) => keyid)
}
/*
}
*/

function reject <T> (reason: string): Promise<T> {
  return Promise.reject(new Error(reason))
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
function getHandle (keyRef: KeyRef): string | false {
  const handle = isString(keyRef) ? keyRef : !!keyRef && keyRef.handle
  return isString(handle) && handle
}

/**
 * default settings for `openpgp.config`
 */
const OPENPGP_CONFIG_DEFAULTS = {
  aead_protect: true,
  aead_protect_version: 0
} as OpenpgpConfig

/**
 * @private
 * @function
 *
 * @param {*=} config
 * an openpgp configuration object or a configured openpgp instance
 *
 * @returns {*}
 * * the given `config` object, when it is an `openpgp` instance,
 * * otherwise the default `openpgp` instance,
 * configured with the `config` object assigned to `openpgp.config`,
 * or [default settings]{@link OPENPGP_CONFIG_DEFAULTS}.
 */
function getOpenpgp (config?: any): any {
  if (isOpenpgp(config)) { return config }
  const openpgp = require('openpgp')
  return configureOpenpgp(openpgp, OPENPGP_CONFIG_DEFAULTS, config)
}

function isOpenpgp (val: any): boolean {
  return !!val
  && [ 'config', 'crypto', 'key', 'message' ].every(prop => !!val[prop])
  && [
    val.encrypt, val.decrypt,
    val.crypto.hash && val.crypto.hash.sha256,
    val.key.readArmored, val.key.generate,
    val.message.fromText, val.message.readArmored
  ].every(fun => isFunction(fun))
}

/**
 * @private
 * @function
 *
 * @description
 * assign properties of a given {OpenpgpConfig} objects onto `openpgp.config`.
 * only valid properties of the given objects are assigned to `openpgp.config`.
 * as with `Object.assign`, valid properties of later objects
 * overwrite earlier ones.
 *
 * @param {*} openpgp
 *
 * @param {...OpenpgpConfig[]=} configs
 *
 * @return {openpgp} the given `openpgp` instance,
 * configured with the given {OpenpgpConfig} objects.
 */
function configureOpenpgp (openpgp: any, ...configs: OpenpgpConfig[]): any {
  const args = [ openpgp.config ].concat(configs.map(toValidOpenpgpConfig))
  Object.assign.apply(Object, args)
  return openpgp
}

const OPENPGP_CONFIG_INTERFACE = {
  'prefer_hash_algorithm': isNumber,
  'encryption_cipher': isNumber,
  'compression': isNumber,
  'aead_protect': isBoolean,
  'aead_protect_version': isNumber,
  'integrity_protect': isBoolean,
  'ignore_mdc_error': isBoolean,
  'rsa_blinding': isBoolean,
  'use_native': isBoolean,
  'zero_copy': isBoolean,
  'debug': isBoolean,
  'show_version': isBoolean,
  'show_comment': isBoolean,
  'versionstring': isString,
  'commentstring': isString,
  'keyserver': isString,
  'node_store': isString
}

/**
 * @private
 * @function
 *
 * @param {*} val
 *
 * @returns {OpenpgpConfig} including only valid openpgp configuration entries
 * from `val`, if any.
 */
function toValidOpenpgpConfig (val: any): OpenpgpConfig {
  return Object.keys(val || {})
  .reduce(
    function (config, key) {
      const isValid: (val: any) => boolean = OPENPGP_CONFIG_INTERFACE[key]
      if (!isValid) { return config } // key not known
      const value = val[key]
      if (!isValid(value)) { return config } // invalid value type
      config[key] = value
      return config
    },
    {} as OpenpgpConfig)
}

function isValidUser (val: any): val is UserId[] | UserId {
  if (Array.isArray(val)) { return val.every(isValidUser) }
  return isString(val)
  || !!val && isString(val.email) && (!name || isString(val.name))
}

function isValidKeyOpts (val: any): boolean {
  return !val
  || (!val.passphrase || isString(val.passphrase))
  && (!val.size || isNumber(val.size))
  && (!val.unlocked || isBoolean(val.unlocked))
}

interface OpenpgpKeySpec {
  userIds: UserId[]
  passphrase?: string
  numBits?: number
  date?: Date
  keyExpirationTime?: number
  subkeys?: OpenpgpKeySpec[]
  unlocked?: false
}

function toKeySpec (
  user: UserId[] | UserId,
  opts: OpgpKeyOpts
): OpenpgpKeySpec {
  if (!Array.isArray(user)) { return toKeySpec([user], opts) }
  const config = {
    ...OPGP_KEY_DEFAULTS,
    ...opts,
    user: user.map(normalizeUser)
  }
  const spec = {
    userIds: config.user,
    numBits: config.size,
    date: new Date(),
    keyExpirationTime: 0, // currently not supported
    subkeys: [{}], // compatible with openpgp@2: subkey specs = primary specs
    unlocked: config.unlocked
  } as OpenpgpKeySpec
  if (config.passphrase) { spec.passphrase = config.passphrase }
  return spec
}

const IS_EMAIL_LIKE = /^[^@]+@[^@]+$/
/**
 * map {UserId} to {string}.
 * openpgp@3.1.2 requires the user id to be a RFC2822-compliant email address.
 * when the input {UserId} is a string which does not resemble an email address,
 * appends '@opgp-service.npm.com' to that string.
 */
function normalizeUser (user: UserId): string {
  return isString(user)
  ? IS_EMAIL_LIKE.test(user) ? user : `${user}@opgp-service.npm.com`
  : user.name ? `${user.name} <${user.email}>` : user.email
}

const getOpgpService = OpgpServiceClass.getInstance
export default getOpgpService
