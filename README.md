# opgp-service [![Join the chat at https://gitter.im/ZenyWay/opgp-service](https://badges.gitter.im/ZenyWay/opgp-service.svg)](https://gitter.im/ZenyWay/opgp-service?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![NPM](https://nodei.co/npm/opgp-service.png?compact=true)](https://nodei.co/npm/opgp-service/)
[![build status](https://travis-ci.org/ZenyWay/opgp-service.svg?branch=master)](https://travis-ci.org/ZenyWay/opgp-service)
[![coverage status](https://coveralls.io/repos/github/ZenyWay/opgp-service/badge.svg?branch=master)](https://coveralls.io/github/ZenyWay/opgp-service)
[![Dependency Status](https://gemnasium.com/badges/github.com/ZenyWay/opgp-service.svg)](https://gemnasium.com/github.com/ZenyWay/opgp-service)

a fully async API for [openpgp](https://openpgpjs.org/)
that builds on ephemeral immutable keys and
that does not leak cryptographic material.

together with [worker-proxy](https://www.npmjs.com/package/worker-proxy),
this service can [easily be run in a WebWorker](https://gist.github.com/smcatala/bee0f411b08ec45933cb69264812a62e),
confining the cryptographic material into a dedicated thread.

## cryptographic material is encapsulated
client code operates on mere proxies of the openpgp keys, not the latter.

each key proxy includes a handle (reference) to the corresponding openpgp key.
the handle is a unique cryptographically secure random string,
completely independent from the referenced cryptographic material,
which remains well contained within the `opgp-service` instance
and does not leak into client code.

## keys are ephemeral
the service invalidates proxy handles if not used during a defined time lapse.
after a key proxy is invalidated,
client code can still fetch a new instance from the service, whenever required.

## keys are immutable
the service also invalidates a proxy handle when an openpgp operation
mutates a key's state.

in the current API, only the `lock` method, which encrypts a private key,
mutates the key.
when a key is locked, all proxies to the unlocked state become stale.

key proxies always represent a key in an immutable state.
this hinders coupling in client code through the service API.

## fully async: reads like sync
async all the way makes it easy to write code that [reads like synchronous code](https://www.npmjs.com/package/resolve-call),
and streamlines error-control flow.
* all API methods return a `Promise`.
* any exception thrown by `openpgp` is converted into a rejected `Promise`.

# <a name="example"></a> EXAMPLE
```javascript
import getService from 'opgp-service'
import getResolve from 'resolve-call'
const resolve = getResolve()
import fs = require('fs')
import debug = require('debug')
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

// decrypt with private key, verify signature with public
const plain = service.decrypt(keys, cipher)
log(plain) // 'rob says wow!'
```
note that although the above code reads like synchronous code,
it is in fact fully async.
the files of this example are available [here](./spec/example).

a live version of this example can be viewed [here](https://cdn.rawgit.com/ZenyWay/opgp-service/v2.1.0/spec/example/index.html)
in the browser console,
or by cloning this repository and running the following commands from a terminal:
```bash
npm install
npm run example
```

# <a name="api"></a> API 2.0 stable
the current version exposes the following service methods:
* configure
* generateKey, getKeysFromArmor, getArmorFromKey
* unlock, lock
* encrypt, decrypt
* sign, verify

all methods accept arguments that may be either immediately available,
or a Promise that eventually resolves, and return a Promise,
as demonstrated in the above example.

for a detailed specification of the API
* run the [unit tests](https://cdn.rawgit.com/ZenyWay/opgp-service/v2.1.0/spec/web/index.html)
in your browser,
* or check the [public interface declaration](./src/index.ts#L24-L414)
in the source code.

# <a name="contributing"></a> CONTRIBUTING
see the [contribution guidelines](./CONTRIBUTING.md)

# <a name="license"></a> LICENSE
Copyright 2016 Stéphane M. Catala

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the [License](./LICENSE) for the specific language governing permissions and
Limitations under the License.
