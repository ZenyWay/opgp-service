(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";var src_1=require("../../src"),Promise=require("bluebird"),log=console.log.bind(console),service=src_1.default(),armor="-----BEGIN PGP PRIVATE KEY BLOCK-----\nVersion: GnuPG v1\n\nlQc9BFggrQEBEAC9H7HUCc+pIBxbAoyKxR+8gNj2dB4vdwPqI51Ufsr4JpgMvRxB\nHfX18Ua3GbFQiBmhSasmbk0yj26Gx9Y6+j7OKTIXzmCu80vFTRXqWQuJkfwv7+KK\nfHX8TQ7D165g4ez+h+cQYBSli7OgCRzypd1EgNXUafs80ZFEv/fY05i1ElSIypDU\noyODa4IOxeRD2heQx4II/Qq74RfVikbv3S6zLeSA0lQdwjUSKG03qmfmu8S1Gtsn\nffO5+8LJSyN/BMEjvzm2oDdar49eVZjBOxIqPKh/Qh2WWDgNI9G3KtyIzXdqYKl4\n9OgSBzJaumB+2OLLpJYHAVu/P2Rk4QtdjB6Tg4r4IYSn/G5Tu6pmjo+EnRVF+q4/\n6jZLrYS1hd4a39wliYNuf7fcb/GTwdSoIkCO8wkpCyP9BW4QsX8j5tNbdpX2m3y+\n1gHDBRODlCEjILV5eYBbUtO2XUpIC5D2KboaFXvwUy9vM3WAe+ItQp7dUHBUiK92\nIN82l7VGMKP5lFLz81DXxtUw1cjAtEmr6PnN7Il1mPB0oDVrIotTEBEVShKWYbvZ\nAycn7APUeflCPbTAHyzyoz53+ESBtBu6UHko1ygwmtfYur0hJ8QCc9NNKD3jCgD8\nxHWjNAJnuzGehqioNFpykWRfFu+88FB0wP8eUiCeGNctzH6ICmPrW7mczwARAQAB\n/gMDAtoHbVMtHulbYPwZe9kLyFHuJnEXAEVPNiu6zKYmLcAGLDunD4QDKwijtIJt\nCDT6eRcpDEMidNokHgQlEW+aUHaVANGBMc0c6niLtDHwhrRl2ApL7IWyvMipW+zx\nBhhJK6g/8qSvIRqfjGA5i6zgpGcmeaMGEkoG9qLHXd5w+bMXD0R/dsKM9UD/am5x\nCawNmvFHDO2qTmVyJJtd83h9zHCUzL2cu9kaLPZC3SPSPM3mpvBr6DBXOD4lhnnO\nOFPnyh++Hr5ul3C4tB3XcfvHKphsLoINNiBxXuNHQc8gVxQBWk3La7VTWsPdMmAj\nIwaue9lZMjGGtF5qxDN/OR+5aMiloMAZJKxpg+Xm4xwZ0cMacr0ecssDSgctrzB0\nNb58Urr1uHxigPpJD1m3+Y6g7MjbXnks718daHLhLzpn7Nad1Tu4CQ+XYkcVYwj9\nCLpE8SUeTIIQ8YMHXNLds+zo5GxPyQocuWcxyYsnBq8IA1o/p1AmRDCOOW9iGcMl\nHVsxdqzdm0x10NIvS2JyxK6Mde6M9lRzoih6yYdhJzXSWpkY/8eciUvCHJCLz8vV\nUfNQ6qhrBNMdpG2efULgbdfBGqCIrpuEHGntW757ipkzTrHyuXdULTY+ZKeyeVqG\n4DTN0SZnVLtGT5ZnzJPad9rqBjkqT4+g/OrfYJTMF9rzf1HoDxyIx6kz2956mUkR\n1J5xvOjHR3/Rky191ITuEzBE+Ft2kp6l7IbXMgikXXZ0ZjrVK70veXdGnGXlCxI9\nPf0S3fvqlZbF8oaOqXhGz5cdoBw5pK6aPOIMiO3EoBCBiRqF2am8lOxGZ7+vAoQY\ndnYAWVZSGoGEWrnvceVQD1gQl19Li3WeTCdeyKrpEHZpJtS03TdJm9iy1OLtDEnk\nxH/D3c8Kn/hp+1avG4yjjQhztOQaZJd+JnTlMTTstYpV5asO5ScHkveO48AzWgYg\ndRfRjrS27Vc43KiPGo46pPUC13210NDlWjpX0lsKXEbvimL+ocsWeN8E9qwk+FFc\nTBYFuUBF542CyCoeN4jF2TQkB8EIwTypcn6UN0o8YRFe7a3ERS57/h5FkrnooFb8\nGcdpAXcIoCwJATf0G1/21cwCghT8AjkQY5PISSb+LSyKYlXn25lPjJhUJJfiCptA\ntLUR4mfSEB62Mv+pRWDjgr5C0mR2f1Wzvvq3Ue3W6qRacHeRv/MG2zg9ND0ClK42\n71qPVhhEIqXFlqVaoHGOXppr67n4Wr89FkNq182la4QSimG5f7lF9y+Sk8GMtrO9\n0/Au7dTmvCKncr7vRzFHkyx0E92vUopfYWcre5fB4LI8eCGnnv2cxLbYqqANOKwo\ncdCfsTYU1W4E6NwQJg6EZZI7TnINpwwz6AyLy1+9Upv4Z8xoOG6pM7nMPOBXgtAb\nXAIbC0lkKdEtK3BglLmf5lGK8+7rtTomWyy/xNu60uFvk7GJgp+4T0owmYsZOwfM\nc5pLlhlSH3pD0HwIzjm6j8EaddsrRHEO1Kq5XKQ1Rw/UfeA9Tl+fHjgjr2NicdMW\n21WlKYU3yXhNQrkvMwGEUK02Fw2qcl5+he4b6n86K6AGwFa1+Hjdr2a/v461gTGe\ncdHyzxlbt+sijxcf5SjFEmFGpmqyjC41fh+Y+2ZnBzUZ+E62cUGD9o1Ch9Bp00Pf\n+QdYSSsimS3Aoa1j8dbQPbxLWRquJu9C9WNxupRQZsJBZ7thpazIHSeGks9sXnpC\nkEkMOQNQmOg8Rnh2hCOpMxkb5Dkm6jc3fDXCU+xztLO0H0pvaG4gRG9lIDxqb2hu\nLmRvZUBleGFtcGxlLmNvbT6JAjgEEwECACIFAlggrQECGwMGCwkIBwMCBhUIAgkK\nCwQWAgMBAh4BAheAAAoJELhCZqx2bpMJhb8P/2/ItvPPZP4DHAyOC2IHVVf7GhP6\n6c7xlRRyIqjD+041zNLsz2zqU42DJ46axu04QwWQykCd1T4F77ciqC87GgZCe+t+\nkuOMfVqSCKZdG0xD4P7d/jBhXRXoajkOpCfk+N+hU9cDW5XgXkDedRLkQkQMhHh5\ne7VMjTdE/4IzhNW72Cx8YkGsXDOrMe0d24jPC6dxEP4CnxyTjSz5wEd1LHptDgUt\nOxDU6oK7r87j/e0KLsZ3ybvHa3dRzxwEzJDMtMK0tZ6yArzoMomlObPMGvT5bVD2\noFBa2mo8l8nezugtEN26m5pyDa+9FnUNflN/IR2CZgnTv+9jLmnjCmiBVYcZUFxk\nLD5hx2sVSaSHoKvvB7yR49cQ0jacpfl5PoSWfQmGft9AM6Y+paZfS9dmCUNuR9B4\nx5cLksOPhqob25//3+7G7ymg8BAge4GR0F+o4fBcUgsG/9xL5uAUkHeZwqK2L4mY\nn9jWJkSBnm+5PhEa6gPfozVW/S859QdQiMXSOCDWO42613Jodt5zXq4rTDFtt0h3\nzPI7GXhkTDS5/WHTGMuceniPqAlTQhp9cmLji3viAZqoqoG0vJJoECHzK/No5NvZ\nGw3Ekv74RvY0BlM6JDtrj+3TeO8g7jl6QYwWFWwk80IWkXJFKmFTqwZNdH5bRcQs\nuVGnQ05TFLqcPEUBnQc+BFggrT4BEAC5DDhHHLK1J1V4DT3WdJ4Gytl27DXy6Lpg\nG1JqYsVKrjhuH/C0fRMW3DhRCFzTt4/CzUGEbUovLhFL+EUqrNHGmiv4itmHdeKr\nYlvWPfpnEopfCToYWp67G+5ChO2JZIVG7XKxsyfEbBrtKN6FaJn6eS9vXgYCPrwe\nGxGSSj/Y0SlU8XdZ8hllcF5zCK+JKh3karuguBoPVuUJRr1NjzyMkEHUbUuUdjTi\nd9o6wzjD9UzjSJwAuOfMdz2/rPZG88gDYrBGOMeLeIXvcK1DlvTcRwf98SWUmjMO\npK4LfLzY2P0TpGYRDWycOlINo5ps2Np0elDPw1cAp4RgLYIzzrfDCcWKvkwzRm80\n2AAbvvZSfaf5unbZFxw++fu2mlWkQa8w3+ecov6E7BKWOSmRRevDOBwj7MzcqfBu\nLVSlbOIPqOA5g7Hti8a2Qf1NaYlqhXZnOydSQw/2vyq33OjSmIS1ZQXSN0WMsAAr\nsSJ7WmqIIdLZbYOBfRu1SH4TuXNZEv4iWtrcOrq/hUXgZFssez8VlJbQW+Z1eq3+\npSYVzi1amFXskbovKu3iZHpIB6MUuRXVPFtVa6dwe7BSr2mpsritSXklBwOiLZ/2\nhXbeC5f964zHCkJ5OdqMu0ebUK41Bx5qJ/tReM54SlUBZmUNHBQRQ4JHCzlBc87m\ni4oDfz95ZQARAQAB/gMDAgrIzz6v+k4uYBya0+ktGTAT80DdLSh9QDD5+0v506ei\nO+M4xuzx7hIDPuEXKd4ahm6GLdloQhKBXEnbpvxHyK2QING5nFhDRg523fsRrXVh\nD2BFdcEzoprLyHCO1hmpN5ikNNTq3kFv774km3H+fS8MU3+L1No/YmdSIVxhx8hL\nobVAyHbdO3dyw2jNDnUL4ozr4LQ7Ibe9Af14XLctFXrNP7sGELTl0V12CDjs7Zrx\nd+jSyPIZBL8hehfMSXgjHO41elUsuTI4q11f8nbzRHCRZ+HmOdvRhMSVYEF31wcc\nQ74T7bjRQheBGT03HDf7phC1CcAtLPm2jjypql42fEFC5XqsSuUEWk7pCGnBsP0y\n4DsofAUCtg4IvhPOjmUbI2VZGFK2RGivXrAqvMiEgmtLjX62pEGHpgthxJS/DDIE\nLBhvumY+KDQAKdl2HggwT33ZWdnG2qBm6JZXFhobask8DIwdUG3RZ9vID9QDX7he\nUlyTlKS0i4Hf4kE9Q6scTnETh7njW/1XMkHHa8bUebSjxOPU9lgvOtU+LO1+8E4t\ndY51PuVOPuWrImCL7oy8QO/eetW7l179HPHvT75FU3FQtd0d3R+q5RAXg5kR2rEo\nFh7MQ4r/0n7h2gtsNwRRglNDeGQVcAi8ojuqpefl5eK0V6sYXSsm2i7DddZuoVtZ\noYTONnXBMaumy4gg5Bg5rnrjecNJIeu8UIj1PiA7Y0V+3dp+dxpF+l7fClKVie0X\nAmAI1fOOAA15BbMHT5GVGpglztvghazFDh4OECyDCk+RfHcSEs6k8qKY9L+N5yGv\n5EuB40XrNL81fcYwaIiTwDd4pjFmn6oeHgEE/QooH/eK50slRiHTh2RAM/TIY1lu\nRhtfasNdEjrOTw6CzGDXgT1pUQUabaQ5ZfA+/xppJUmz1hvD2Z0zxMZJCXexhSFz\nE52flnoHw+9JiUf88cei2YWKMz948o0ywm1LJNSV6YklgrEboElNVbmfaqprDXfg\nY73JBoAKS4sQnHRe2kMib9xQ28/jPlZlT+W0QlkTCfwMAbulhcTl22TLnk5N0NJL\nTfXdXCISURHFdWATOxM4uH2GD0a5g9H1rPqvfW/WT6+9/HHke1bHGaUA5T65DcFi\nTHbfy8nVlTIOoANiI3jHBeIAiFvZEdTCMHUhcLV2xVJgY7lYmgiezmtF/yh5XqEG\np7+ZG4Ym7qtETN6cPzbTBNsxkMzPBY2L6iXsbBO4JNgokdMLL1ihL8ea+pMRSZrn\nPKobivOijpt2BmJH4STOlo0K/ezvL7oZ1hXIB2dlCM5mX1upJRdmWqBDHVZmCHFL\nUewfkUNFAYrfnzQA9WPF0b3O9ncQ9SCboiGPsWEfaOqkrlOU1WrPTn1z2nQ0kcCe\nV0JzrhfZFUDf0Bk+ZKaI2l9tf4THNqiHfB2fVag6hsnoWliME4ZvKjxdHtzBHvqQ\nM+17OjrMTXn8NiVd2lZuUE0Ur8eAa/S6Qb1Z8mcaMhXvHcKPQuCwXZgggimcVwM9\ntQqd8hBHhSimCQ6qL1Wr+V+9WUA3bz62X76q1rNgFFchsoXTWLuWLjhkcEvQQrDU\nwCsAh6kG0ii60CJOKd81IRWnPANffG6jg7A7RYWkT2WQeW6hF3iT0vS3V/d95pGn\n5A2Aau8kb7UfvgqwMp/GNYRldLlfh02WRslx+HHIVYiGZjWjbFJAdm2Ir1EJCaM8\ntGIl7w8XEN3LQPhZWjc/efciWO0mQQG+a2OcumO65ZRnOkaO/uZJtY5rJ/zBiQIf\nBBgBAgAJBQJYIK0+AhsMAAoJELhCZqx2bpMJ3iYP/jJttwoH2+XdqeZaxmLqNm+C\nV3yRSKGUpgdxn+WBAZeJ38zdpOnOS9PUPQPbgrzxGGzKl2k6Ke96rDukV8EfD/lW\nKlzuli2SQ3SygExty688ONtHmMRWULuWLcrkMZ58ssZDkk3JXZTNczPu+cF2WCCa\nUPKyUi06PBDSeIrfvga3T856kLiRE20n27TejJH5S+Vx7PArSd7Yd7Bi1keoGsZh\ngxesHC5dgkfx7pYPgOX4elK/zCqf34TXa3qxE/MFQKAe9HpF1o6uDl6L6IGeLf8k\nxn0Cp2NUzKzN8G/Nnce8YUumoVy533X/W0XqW/Sr+WcZPSRAMdAj6z7uCtZIGrDl\n6tah6vGT6VdDqWnAWD+v44Nf/aQlkSj6nEt/n9jLzOpbUeLq9MBfXIIPtMOlV4JU\npqSscvt94FUOH+TSwvnS/U7JFYVDTtOZZQ0GBv/GWtQmg9Nc5Afl+P3TUQitE4Re\nDU+QyGGHxxpuPGyIySz5CrvaPmUOAn5bgPJTMfv8gd2cXVP6mYj4HAsKn1TVgegA\np9ZFLfb2wSxKnXHu0hrLROdQJGacHHslMxtXWABK/jECfVSFgmNHjQpPutgGYlrb\nBl/AbUu6XhtI/YLURY2G6/n7ee6xnBzTuc8RqYp/80l8V2mtUUBTtMIcTSfSeb3s\nmN7gO16/RLWq8LQMYpsJ\n=Rm/S\n-----END PGP PRIVATE KEY BLOCK-----\n",passphrase="passphrase to decrypt private key",secret="rob says wow!";log("import key...");var key=service.getKeysFromArmor(armor).tap(function(){return log("key successfully imported!\nnow unlock key...")}),unlocked=key.then(function(n){return service.unlock(n,passphrase)}).tap(function(){return log("key successfully unlocked!\nnow encrypt then decrypt '"+secret+"'...")}),cipher=unlocked.then(function(n){return service.encrypt({cipher:n,auth:n},secret)}).tap(log),plain=Promise.join(unlocked,cipher,function(n,e){return service.decrypt({cipher:n,auth:n},e)}).tap(log);
},{"../../src":2,"bluebird":undefined}],2:[function(require,module,exports){
"use strict";function reject(e){return Promise.reject(new Error(e))}function getHandle(e){var r=utils_1.isString(e)?e:!!e&&e.handle;return utils_1.isString(r)&&r}function getOpenpgp(e){if(isOpenpgp(e))return e;var r=require("openpgp");return configureOpenpgp(r,OPENPGP_CONFIG_DEFAULTS,e)}function isOpenpgp(e){return!!e&&["config","crypto","key","message"].every(function(r){return!!e[r]})&&[e.encrypt,e.decrypt,e.crypto.hash&&e.crypto.hash.sha256,e.key.readArmored,e.key.generateKey,e.message.fromText,e.message.readArmored].every(function(e){return utils_1.isFunction(e)})}function configureOpenpgp(e){for(var r=[],t=1;t<arguments.length;t++)r[t-1]=arguments[t];var n=[e.config].concat(r.map(toValidOpenpgpConfig));return tslib_1.__assign.apply(Object,n),e}function toValidOpenpgpConfig(e){return Object.keys(e||{}).reduce(function(r,t){var n=OPENPGP_CONFIG_INTERFACE[t];if(!n)return r;var i=e[t];return n(i)?(r[t]=i,r):r},{})}var live_key_1=require("./live-key"),proxy_key_1=require("./proxy-key"),utils_1=require("./utils"),csrkey_cache_1=require("csrkey-cache"),Promise=require("bluebird"),tslib_1=require("tslib"),OpgpServiceClass=function(){function e(e,r,t,n){this.cache=e,this.getLiveKey=r,this.getProxyKey=t,this.openpgp=n}return e.prototype.configure=function(e){var r=configureOpenpgp(this.openpgp,e);return Promise.resolve(tslib_1.__assign({},r.config))},e.prototype.generateKey=function(e,r){var t=this;return utils_1.isString(e)?Promise.try(function(){var n={userIds:r&&[].concat(r.users),passphrase:e,numBits:r&&r.size||4096,unlocked:r&&!!r.unlocked};return t.openpgp.key.generateKey(n).then(function(e){return t.cacheAndProxyKey(t.getLiveKey(e))})}):reject("invalid passphrase: not a string")},e.prototype.getKeysFromArmor=function(e,r){var t=this;return utils_1.isString(e)?Promise.try(function(){var r=t.openpgp.key.readArmored(e).keys.map(function(e){return t.cacheAndProxyKey(t.getLiveKey(e))});return r.length>1?r:r[0]}):reject("invalid armor: not a string")},e.prototype.getArmorFromKey=function(e){var r=this;return Promise.try(function(){return r.getCachedLiveKey(e).armor()})},e.prototype.unlock=function(e,r,t){var n=this;return utils_1.isString(r)?Promise.try(function(){return n.getCachedLiveKey(e).unlock(r)}).then(function(e){return n.cacheAndProxyKey(e)}):reject("invalid passphrase: not a string")},e.prototype.lock=function(e,r,t){var n=this;return utils_1.isString(r)?Promise.try(function(){var t=n.getCachedLiveKey(e);if(t.bp.isLocked)return reject("key not unlocked");var i=getHandle(e);return n.cache.del(i),t.lock(r)}).then(function(e){return n.cacheAndProxyKey(e)}):reject("invalid passphrase: not a string")},e.prototype.encrypt=function(e,r,t){var n=this;return utils_1.isString(r)?Promise.try(function(){return n.openpgp.encrypt({privateKeys:n.getCachedPrivateOpenpgpKeys(e.auth),publicKeys:n.getCachedOpenpgpKeys(e.cipher),data:r})}).get("data"):reject("invalid plain text: not a string")},e.prototype.decrypt=function(e,r,t){var n=this;return utils_1.isString(r)?Promise.try(function(){return n.openpgp.decrypt({privateKey:n.getCachedPrivateOpenpgpKeys(e.cipher)[0],publicKeys:n.getCachedOpenpgpKeys(e.auth),message:n.openpgp.message.readArmored(r)})}).get("data"):reject("invalid cipher: not a string")},e.prototype.sign=function(e,r,t){var n=this;return Promise.try(function(){var t=n.getCachedOpenpgpKeys(e);if(!utils_1.isString(r))return reject("invalid text: not a string");var i=n.openpgp.message.fromText(r);return i.sign(t).armor()})},e.prototype.verify=function(e,r,t){var n=this;return Promise.try(function(){var t=n.getCachedOpenpgpKeys(e);if(!utils_1.isString(r))return reject("invalid armor: not a string");var i=n.openpgp.message.readArmored(r),o=i.verify(t).filter(function(e){return!e.valid}).map(function(e){return e.keyid}).join();return o?reject("authentication failed: "+o):i.getText()})},e.prototype.getCachedLiveKey=function(e){var r=getHandle(e),t=r&&this.cache.get(r);if(!t)throw new Error("invalid key reference: not a string or stale");return t},e.prototype.getCachedLiveKeys=function(e){var r=this,t=[].concat(e);if(!t.length)throw new Error("no key references");return t.map(function(e){return r.getCachedLiveKey(e)})},e.prototype.getCachedOpenpgpKeys=function(e){return this.getCachedLiveKeys(e).map(function(e){return e.key})},e.prototype.getCachedPrivateOpenpgpKeys=function(e){var r=this.getCachedLiveKeys(e);if(r.some(function(e){return e.bp.isLocked}))throw new Error("private key not unlocked");return r.map(function(e){return e.key})},e.prototype.cacheAndProxyKey=function(e){var r=this.cache.set(e);if(!r)throw new Error("fail to cache key");return this.getProxyKey(r,e.bp)},e}();OpgpServiceClass.getInstance=function(e){var r=tslib_1.__assign({},e),t=r.cache||csrkey_cache_1.default(),n=getOpenpgp(r.openpgp),i=r.getLiveKey||live_key_1.default({openpgp:n}),o=new OpgpServiceClass(t,i,r.getProxyKey||proxy_key_1.default,n);return OpgpServiceClass.PUBLIC_METHODS.reduce(function(e,r){return e[r]=o[r].bind(o),e},{})},OpgpServiceClass.PUBLIC_METHODS=["configure","generateKey","getKeysFromArmor","getArmorFromKey","unlock","lock","encrypt","decrypt","sign","verify"];var OPENPGP_CONFIG_DEFAULTS={aead_protect:!0},OPENPGP_CONFIG_INTERFACE={prefer_hash_algorithm:utils_1.isNumber,encryption_cipher:utils_1.isNumber,compression:utils_1.isNumber,aead_protect:utils_1.isBoolean,integrity_protect:utils_1.isBoolean,ignore_mdc_error:utils_1.isBoolean,rsa_blinding:utils_1.isBoolean,use_native:utils_1.isBoolean,zero_copy:utils_1.isBoolean,debug:utils_1.isBoolean,show_version:utils_1.isBoolean,show_comment:utils_1.isBoolean,versionstring:utils_1.isString,commentstring:utils_1.isString,keyserver:utils_1.isString,node_store:utils_1.isString},OPENPGP_CONFIG_KEYS=Object.keys(OPENPGP_CONFIG_INTERFACE),getOpgpService=OpgpServiceClass.getInstance;Object.defineProperty(exports,"__esModule",{value:!0}),exports.default=getOpgpService;
},{"./live-key":3,"./proxy-key":4,"./utils":5,"bluebird":undefined,"csrkey-cache":undefined,"openpgp":undefined,"tslib":undefined}],3:[function(require,module,exports){
"use strict";function isLocked(e){return!e.primaryKey.isDecrypted}function getExpiry(e){var t=e.getExpirationTime();return t?t.getTime():1/0}var base64=require("base64-js"),Promise=require("bluebird"),tslib_1=require("tslib"),LiveKeyClass=function(){function e(e,t,r){this.utils=e,this.key=t,this.bp=r}return e.prototype.armor=function(){var e=this;return Promise.try(function(){return e.key.armor()})},e.prototype.unlock=function(t,r){var i=this;return this.bp.isLocked?Promise.try(function(){var r=i.utils.cloneKey(i.key),n=r.decrypt(t);return n?e.getInstance(i.utils,r):Promise.reject(new Error("fail to unlock key"))}):Promise.reject(new Error("key not locked"))},e.prototype.lock=function(t,r){var i=this;return this.bp.isLocked?Promise.reject(new Error("key not unlocked")):Promise.try(function(){return i.key.encrypt(t),e.getInstance(i.utils,i.key)}).finally(function(){return delete i.key})},e.prototype.sign=function(e,t){var r=this;return Promise.try(function(){return r.utils.openpgp.message.fromText(e).sign([r.key]).armor()})},e.prototype.verify=function(e,t){var r=this;return Promise.try(function(){var t=r.utils.openpgp.message.readArmored(e),i=t.verify([r.key]);return!!i.length&&i[0].valid&&t.getText()})},e.getInstance=function(t,r,i){var n=t.getKeyBlueprint(r);return new e(t,r,n)},e}();LiveKeyClass.getFactory=function(e){var t=new OpenpgpKeyUtils(e.openpgp);return LiveKeyClass.getInstance.bind(LiveKeyClass,t)};var OpenpgpKeyUtils=function(){function e(e){this.openpgp=e}return e.prototype.getKeyBlueprint=function(e){var t=this,r=e.getAllKeyPackets(),i=this.getOpgpKeyId(e,r[0]),n=r.slice(1).map(function(r,i){return t.getOpgpKeyId(e,r,i)});return{isLocked:isLocked(e),isPublic:e.isPublic(),keys:[i].concat(n),user:{ids:e.getUserIds()}}},e.prototype.getHashes=function(e){return{hash:this.getFingerprintHash(e),fingerprint:e.getFingerprint()}},e.prototype.getPrimaryKeyType=function(e){var t=this.cloneKey(e);return t.subKeys=null,{isAuth:!!t.getSigningKeyPacket(),isCiph:!!t.getEncryptionKeyPacket()}},e.prototype.getFingerprintHash=function(e,t){var r=e.writeOld(),i=this.openpgp.crypto.hash[t&&t.hash||"sha256"](r);return base64.fromByteArray(i)},e.prototype.cloneKey=function(e){return this.openpgp.key.readArmored(e.armor()).keys[0]},e.prototype.getOpgpKeyId=function(e,t,r){return"undefined"==typeof r?this.getPrimaryOpgpKeyId(e,t):this.getSubkeyOpgpKeyId(e,t,r)},e.prototype.getPrimaryOpgpKeyId=function(e,t){return tslib_1.__assign(this.getHashes(t),this.getPrimaryKeyType(e),{status:e.verifyPrimaryKey(),expires:getExpiry(e)})},e.prototype.getSubkeyOpgpKeyId=function(e,t,r){var i=e.subKeys[r];return tslib_1.__assign(this.getHashes(t),{isCiph:i.isValidEncryptionKey(e.primaryKey),isAuth:i.isValidSigningKey(e.primaryKey),status:i.verify(e.primaryKey),expires:getExpiry(i)})},e}(),getLiveKeyFactory=LiveKeyClass.getFactory;Object.defineProperty(exports,"__esModule",{value:!0}),exports.default=getLiveKeyFactory;
},{"base64-js":undefined,"bluebird":undefined,"tslib":undefined}],4:[function(require,module,exports){
"use strict";var tslib_1=require("tslib"),getProxyKey=function(e,s){var r=tslib_1.__assign({handle:e},s);return r.keys=s.keys.map(function(e){return tslib_1.__assign({},e)}),r.user={ids:s.user.ids.slice()},r};Object.defineProperty(exports,"__esModule",{value:!0}),exports.default=getProxyKey;

},{"tslib":undefined}],5:[function(require,module,exports){
"use strict";function isString(n){return"string"==typeof(n&&n.valueOf())}function isNumber(n){return"number"==typeof(n&&n.valueOf())}function isBoolean(n){return"boolean"==typeof(n&&n.valueOf())}function isFunction(n){return"function"==typeof n}exports.isString=isString,exports.isNumber=isNumber,exports.isBoolean=isBoolean,exports.isFunction=isFunction;

},{}]},{},[1]);
