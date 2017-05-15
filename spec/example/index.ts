/**
 * Copyright 2017 Stephane M. Catala
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
import getService, { OpgpProxyKey } from '../../src'
import getResolve from 'resolve-call'
const resolve = getResolve()
import fs = require('fs')
import debug = require('debug')
debug.enable('example:*')
const log = resolve(debug('example:'))

const toKeyRing = resolve((key: OpgpProxyKey) => ({ cipher: key, auth: key }))

const service = getService() // use defaults

const armor = fs.readFileSync(`${__dirname}/<john.doe@example.com>.private.key`, 'utf8')
const passphrase = 'passphrase to decrypt private key'
const secret = 'rob says wow!'

log('import key...')
const key = service.getKeysFromArmor(armor)
const keys = toKeyRing(service.unlock(key, passphrase))

// encrypt with public key, sign with private
const cipher = service.encrypt(keys, secret)
log(cipher) // '-----BEGIN PGP MESSAGE----- ... -----END PGP MESSAGE-----'

// decrypt with decrypted private key, verify signature with public
const plain = service.decrypt(keys, cipher)
log(plain) // 'rob says wow!'