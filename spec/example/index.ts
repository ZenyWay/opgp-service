/**
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
import getService, { OpgpProxyKey } from '../../src'
import * as Promise from 'bluebird'
import fs = require('fs')
const log = console.log.bind(console)

const service = getService() // use defaults

const armor = fs.readFileSync(`${__dirname}/<john.doe@example.com>.private.key`, 'utf8')
const passphrase = 'passphrase to decrypt private key'
const secret = 'rob says wow!'

log('import key...')
const key = <Promise<OpgpProxyKey>> service.getKeysFromArmor(armor)
.tap(() => log('key successfully imported!\nnow unlock key...'))

const unlocked = key.then(key => service.unlock(key, passphrase))
.tap(() => log(`key successfully unlocked!\nnow encrypt then decrypt '${secret}'...`))

// encrypt with public key, sign with private
const cipher = unlocked
.then(key => service.encrypt({ cipher: key, auth: key }, secret))
.tap(log) // '-----BEGIN PGP MESSAGE----- ... -----END PGP MESSAGE-----'

// decrypt with decrypted private key, verify signature with public
const plain = Promise.join(unlocked, cipher,
(key, cipher) => service.decrypt({ cipher: key, auth: key }, cipher))
.tap(log) // 'rob says wow!'