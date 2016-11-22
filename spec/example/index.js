(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function placeHoldersCount (b64) {
  var len = b64.length
  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // the number of equal signs (place holders)
  // if there are two placeholders, than the two characters before it
  // represent one byte
  // if there is only one, then the three characters before it represent 2 bytes
  // this is just a cheap hack to not do indexOf twice
  return b64[len - 2] === '=' ? 2 : b64[len - 1] === '=' ? 1 : 0
}

function byteLength (b64) {
  // base64 is 4/3 + up to two characters of the original data
  return b64.length * 3 / 4 - placeHoldersCount(b64)
}

function toByteArray (b64) {
  var i, j, l, tmp, placeHolders, arr
  var len = b64.length
  placeHolders = placeHoldersCount(b64)

  arr = new Arr(len * 3 / 4 - placeHolders)

  // if there are placeholders, only get up to the last complete 4 chars
  l = placeHolders > 0 ? len - 4 : len

  var L = 0

  for (i = 0, j = 0; i < l; i += 4, j += 3) {
    tmp = (revLookup[b64.charCodeAt(i)] << 18) | (revLookup[b64.charCodeAt(i + 1)] << 12) | (revLookup[b64.charCodeAt(i + 2)] << 6) | revLookup[b64.charCodeAt(i + 3)]
    arr[L++] = (tmp >> 16) & 0xFF
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  if (placeHolders === 2) {
    tmp = (revLookup[b64.charCodeAt(i)] << 2) | (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[L++] = tmp & 0xFF
  } else if (placeHolders === 1) {
    tmp = (revLookup[b64.charCodeAt(i)] << 10) | (revLookup[b64.charCodeAt(i + 1)] << 4) | (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var output = ''
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    output += lookup[tmp >> 2]
    output += lookup[(tmp << 4) & 0x3F]
    output += '=='
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + (uint8[len - 1])
    output += lookup[tmp >> 10]
    output += lookup[(tmp >> 4) & 0x3F]
    output += lookup[(tmp << 2) & 0x3F]
    output += '='
  }

  parts.push(output)

  return parts.join('')
}

},{}],2:[function(require,module,exports){
(function (global){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var isArray = require('isarray')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Due to various browser bugs, sometimes the Object implementation will be used even
 * when the browser supports typed arrays.
 *
 * Note:
 *
 *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
 *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *     incorrect length in some situations.

 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
 * get the Object implementation, which is slower but behaves correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = global.TYPED_ARRAY_SUPPORT !== undefined
  ? global.TYPED_ARRAY_SUPPORT
  : typedArraySupport()

/*
 * Export kMaxLength after typed array support is determined.
 */
exports.kMaxLength = kMaxLength()

function typedArraySupport () {
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = {__proto__: Uint8Array.prototype, foo: function () { return 42 }}
    return arr.foo() === 42 && // typed array instances can be augmented
        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
        arr.subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
  } catch (e) {
    return false
  }
}

function kMaxLength () {
  return Buffer.TYPED_ARRAY_SUPPORT
    ? 0x7fffffff
    : 0x3fffffff
}

function createBuffer (that, length) {
  if (kMaxLength() < length) {
    throw new RangeError('Invalid typed array length')
  }
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = new Uint8Array(length)
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    if (that === null) {
      that = new Buffer(length)
    }
    that.length = length
  }

  return that
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  if (!Buffer.TYPED_ARRAY_SUPPORT && !(this instanceof Buffer)) {
    return new Buffer(arg, encodingOrOffset, length)
  }

  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new Error(
        'If encoding is specified then the first argument must be a string'
      )
    }
    return allocUnsafe(this, arg)
  }
  return from(this, arg, encodingOrOffset, length)
}

Buffer.poolSize = 8192 // not used by this implementation

// TODO: Legacy, not needed anymore. Remove in next major version.
Buffer._augment = function (arr) {
  arr.__proto__ = Buffer.prototype
  return arr
}

function from (that, value, encodingOrOffset, length) {
  if (typeof value === 'number') {
    throw new TypeError('"value" argument must not be a number')
  }

  if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) {
    return fromArrayBuffer(that, value, encodingOrOffset, length)
  }

  if (typeof value === 'string') {
    return fromString(that, value, encodingOrOffset)
  }

  return fromObject(that, value)
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(null, value, encodingOrOffset, length)
}

if (Buffer.TYPED_ARRAY_SUPPORT) {
  Buffer.prototype.__proto__ = Uint8Array.prototype
  Buffer.__proto__ = Uint8Array
  if (typeof Symbol !== 'undefined' && Symbol.species &&
      Buffer[Symbol.species] === Buffer) {
    // Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
    Object.defineProperty(Buffer, Symbol.species, {
      value: null,
      configurable: true
    })
  }
}

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be a number')
  } else if (size < 0) {
    throw new RangeError('"size" argument must not be negative')
  }
}

function alloc (that, size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(that, size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(that, size).fill(fill, encoding)
      : createBuffer(that, size).fill(fill)
  }
  return createBuffer(that, size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(null, size, fill, encoding)
}

function allocUnsafe (that, size) {
  assertSize(size)
  that = createBuffer(that, size < 0 ? 0 : checked(size) | 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < size; ++i) {
      that[i] = 0
    }
  }
  return that
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(null, size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(null, size)
}

function fromString (that, string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('"encoding" must be a valid string encoding')
  }

  var length = byteLength(string, encoding) | 0
  that = createBuffer(that, length)

  var actual = that.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    that = that.slice(0, actual)
  }

  return that
}

function fromArrayLike (that, array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  that = createBuffer(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

function fromArrayBuffer (that, array, byteOffset, length) {
  array.byteLength // this throws if `array` is not a valid ArrayBuffer

  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('\'offset\' is out of bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('\'length\' is out of bounds')
  }

  if (byteOffset === undefined && length === undefined) {
    array = new Uint8Array(array)
  } else if (length === undefined) {
    array = new Uint8Array(array, byteOffset)
  } else {
    array = new Uint8Array(array, byteOffset, length)
  }

  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = array
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    that = fromArrayLike(that, array)
  }
  return that
}

function fromObject (that, obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    that = createBuffer(that, len)

    if (that.length === 0) {
      return that
    }

    obj.copy(that, 0, 0, len)
    return that
  }

  if (obj) {
    if ((typeof ArrayBuffer !== 'undefined' &&
        obj.buffer instanceof ArrayBuffer) || 'length' in obj) {
      if (typeof obj.length !== 'number' || isnan(obj.length)) {
        return createBuffer(that, 0)
      }
      return fromArrayLike(that, obj)
    }

    if (obj.type === 'Buffer' && isArray(obj.data)) {
      return fromArrayLike(that, obj.data)
    }
  }

  throw new TypeError('First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.')
}

function checked (length) {
  // Note: cannot use `length < kMaxLength()` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= kMaxLength()) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + kMaxLength().toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (typeof ArrayBuffer !== 'undefined' && typeof ArrayBuffer.isView === 'function' &&
      (ArrayBuffer.isView(string) || string instanceof ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    string = '' + string
  }

  var len = string.length
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
      case undefined:
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// The property is used by `Buffer.isBuffer` and `is-buffer` (in Safari 5-7) to detect
// Buffer instances.
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length | 0
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (!Buffer.isBuffer(target)) {
    throw new TypeError('Argument must be a Buffer')
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset  // Coerce to Number.
  if (isNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (Buffer.TYPED_ARRAY_SUPPORT &&
        typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new TypeError('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset | 0
    if (isFinite(length)) {
      length = length | 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  // legacy write(string, encoding, offset, length) - remove in v0.13
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
      : (firstByte > 0xBF) ? 2
      : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    newBuf = this.subarray(start, end)
    newBuf.__proto__ = Buffer.prototype
  } else {
    var sliceLen = end - start
    newBuf = new Buffer(sliceLen, undefined)
    for (var i = 0; i < sliceLen; ++i) {
      newBuf[i] = this[i + start]
    }
  }

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  this[offset] = (value & 0xff)
  return offset + 1
}

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; ++i) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; ++i) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24)
    this[offset + 2] = (value >>> 16)
    this[offset + 1] = (value >>> 8)
    this[offset] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
    this[offset + 2] = (value >>> 16)
    this[offset + 3] = (value >>> 24)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start
  var i

  if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    // ascending copy from start
    for (i = 0; i < len; ++i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, start + len),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if (code < 256) {
        val = code
      }
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : utf8ToBytes(new Buffer(val, encoding).toString())
    var len = bytes.length
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

function isnan (val) {
  return val !== val // eslint-disable-line no-self-compare
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"base64-js":1,"ieee754":4,"isarray":3}],3:[function(require,module,exports){
var toString = {}.toString;

module.exports = Array.isArray || function (arr) {
  return toString.call(arr) == '[object Array]';
};

},{}],4:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],5:[function(require,module,exports){
"use strict";
;
var src_1 = require("../../src");
var Promise = require("bluebird");

var log = console.log.bind(console);
var service = src_1.default();
var armor = "-----BEGIN PGP PRIVATE KEY BLOCK-----\nVersion: GnuPG v1\n\n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\nmN7gO16/RLWq8LQMYpsJ\n=Rm/S\n-----END PGP PRIVATE KEY BLOCK-----\n";
var passphrase = 'passphrase to decrypt private key';
var secret = 'rob says wow!';
log('import key...');
var key = service.getKeysFromArmor(armor)
    .tap(function () { return log('key successfully imported!\nnow unlock key...'); });
var unlocked = key.then(function (key) { return service.unlock(key, passphrase); })
    .tap(function () { return log("key successfully unlocked!\nnow encrypt then decrypt '" + secret + "'..."); });
var cipher = unlocked
    .then(function (key) { return service.encrypt({ cipher: key, auth: key }, secret); })
    .tap(log);
var plain = Promise.join(unlocked, cipher, function (key, cipher) { return service.decrypt({ cipher: key, auth: key }, cipher); })
    .tap(log);

},{"../../src":6,"bluebird":undefined}],6:[function(require,module,exports){
"use strict";
;
var live_key_1 = require("./live-key");
var proxy_key_1 = require("./proxy-key");
var utils_1 = require("./utils");
var csrkey_cache_1 = require("csrkey-cache");
var Promise = require("bluebird");
var tslib_1 = require("tslib");
var OpgpServiceClass = (function () {
    function OpgpServiceClass(cache, getLiveKey, getProxyKey, openpgp) {
        this.cache = cache;
        this.getLiveKey = getLiveKey;
        this.getProxyKey = getProxyKey;
        this.openpgp = openpgp;
    }
    OpgpServiceClass.prototype.generateKey = function (passphrase, opts) {
        var _this = this;
        return !utils_1.isString(passphrase) ? reject('invalid passphrase: not a string')
            : Promise.try(function () {
                var options = {
                    userIds: opts && [].concat(opts.users),
                    passphrase: passphrase,
                    numBits: opts && opts.size || 4096,
                    unlocked: opts && !!opts.unlocked
                };
                return _this.openpgp.key.generateKey(options)
                    .then(function (key) { return _this.cacheAndProxyKey(_this.getLiveKey(key)); });
            });
    };
    OpgpServiceClass.prototype.getKeysFromArmor = function (armor, opts) {
        var _this = this;
        return !utils_1.isString(armor) ? reject('invalid armor: not a string')
            : Promise.try(function () {
                var keys = _this.openpgp.key.readArmored(armor).keys
                    .map(function (key) { return _this.cacheAndProxyKey(_this.getLiveKey(key)); });
                return keys.length > 1 ? keys : keys[0];
            });
    };
    OpgpServiceClass.prototype.unlock = function (keyRef, passphrase, opts) {
        var _this = this;
        return !utils_1.isString(passphrase) ? reject('invalid passphrase: not a string')
            : Promise.try(function () { return _this.getCachedLiveKey(keyRef).unlock(passphrase); })
                .then(function (unlocked) { return _this.cacheAndProxyKey(unlocked); });
    };
    OpgpServiceClass.prototype.lock = function (keyRef, passphrase, opts) {
        var _this = this;
        return !utils_1.isString(passphrase) ? reject('invalid passphrase: not a string')
            : Promise.try(function () {
                var livekey = _this.getCachedLiveKey(keyRef);
                if (livekey.bp.isLocked) {
                    return reject('key not unlocked');
                }
                var handle = getHandle(keyRef);
                _this.cache.del(handle);
                return livekey.lock(passphrase);
            })
                .then(function (locked) { return _this.cacheAndProxyKey(locked); });
    };
    OpgpServiceClass.prototype.encrypt = function (keyRefs, plain, opts) {
        var _this = this;
        return !utils_1.isString(plain) ? reject('invalid plain text: not a string')
            : Promise.try(function () { return _this.openpgp.encrypt({
                privateKeys: _this.getCachedPrivateOpenpgpKeys(keyRefs.auth),
                publicKeys: _this.getCachedOpenpgpKeys(keyRefs.cipher),
                data: plain
            }); })
                .get('data');
    };
    OpgpServiceClass.prototype.decrypt = function (keyRefs, cipher, opts) {
        var _this = this;
        return !utils_1.isString(cipher) ? reject('invalid cipher: not a string')
            : Promise.try(function () { return _this.openpgp.decrypt({
                privateKey: _this.getCachedPrivateOpenpgpKeys(keyRefs.cipher)[0],
                publicKeys: _this.getCachedOpenpgpKeys(keyRefs.auth),
                message: _this.openpgp.message.readArmored(cipher)
            }); })
                .get('data');
    };
    OpgpServiceClass.prototype.sign = function (keyRefs, text, opts) {
        var _this = this;
        return Promise.try(function () {
            var keys = _this.getCachedOpenpgpKeys(keyRefs);
            if (!utils_1.isString(text)) {
                return reject('invalid text: not a string');
            }
            var message = _this.openpgp.message.fromText(text);
            return message.sign(keys).armor();
        });
    };
    OpgpServiceClass.prototype.verify = function (keyRefs, armor, opts) {
        var _this = this;
        return Promise.try(function () {
            var keys = _this.getCachedOpenpgpKeys(keyRefs);
            if (!utils_1.isString(armor)) {
                return reject('invalid armor: not a string');
            }
            var message = _this.openpgp.message.readArmored(armor);
            var invalid = message.verify(keys)
                .filter(function (key) { return !key.valid; })
                .map(function (key) { return key.keyid; })
                .join();
            return !invalid ? message.getText()
                : reject('authentication failed: ' + invalid);
        });
    };
    OpgpServiceClass.prototype.getCachedLiveKey = function (keyRef) {
        var handle = getHandle(keyRef);
        var livekey = handle && this.cache.get(handle);
        if (!livekey) {
            throw new Error('invalid key reference: not a string or stale');
        }
        return livekey;
    };
    OpgpServiceClass.prototype.getCachedLiveKeys = function (keyRefs) {
        var _this = this;
        var refs = [].concat(keyRefs);
        if (!refs.length) {
            throw new Error('no key references');
        }
        return refs.map(function (keyRef) { return _this.getCachedLiveKey(keyRef); });
    };
    OpgpServiceClass.prototype.getCachedOpenpgpKeys = function (keyRefs) {
        return this.getCachedLiveKeys(keyRefs).map(function (livekey) { return livekey.key; });
    };
    OpgpServiceClass.prototype.getCachedPrivateOpenpgpKeys = function (keyRefs) {
        var keys = this.getCachedLiveKeys(keyRefs);
        if (keys.some(function (key) { return key.bp.isLocked; })) {
            throw new Error('private key not unlocked');
        }
        return keys.map(function (livekey) { return livekey.key; });
    };
    OpgpServiceClass.prototype.cacheAndProxyKey = function (livekey) {
        var handle = this.cache.set(livekey);
        if (!handle) {
            throw new Error('fail to cache key');
        }
        return this.getProxyKey(handle, livekey.bp);
    };
    return OpgpServiceClass;
}());
OpgpServiceClass.getInstance = function (config) {
    var spec = tslib_1.__assign({}, config);
    var cache = spec.cache || csrkey_cache_1.default();
    var openpgp = getOpenpgp(spec.openpgp);
    var getLiveKey = spec.getLiveKey || live_key_1.default({ openpgp: openpgp });
    return new OpgpServiceClass(cache, getLiveKey, spec.getProxyKey || proxy_key_1.default, openpgp);
};
function reject(reason) {
    return Promise.reject(new Error(reason));
}
function getHandle(keyRef) {
    var handle = utils_1.isString(keyRef) ? keyRef : !!keyRef && keyRef.handle;
    return utils_1.isString(handle) && handle;
}
function getOpenpgp(config) {
    var openpgp = isOpenpgp(config) ? config : require('openpgp');
    return openpgp;
}
function isOpenpgp(val) {
    return !!val && ['crypto', 'key', 'message']
        .every(function (prop) { return !!val[prop]; });
}
var getOpgpService = OpgpServiceClass.getInstance;
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = getOpgpService;

},{"./live-key":7,"./proxy-key":8,"./utils":9,"bluebird":undefined,"csrkey-cache":undefined,"openpgp":undefined,"tslib":undefined}],7:[function(require,module,exports){
"use strict";
;
var Buffer = require('buffer').Buffer;
var Promise = require("bluebird");
var tslib_1 = require("tslib");
var LiveKeyClass = (function () {
    function LiveKeyClass(utils, key, bp) {
        this.utils = utils;
        this.key = key;
        this.bp = bp;
    }
    LiveKeyClass.prototype.armor = function () {
        var _this = this;
        return Promise.try(function () { return _this.key.armor(); });
    };
    LiveKeyClass.prototype.unlock = function (passphrase, opts) {
        var _this = this;
        return !this.bp.isLocked ? Promise.reject(new Error('key not locked'))
            : Promise.try(function () {
                var clone = _this.utils.cloneKey(_this.key);
                var unlocked = clone.decrypt(passphrase);
                return unlocked ? LiveKeyClass.getInstance(_this.utils, clone)
                    : Promise.reject(new Error('fail to unlock key'));
            });
    };
    LiveKeyClass.prototype.lock = function (passphrase, opts) {
        var _this = this;
        return this.bp.isLocked ? Promise.reject(new Error('key not unlocked'))
            : Promise.try(function () {
                _this.key.encrypt(passphrase);
                return LiveKeyClass.getInstance(_this.utils, _this.key);
            })
                .finally(function () { return delete _this.key; });
    };
    LiveKeyClass.prototype.sign = function (text, opts) {
        var _this = this;
        return Promise.try(function () {
            return _this.utils.openpgp.message.fromText(text).sign([_this.key]).armor();
        });
    };
    LiveKeyClass.prototype.verify = function (armor, opts) {
        var _this = this;
        return Promise.try(function () {
            var message = _this.utils.openpgp.message.readArmored(armor);
            var auth = message.verify([_this.key]);
            return !!auth.length && auth[0].valid && message.getText();
        });
    };
    LiveKeyClass.getInstance = function (utils, key, opts) {
        var bp = utils.getKeyBlueprint(key);
        return new LiveKeyClass(utils, key, bp);
    };
    return LiveKeyClass;
}());
LiveKeyClass.getFactory = function (config) {
    var utils = new OpenpgpKeyUtils(config.openpgp);
    return LiveKeyClass.getInstance.bind(LiveKeyClass, utils);
};
var OpenpgpKeyUtils = (function () {
    function OpenpgpKeyUtils(openpgp) {
        this.openpgp = openpgp;
    }
    OpenpgpKeyUtils.prototype.getKeyBlueprint = function (key) {
        var _this = this;
        var packets = key.getAllKeyPackets();
        var primary = this.getOpgpKeyId(key, packets[0]);
        var subkeys = packets.slice(1)
            .map(function (packet, index) { return _this.getOpgpKeyId(key, packet, index); });
        return {
            isLocked: isLocked(key),
            isPublic: key.isPublic(),
            keys: [primary].concat(subkeys),
            user: { ids: key.getUserIds() }
        };
    };
    OpenpgpKeyUtils.prototype.getHashes = function (packet) {
        return {
            hash: this.getFingerprintHash(packet),
            fingerprint: packet.getFingerprint()
        };
    };
    OpenpgpKeyUtils.prototype.getPrimaryKeyType = function (key) {
        var primary = this.cloneKey(key);
        primary.subKeys = null;
        return {
            isAuth: !!primary.getSigningKeyPacket(),
            isCiph: !!primary.getEncryptionKeyPacket()
        };
    };
    OpenpgpKeyUtils.prototype.getFingerprintHash = function (key, opts) {
        var packets = key.writeOld();
        var hash = this.openpgp.crypto.hash[opts && opts.hash || 'sha256'](packets);
        return Buffer.from(hash).toString(opts && opts.format || 'base64');
    };
    OpenpgpKeyUtils.prototype.cloneKey = function (key) {
        return this.openpgp.key.readArmored(key.armor()).keys[0];
    };
    OpenpgpKeyUtils.prototype.getOpgpKeyId = function (key, packet, index) {
        return typeof index === 'undefined' ? this.getPrimaryOpgpKeyId(key, packet)
            : this.getSubkeyOpgpKeyId(key, packet, index);
    };
    OpenpgpKeyUtils.prototype.getPrimaryOpgpKeyId = function (key, packet) {
        return tslib_1.__assign(this.getHashes(packet), this.getPrimaryKeyType(key), {
            status: key.verifyPrimaryKey(),
            expires: getExpiry(key)
        });
    };
    OpenpgpKeyUtils.prototype.getSubkeyOpgpKeyId = function (key, packet, index) {
        var subkey = key.subKeys[index];
        return tslib_1.__assign(this.getHashes(packet), {
            isCiph: subkey.isValidEncryptionKey(key.primaryKey),
            isAuth: subkey.isValidSigningKey(key.primaryKey),
            status: subkey.verify(key.primaryKey),
            expires: getExpiry(subkey)
        });
    };
    return OpenpgpKeyUtils;
}());
function isLocked(key) {
    return !key.primaryKey.isDecrypted;
}
function getExpiry(key) {
    var expires = key.getExpirationTime();
    return expires ? expires.getTime() : Infinity;
}
var getLiveKeyFactory = LiveKeyClass.getFactory;
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = getLiveKeyFactory;

},{"bluebird":undefined,"buffer":2,"tslib":undefined}],8:[function(require,module,exports){
"use strict";
;
var tslib_1 = require("tslib");
var getProxyKey = function (handle, blueprint) {
    var proxy = tslib_1.__assign({ handle: handle }, blueprint);
    proxy.keys = blueprint.keys.map(function (keyId) { return tslib_1.__assign({}, keyId); });
    proxy.user = { ids: blueprint.user.ids.slice() };
    return proxy;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = getProxyKey;

},{"tslib":undefined}],9:[function(require,module,exports){
"use strict";
;
function isString(val) {
    return typeof (val && val.valueOf()) === 'string';
}
exports.isString = isString;

},{}]},{},[5]);
