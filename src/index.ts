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
   * @param {KeyProxyMap} proxies
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
  encrypt (proxies: ProxyKeyMap, plain: string, opts?: EncryptOpts): Promise<string>
  /**
   * @public
   * @method
   *
   * @param {KeyProxyMap} proxies
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
  decrypt (proxies: ProxyKeyMap, cipher: string, opts?: DecryptOpts): Promise<string>
  /**
   * @public
   * @method
   *
   * @param {(OpgpProxyKey|string)[]} proxies of private authentication keys
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
  sign (proxy: (OpgpProxyKey|string)[], text: string, opts?: SignOpts): Promise<string>
  /**
   * @public
   * @method
   *
   * @param {(OpgpProxyKey|string)[]} proxies of public authentication keys
   * with which to verify the message signatures.
   * @param {string} armor text
   * @param {SignOpts} [opts] ignored
   *
   * @returns {Promise<string>} verified plain text.
   *
   * @error {Error} when verification fails
   *
   * @memberOf OpgpService
   */
  verify (proxy: (OpgpProxyKey|string)[], armor: string, opts?: VerifyOpts): Promise<string>
}

export interface ProxyKeyMap {
  auth: (OpgpProxyKey|string)[]
  cipher: (OpgpProxyKey|string)[]
}

export interface OpgpKeyringOpts {}

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

  getKeysFromArmor (armor: string, opts?: OpgpKeyringOpts)
  : Promise<OpgpProxyKey[]|OpgpProxyKey> {
  	return Promise.try(() => {
    	const keys = this.openpgp.key.readArmored(armor).keys
			.map((key: any) => {
      	const livekey = this.getLiveKey(key)
        const handle = this.cache.set(livekey)
      	return handle ? this.getProxyKey(handle, livekey.bp)
        : Promise.reject(new Error('unrecoverable error'))
      })
      return keys.length > 1 ? keys : keys[0]
    })
  }

  encrypt (proxies: ProxyKeyMap, plain: string, opts?: EncryptOpts): Promise<string> {
    return
  }

  decrypt (proxies: ProxyKeyMap, cipher: string, opts?: DecryptOpts): Promise<string> {
    return
  }

  sign (proxy: (OpgpProxyKey|string)[], text: string, opts?: SignOpts): Promise<string> {
    return
  }

  verify (proxy: (OpgpProxyKey|string)[], armor: string, opts?: VerifyOpts): Promise<string> {
    return
  }

  constructor (
    private cache: CsrKeyCache<OpgpLiveKey>,
    private getLiveKey: LiveKeyFactory,
    private getProxyKey: ProxyKeyFactory,
    private openpgp: any
  ) {}
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