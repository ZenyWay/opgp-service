# opgp-service [![Join the chat at https://gitter.im/ZenyWay/opgp-service](https://badges.gitter.im/ZenyWay/opgp-service.svg)](https://gitter.im/ZenyWay/opgp-service?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![NPM](https://nodei.co/npm/opgp-service.png?compact=true)](https://nodei.co/npm/opgp-service/)
[![build status](https://travis-ci.org/ZenyWay/opgp-service.svg?branch=master)](https://travis-ci.org/ZenyWay/opgp-service)
[![coverage status](https://coveralls.io/repos/github/ZenyWay/opgp-service/badge.svg?branch=master)](https://coveralls.io/github/ZenyWay/opgp-service)
[![Dependency Status](https://gemnasium.com/badges/github.com/ZenyWay/opgp-service.svg)](https://gemnasium.com/github.com/ZenyWay/opgp-service)

a thin wrapper for openpgp exposing core functionality
built on ephemeral immutable keys
over an API that does not leak cryptographic material.

together with [worker-proxy](https://www.npmjs.com/package/worker-proxy),
this service can easily be run in a WebWorker,
confining the cryptographic material in a dedicated thread.

## cryptographic material is encapsulated
client code manages proxies of the openpgp keys,
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

in the current API, only the `lock` method which encrypts a private key
hence clearly mutates the key.
after a key is locked by the service,
all proxies to the unlocked state become invalid.

key proxies always represent a key in an immutable state.
this hinders coupling in client code through the service API.

# <a name="example"></a> EXAMPLE
```javascript
import getService from 'opgp-service'
import * as bluebird from 'bluebird'

const service = getService()

const armor =
  ['-----BEGIN PGP PRIVATE KEY BLOCK-----',
    'Version: GnuPG v2.0.19 (GNU/Linux)',
    /* ... left out for brevity ... */
    '-----END PGP PRIVATE KEY BLOCK-----'].join('\n')
const passphrase = 'passphrase to decrypt private key'

// import the key and unlock it
const key = service.getKeysFromArmor(armor).then(keys => keys[0])
const unlocked = key.then(key => service.unlock(key.handle, secret))

// encrypt with public key
const cipher = key.then(key => service.encode(key.handle, 'rob says wow!'))
.tap(log)

// decrypt with decrypted private key
const plain = Promise.join(unlocked, cipher,
  (unlocked, cipher) => service.decode(unlocked.handle, cipher))
.tap(log)
```

# <a name="api"></a> API
run the [unit tests](https://cdn.rawgit.com/ZenyWay/opgp-service/master/spec/web/index.html)
in your browser.

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
