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
import { __assign as assign } from 'tslib'

/**
 * @function
 * factory
 *
 * @param {string} handle
 * @param {OpgpKeyBlueprint} blueprint
 *
 * @return {OpgpProxyKey} instance,
 * defensively copied from the arguments
 *
 * @export
 * @interface OpgpProxyKeyFactory
 */
export interface ProxyKeyFactory {
  (handle: string, blueprint: OpgpKeyBlueprint): OpgpProxyKey
}

export interface OpgpProxyKey extends OpgpKeyBlueprint {
  handle: string
}

/**
 *
 */
export interface OpgpKeyBlueprint {
  isLocked: boolean
  isPublic: boolean
  keys: OpgpKeyId[]
  user: OpgpKeyUser
}

export interface OpgpKeyId {
  isAuth: boolean
  isCiph: boolean
  expires: number
  fingerprint: string
  hash: string
  status: number
}

export interface OpgpKeyUser {
  ids: string[]
}

/**
 * @function
 * factory
 *
 * @param {string} handle
 * @param {OpgpKeyBlueprint} blueprint
 *
 * @return {OpgpProxyKey} instance,
 * defensively copied from the arguments
 *
 * @export
 * @interface OpgpProxyKeyFactory
 */
const getProxyKey: ProxyKeyFactory
= function (handle: string, blueprint: OpgpKeyBlueprint): OpgpProxyKey {
  const proxy = <OpgpProxyKey> assign({ handle: handle }, blueprint )
  proxy.keys = blueprint.keys.map(keyId => assign({}, keyId))
  proxy.user = { ids: blueprint.user.ids.slice() }
  return proxy
}

export default getProxyKey