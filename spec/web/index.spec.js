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
"use strict";function getInvalidAuthArgs(){function e(e){return"string"==typeof e}var t=[void 0,null,NaN,!0,42,"foo",["foo"],{foo:"foo"}],n=t.filter(function(t){return!e(t)});return n.filter(function(e){return!Array.isArray(e)}).map(function(e){return[e,"compliant text"]}).concat(n.map(function(e){return[[e],"compliant text"]})).concat(n.map(function(e){return["compliant handle",e]}))}var src_1=require("../src"),Promise=require("bluebird"),cache,getLiveKey,getProxyKey,openpgp,livekey,types;beforeEach(function(){cache=jasmine.createSpyObj("cache",["set","del","get","has"]),getLiveKey=jasmine.createSpy("getLiveKey"),getProxyKey=jasmine.createSpy("getProxyKey"),openpgp={crypto:{hash:jasmine.createSpyObj("hash",["sha256"])},key:jasmine.createSpyObj("key",["readArmored","generateKey"]),message:jasmine.createSpyObj("message",["fromText","readArmored"]),encrypt:jasmine.createSpy("encrypt"),decrypt:jasmine.createSpy("decrypt")},livekey={key:{},bp:{keys:[{id:"key-id"}],user:{ids:[]}},lock:jasmine.createSpy("lock"),unlock:jasmine.createSpy("unlock")}}),describe("default export: getOpgpService (config?: OpgpServiceFactoryConfig): OpgpService",function(){var e;beforeEach(function(){e=jasmine.objectContaining({getKeysFromArmor:jasmine.any(Function),encrypt:jasmine.any(Function),decrypt:jasmine.any(Function),sign:jasmine.any(Function),verify:jasmine.any(Function)})}),describe("when called without arguments",function(){var t;beforeEach(function(){t=src_1.default()}),it("returns an {OpgpService} instance",function(){expect(t).toEqual(e)})}),describe("when called with { cache?: CsrKeyCache<OpgpLiveKey>, getLiveKey?: LiveKeyFactory, getProxyKey?: ProxyKeyFactory, openpgp?: openpgp }",function(){var t;beforeEach(function(){openpgp.key.readArmored.and.returnValue({keys:[livekey.key]}),getLiveKey.and.returnValue(livekey),cache.set.and.returnValue("key-handle")}),beforeEach(function(){t=src_1.default({cache:cache,getLiveKey:getLiveKey,getProxyKey:getProxyKey,openpgp:openpgp}),t.getKeysFromArmor("key-armor")}),it("returns an {OpgpService} instance based on the given dependencies ",function(){expect(t).toEqual(e),expect(openpgp.key.readArmored).toHaveBeenCalledWith("key-armor"),expect(getLiveKey).toHaveBeenCalledWith(livekey.key),expect(cache.set).toHaveBeenCalledWith(livekey),expect(getProxyKey).toHaveBeenCalledWith("key-handle",livekey.bp)})})}),describe("OpgpService",function(){var e;beforeEach(function(){e=src_1.default({cache:cache,getLiveKey:getLiveKey,openpgp:openpgp})}),describe("generateKey (passphrase: string, opts?: OpgpKeyOpts): Promise<OpgpProxyKey>",function(){it("delegates to the openpgp primitive",function(t){e.generateKey("secret passphrase").catch(function(){}).finally(function(){expect(openpgp.key.generateKey).toHaveBeenCalledWith(jasmine.objectContaining({passphrase:"secret passphrase",numBits:4096})),setTimeout(t)})}),describe("when the underlying openpgp primitive returns a newly generated key",function(){var t,n;beforeEach(function(){openpgp.key.generateKey.and.returnValue(Promise.resolve(livekey.key)),getLiveKey.and.returnValue(livekey),cache.set.and.returnValue("key-handle")}),beforeEach(function(i){e.generateKey("secret passphrase").then(function(e){return n=e}).catch(function(e){return t=e}).finally(function(){return setTimeout(i)})}),it("creates a new {OpgpLiveKey} instance from the new openpgp key",function(){expect(getLiveKey).toHaveBeenCalledWith(livekey.key)}),it("stores the new {OpgpLiveKey} instance in the underlying cache",function(){expect(cache.set).toHaveBeenCalledWith(livekey)}),it("returns a Promise that resolves to the new {OpgpProxyKey} instance",function(){expect(n).toEqual(jasmine.objectContaining({handle:"key-handle"})),expect(n).toEqual(jasmine.objectContaining(livekey.bp)),expect(t).not.toBeDefined()})}),describe("when the underlying openpgp primitive throws an error",function(){var t,n;beforeEach(function(){openpgp.key.generateKey.and.throwError("boom")}),beforeEach(function(i){e.generateKey("secret passphrase").then(function(e){return n=e}).catch(function(e){return t=e}).finally(function(){return setTimeout(i)})}),it("returns a Promise that resolves to an {OpgpProxyKey} instance",function(){expect(t).toBeDefined(),expect(t.message).toBe("boom"),expect(n).not.toBeDefined()})}),describe("OgpgKeyOpts",function(){})}),describe("getKeysFromArmor (armor: string, opts?: OpgpKeyringOpts): Promise<OpgpProxyKey[]|OpgpProxyKey>",function(){it("delegates to the openpgp primitive",function(t){e.getKeysFromArmor("key-armor").catch(function(){}).finally(function(){expect(openpgp.key.readArmored).toHaveBeenCalledWith("key-armor"),setTimeout(t)})}),describe("when the underlying openpgp primitive returns a single key",function(){var t,n;beforeEach(function(){openpgp.key.readArmored.and.returnValue({keys:[livekey.key]}),getLiveKey.and.returnValue(livekey),cache.set.and.returnValue("key-handle")}),beforeEach(function(i){e.getKeysFromArmor("key-armor").then(function(e){return n=e}).catch(function(e){return t=e}).finally(function(){return setTimeout(i)})}),it("creates a new {OpgpLiveKey} instance from the openpgp key",function(){expect(getLiveKey).toHaveBeenCalledWith(livekey.key)}),it("stores the new {OpgpLiveKey} instance in the underlying cache",function(){expect(cache.set).toHaveBeenCalledWith(livekey)}),it("returns a Promise that resolves to a corresponding {OpgpProxyKey} instance",function(){expect(n).toEqual(jasmine.objectContaining({handle:"key-handle"})),expect(n).toEqual(jasmine.objectContaining(livekey.bp)),expect(t).not.toBeDefined()})}),describe("when the underlying openpgp primitive returns multiple keys",function(){var t,n;beforeEach(function(){openpgp.key.readArmored.and.returnValue({keys:[livekey.key,livekey.key]}),getLiveKey.and.returnValue(livekey),cache.set.and.returnValue("key-handle")}),beforeEach(function(i){e.getKeysFromArmor("keys-armor").then(function(e){return n=e}).catch(function(e){return t=e}).finally(function(){return setTimeout(i)})}),it("creates new {OpgpLiveKey} instances from each openpgp key",function(){expect(getLiveKey.calls.allArgs()).toEqual([[livekey.key],[livekey.key]])}),it("stores the new {OpgpLiveKey} instances in the underlying cache",function(){expect(cache.set.calls.allArgs()).toEqual([[livekey],[livekey]])}),it("returns a Promise that resolves to corresponding {OpgpProxyKey} instances",function(){expect(n).toEqual(jasmine.any(Array)),expect(n.length).toBe(2),n.forEach(function(e){expect(e).toEqual(jasmine.objectContaining({handle:"key-handle"})),expect(e).toEqual(jasmine.objectContaining(livekey.bp))}),expect(t).not.toBeDefined()})}),describe("when the underlying openpgp primitive throws an error",function(){var t,n;beforeEach(function(){openpgp.key.readArmored.and.throwError("boom")}),beforeEach(function(i){e.getKeysFromArmor("key-armor").then(function(e){return n=e}).catch(function(e){return t=e}).finally(function(){return setTimeout(i)})}),it("returns a Promise that rejects with the thrown error",function(){expect(t).toBeDefined(),expect(t.message).toBe("boom"),expect(n).not.toBeDefined()})})}),describe("unlock (keyRef: KeyRef, passphrase: string, opts?: UnlockOpts): Promise<OpgpProxyKey>",function(){describe("when given a valid handle string of a locked key and the correct passphrase",function(){var t,n,i;beforeEach(function(){livekey.bp.isLocked=!0,t={key:{},bp:{isLocked:!1,keys:[{id:"key-id"}],user:{ids:[]}}},cache.get.and.returnValue(livekey),livekey.unlock.and.returnValue(Promise.resolve(t)),cache.set.and.returnValue("unlocked-key-handle")}),beforeEach(function(t){e.unlock("valid-key-handle","secret passphrase").then(function(e){return i=e}).catch(function(e){return n=e}).finally(function(){return setTimeout(t)})}),it("retrieves the {OpgpLiveKey} instance referenced by the given handle",function(){expect(cache.get).toHaveBeenCalledWith("valid-key-handle")}),it("delegates to the retrieved {OpgpLiveKey} instance",function(){expect(livekey.unlock).toHaveBeenCalledWith("secret passphrase")}),it("stores the unlocked key in the underlying cache",function(){expect(cache.set).toHaveBeenCalledWith(t)}),it("returns a Promise that resolves to an {OpgpProxyKey} instance of the unlocked {OpgpLiveKey} instance",function(){expect(i).toEqual(jasmine.objectContaining({handle:"unlocked-key-handle"})),expect(i).toEqual(jasmine.objectContaining(t.bp)),expect(n).not.toBeDefined()})}),describe("when the referenced {OpgpLiveKey} instance is already unlocked",function(){var t,n;beforeEach(function(){livekey.bp.isLocked=!1,cache.get.and.returnValue(livekey),livekey.unlock.and.returnValue(Promise.reject(new Error("key not locked")))}),beforeEach(function(i){e.unlock("unlocked-key-handle","passphrase").then(function(e){return n=e}).catch(function(e){return t=e}).finally(function(){return setTimeout(i)})}),it("retrieves the {OpgpLiveKey} instance referenced by the given handle",function(){expect(cache.get).toHaveBeenCalledWith("unlocked-key-handle")}),it("delegates to the retrieved {OpgpLiveKey} instance",function(){expect(livekey.unlock).toHaveBeenCalledWith("passphrase")}),it("returns a Promise that rejects with a `key not locked` {Error} from the {OpgpLiveKey#unlock} method",function(){expect(n).not.toBeDefined(),expect(t).toEqual(jasmine.any(Error)),expect(t.message).toBe("key not locked")})}),describe("when given a stale or invalid handle",function(){var t,n;beforeEach(function(){cache.get.and.returnValue(void 0)}),beforeEach(function(i){e.unlock("stale-key-handle","passphrase").then(function(e){return n=e}).catch(function(e){return t=e}).finally(function(){return setTimeout(i)})}),it("attempts to retrieve the {OpgpLiveKey} instance referenced by the given handle",function(){expect(cache.get).toHaveBeenCalledWith("stale-key-handle")}),it("returns a Promise that rejects with an `invalid key reference: not a string or stale` {Error}",function(){expect(n).not.toBeDefined(),expect(t).toEqual(jasmine.any(Error)),expect(t.message).toBe("invalid key reference: not a string or stale")})}),describe("when given an incorrect passphrase",function(){var t,n;beforeEach(function(){livekey.bp.isLocked=!0,cache.get.and.returnValue(livekey),livekey.unlock.and.returnValue(Promise.reject(new Error("fail to unlock key")))}),beforeEach(function(i){e.unlock("valid-key-handle","incorrect passphrase").then(function(e){return n=e}).catch(function(e){return t=e}).finally(function(){return setTimeout(i)})}),it("retrieves the {OpgpLiveKey} instance referenced by the given handle",function(){expect(cache.get).toHaveBeenCalledWith("valid-key-handle")}),it("delegates to the retrieved {OpgpLiveKey} instance",function(){expect(livekey.unlock).toHaveBeenCalledWith("incorrect passphrase")}),it("returns a Promise that rejects with a `fail to unlock key` {Error} from the {OpgpLiveKey#unlock} method",function(){expect(n).not.toBeDefined(),expect(t).toEqual(jasmine.any(Error)),expect(t.message).toBe("fail to unlock key")})}),describe("when the {OpgpLiveKey#unlock} method rejects with an {Error}",function(){var t,n;beforeEach(function(){livekey.bp.isLocked=!0,cache.get.and.returnValue(livekey),livekey.unlock.and.returnValue(Promise.reject(new Error("boom")))}),beforeEach(function(i){e.unlock("valid-key-handle","passphrase").then(function(e){return n=e}).catch(function(e){return t=e}).finally(function(){return setTimeout(i)})}),it("retrieves the {OpgpLiveKey} instance referenced by the given handle",function(){expect(cache.get).toHaveBeenCalledWith("valid-key-handle")}),it("delegates to the retrieved {OpgpLiveKey} instance",function(){expect(livekey.unlock).toHaveBeenCalledWith("passphrase")}),it("returns a Promise that rejects with the {Error} from the {OpgpLiveKey#unlock} method",function(){expect(n).not.toBeDefined(),expect(t).toEqual(jasmine.any(Error)),expect(t.message).toBe("boom")})})}),describe("lock (keyRef: KeyRef, passphrase: string, opts?: UnlockOpts): Promise<OpgpProxyKey>",function(){describe("when given a valid handle string of an unlocked key and a passphrase string",function(){var t,n,i;beforeEach(function(){livekey.bp.isLocked=!1,t={key:{},bp:{isLocked:!0,keys:[{id:"key-id"}],user:{ids:[]}}},cache.get.and.returnValue(livekey),livekey.lock.and.returnValue(Promise.resolve(t)),cache.set.and.returnValue("locked-key-handle")}),beforeEach(function(t){e.lock("unlocked-key-handle","secret passphrase").then(function(e){return i=e}).catch(function(e){return n=e}).finally(function(){return setTimeout(t)})}),it("retrieves the {OpgpLiveKey} instance referenced by the given handle",function(){expect(cache.get).toHaveBeenCalledWith("unlocked-key-handle")}),it("invalidates the original {OpgpLiveKey} from the cache",function(){expect(cache.del).toHaveBeenCalledWith("unlocked-key-handle")}),it("delegates to the retrieved {OpgpLiveKey} instance",function(){expect(livekey.lock).toHaveBeenCalledWith("secret passphrase")}),it("stores the unlocked key in the underlying cache",function(){expect(cache.set).toHaveBeenCalledWith(t)}),it("returns a Promise that resolves to an {OpgpProxyKey} instance of the locked {OpgpLiveKey} instance",function(){expect(i).toEqual(jasmine.objectContaining({handle:"locked-key-handle"})),expect(i).toEqual(jasmine.objectContaining(t.bp)),expect(n).not.toBeDefined()})}),describe("when the referenced {OpgpLiveKey} instance is already locked",function(){var t,n;beforeEach(function(){livekey.bp.isLocked=!0,cache.get.and.returnValue(livekey)}),beforeEach(function(i){e.lock("locked-key-handle","passphrase").then(function(e){return n=e}).catch(function(e){return t=e}).finally(function(){return setTimeout(i)})}),it("retrieves the {OpgpLiveKey} instance referenced by the given handle",function(){expect(cache.get).toHaveBeenCalledWith("locked-key-handle")}),it("does not invalidate the original {OpgpLiveKey} from the cache",function(){expect(cache.del).not.toHaveBeenCalled()}),it("does notdelegate to the retrieved {OpgpLiveKey} instance",function(){expect(livekey.lock).not.toHaveBeenCalled()}),it("returns a Promise that rejects with a `key not unlocked` {Error} from the {OpgpLiveKey#lock} method",function(){expect(n).not.toBeDefined(),expect(t).toEqual(jasmine.any(Error)),expect(t.message).toBe("key not unlocked")})}),describe("when given a stale or invalid handle",function(){var t,n;beforeEach(function(){cache.get.and.returnValue(void 0)}),beforeEach(function(i){e.lock("stale-key-handle","secret passphrase").then(function(e){return n=e}).catch(function(e){return t=e}).finally(function(){return setTimeout(i)})}),it("attempts to retrieve the {OpgpLiveKey} instance referenced by the given handle",function(){expect(cache.get).toHaveBeenCalledWith("stale-key-handle")}),it("returns a Promise that rejects with an `invalid key reference: not a string or stale` {Error}",function(){expect(n).not.toBeDefined(),expect(t).toEqual(jasmine.any(Error)),expect(t.message).toBe("invalid key reference: not a string or stale")})}),describe("when the {OpgpLiveKey#lock} method rejects with an {Error}",function(){var t,n;beforeEach(function(){cache.get.and.returnValue(livekey),livekey.lock.and.returnValue(Promise.reject(new Error("boom")))}),beforeEach(function(i){e.lock("valid-key-handle","passphrase").then(function(e){return n=e}).catch(function(e){return t=e}).finally(function(){return setTimeout(i)})}),it("retrieves the {OpgpLiveKey} instance referenced by the given handle",function(){expect(cache.get).toHaveBeenCalledWith("valid-key-handle")}),it("invalidates the original {OpgpLiveKey} from the cache",function(){expect(cache.del).toHaveBeenCalledWith("valid-key-handle")}),it("delegates to the retrieved {OpgpLiveKey} instance",function(){expect(livekey.lock).toHaveBeenCalledWith("passphrase")}),it("returns a Promise that rejects with the {Error} from the {OpgpLiveKey#lock} method",function(){expect(n).not.toBeDefined(),expect(t).toEqual(jasmine.any(Error)),expect(t.message).toBe("boom")})})}),describe("encrypt (keyRefs: KeyRefMap, plain: string, opts?: EncryptOpts): Promise<string>",function(){describe("when given a valid plain text string, and valid handles of valid public cipher and private authentication keys",function(){var t,n;beforeEach(function(){livekey.bp.isLocked=!1,cache.get.and.returnValue(livekey),openpgp.encrypt.and.returnValue({data:"cipher text"})}),beforeEach(function(i){var r={cipher:"valid-cipher-key-handle",auth:"valid-auth-key-handle"};e.encrypt(r,"plain text").then(function(e){return n=e}).catch(function(e){return t=e}).finally(function(){return setTimeout(i)})}),it("retrieves the {OpgpLiveKey} instances referenced by the given handles when compliant",function(){expect(cache.get.calls.allArgs()).toEqual([["valid-auth-key-handle"],["valid-cipher-key-handle"]])}),it("delegates to the openpgp primitive",function(){expect(openpgp.encrypt).toHaveBeenCalledWith(jasmine.objectContaining({data:"plain text",publicKeys:[livekey.key],privateKeys:[livekey.key]}))}),it("returns a Promise that resolves to an armor string of the given text string encrypted with the referenced cipher {OpgpLiveKey} instances and signed with the referenced authentication {OpgpLiveKey} instances ",function(){expect(n).toBe("cipher text"),expect(t).not.toBeDefined()})}),describe("when given a valid plain text string and a stale handle string",function(){var t,n;beforeEach(function(){cache.get.and.returnValue(void 0)}),beforeEach(function(i){var r={cipher:"stale-key-handle",auth:"stale-key-handle"};e.encrypt(r,"plain text").then(function(e){return n=e}).catch(function(e){return t=e}).finally(function(){return setTimeout(i)})}),it("attempts to retrieve the {OpgpLiveKey} instance referenced by the given handle",function(){expect(cache.get).toHaveBeenCalledWith("stale-key-handle")}),it("does not delegate to the openpgp primitive",function(){expect(openpgp.encrypt).not.toHaveBeenCalled()}),it("returns a Promise that rejects with an `invalid key reference: not a string or stale` {Error}",function(){expect(n).not.toBeDefined(),expect(t).toBeDefined(),expect(t.message).toBe("invalid key reference: not a string or stale")})}),describe("when given a valid plain text string, and a valid handle string of a locked private key",function(){var t,n;beforeEach(function(){livekey.bp.isLocked=!0,cache.get.and.returnValue(livekey)}),beforeEach(function(i){var r={cipher:"cipher-key-handle",auth:"locked-auth-key-handle"};e.encrypt(r,"plain text").then(function(e){return n=e}).catch(function(e){return t=e}).finally(function(){return setTimeout(i)})}),it("attempts to retrieve the {OpgpLiveKey} instance referenced by the given handle",function(){expect(cache.get).toHaveBeenCalledWith("locked-auth-key-handle")}),it("does not delegate to the openpgp primitive",function(){expect(openpgp.encrypt).not.toHaveBeenCalled()}),it("returns a Promise that rejects with an `private key not unlocked` {Error}",function(){expect(n).not.toBeDefined(),expect(t).toBeDefined(),expect(t.message).toBe("private key not unlocked")})}),describe("when the underlying openpgp primitive rejects with an {Error}",function(){var t,n;beforeEach(function(){livekey.bp.isLocked=!1,cache.get.and.returnValue(livekey),openpgp.encrypt.and.returnValue(Promise.reject(new Error("boom")))}),beforeEach(function(i){var r={cipher:"valid-cipher-key-handle",auth:"valid-auth-key-handle"};e.encrypt(r,"plain text").then(function(e){return n=e}).catch(function(e){return t=e}).finally(function(){return setTimeout(i)})}),it("retrieves the {OpgpLiveKey} instances referenced by the given handles when compliant",function(){expect(cache.get.calls.allArgs()).toEqual([["valid-auth-key-handle"],["valid-cipher-key-handle"]])}),it("delegates to the openpgp primitive",function(){expect(openpgp.encrypt).toHaveBeenCalledWith(jasmine.objectContaining({data:"plain text",publicKeys:[livekey.key],privateKeys:[livekey.key]}))}),it("returns a Promise that rejects with the {Error} from the openpgp primitive",function(){expect(n).not.toBeDefined(),expect(t).toEqual(jasmine.any(Error)),expect(t.message).toBe("boom")})})}),describe("decrypt (keyRefs: KeyRefMap, cipher: string, opts?: DecryptOpts): Promise<string>",function(){var t;beforeEach(function(){t={}}),describe("when given a valid cipher text string, and valid handles of valid public authentication and a private cipher key",function(){var n,i;beforeEach(function(){livekey.bp.isLocked=!1,cache.get.and.returnValue(livekey),openpgp.message.readArmored.and.returnValue(t),openpgp.decrypt.and.returnValue({data:"plain text"})}),beforeEach(function(t){var r={cipher:"valid-cipher-key-handle",auth:"valid-auth-key-handle"};e.decrypt(r,"cipher text").then(function(e){return i=e}).catch(function(e){return n=e}).finally(function(){return setTimeout(t)})}),it("retrieves the {OpgpLiveKey} instances referenced by the given handles when compliant",function(){expect(cache.get.calls.allArgs()).toEqual([["valid-cipher-key-handle"],["valid-auth-key-handle"]])}),it("delegates to the openpgp primitive",function(){expect(openpgp.message.readArmored).toHaveBeenCalledWith("cipher text"),expect(openpgp.decrypt).toHaveBeenCalledWith(jasmine.objectContaining({message:t,publicKeys:[livekey.key],privateKey:livekey.key}))}),it("returns a Promise that resolves to an armor string of the given text string decrypted with the referenced cipher {OpgpLiveKey} instance and authenticated with the referenced authentication {OpgpLiveKey} instances ",function(){expect(i).toBe("plain text"),expect(n).not.toBeDefined()})}),describe("when given a valid plain text string and a stale handle string",function(){var t,n;beforeEach(function(){cache.get.and.returnValue(void 0)}),beforeEach(function(i){var r={cipher:"stale-key-handle",auth:"stale-key-handle"};e.decrypt(r,"cipher text").then(function(e){return n=e}).catch(function(e){return t=e}).finally(function(){return setTimeout(i)})}),it("attempts to retrieve the {OpgpLiveKey} instance referenced by the given handle",function(){expect(cache.get).toHaveBeenCalledWith("stale-key-handle")}),it("does not delegate to the openpgp primitive",function(){expect(openpgp.message.readArmored).not.toHaveBeenCalled(),expect(openpgp.decrypt).not.toHaveBeenCalled()}),it("returns a Promise that rejects with an `invalid key reference: not a string or stale` {Error}",function(){expect(n).not.toBeDefined(),expect(t).toBeDefined(),expect(t.message).toBe("invalid key reference: not a string or stale")})}),describe("when given a valid plain text string, and a valid handle string of a locked private key",function(){var t,n;beforeEach(function(){livekey.bp.isLocked=!0,cache.get.and.returnValue(livekey)}),beforeEach(function(i){var r={cipher:"locked-cipher-key-handle",auth:"auth-key-handle"};e.decrypt(r,"cipher text").then(function(e){return n=e}).catch(function(e){return t=e}).finally(function(){return setTimeout(i)})}),it("attempts to retrieve the {OpgpLiveKey} instance referenced by the given handle",function(){expect(cache.get).toHaveBeenCalledWith("locked-cipher-key-handle")}),it("does not delegate to the openpgp primitive",function(){expect(openpgp.message.readArmored).not.toHaveBeenCalled(),expect(openpgp.decrypt).not.toHaveBeenCalled()}),it("returns a Promise that rejects with an `private key not unlocked` {Error}",function(){expect(n).not.toBeDefined(),expect(t).toBeDefined(),expect(t.message).toBe("private key not unlocked")})}),describe("when the underlying openpgp primitive rejects with an {Error}",function(){var n,i;beforeEach(function(){livekey.bp.isLocked=!1,cache.get.and.returnValue(livekey),openpgp.message.readArmored.and.returnValue(t),openpgp.decrypt.and.returnValue(Promise.reject(new Error("boom")))}),beforeEach(function(t){var r={cipher:"valid-cipher-key-handle",auth:"valid-auth-key-handle"};e.decrypt(r,"cipher text").then(function(e){return i=e}).catch(function(e){return n=e}).finally(function(){return setTimeout(t)})}),it("retrieves the {OpgpLiveKey} instances referenced by the given handles when compliant",function(){expect(cache.get.calls.allArgs()).toEqual([["valid-cipher-key-handle"],["valid-auth-key-handle"]])}),it("delegates to the openpgp primitive",function(){expect(openpgp.message.readArmored).toHaveBeenCalledWith("cipher text"),expect(openpgp.decrypt).toHaveBeenCalledWith(jasmine.objectContaining({message:t,publicKeys:[livekey.key],privateKey:livekey.key}))}),it("returns a Promise that rejects with the {Error} from the openpgp primitive",function(){expect(i).not.toBeDefined(),expect(n).toEqual(jasmine.any(Error)),expect(n.message).toBe("boom")})})}),describe("sign (keyRefs: KeyRef[]|KeyRef, text: string, opts?: SignOpts): Promise<string>",function(){var t;beforeEach(function(){t=jasmine.createSpyObj("message",["sign","armor"])}),describe("when given a text string and a valid handle string that is not stale",function(){var n,i;beforeEach(function(){cache.get.and.returnValue(livekey),openpgp.message.fromText.and.returnValue(t),t.sign.and.returnValue(t),t.armor.and.returnValue("signed-armor-text")}),beforeEach(function(t){e.sign("valid-key-handle","plain text").then(function(e){return i=e}).catch(function(e){return n=e}).finally(function(){return setTimeout(t)})}),it("retrieves the {OpgpLiveKey} instance referenced by the given handle",function(){expect(cache.get).toHaveBeenCalledWith("valid-key-handle")}),it("delegates to the openpgp primitive",function(){expect(openpgp.message.fromText).toHaveBeenCalledWith("plain text"),expect(t.sign).toHaveBeenCalledWith([livekey.key]),expect(t.armor).toHaveBeenCalledWith()}),it("returns a Promise that resolves to an armor string of the given text string signed with the referenced {OpgpLiveKey} instance ",function(){expect(i).toBe("signed-armor-text"),expect(n).not.toBeDefined()})}),describe("when given a text string and a stale handle string",function(){var t,n;beforeEach(function(){cache.get.and.returnValue(void 0)}),beforeEach(function(i){e.sign("stale-key-handle","plain text").then(function(e){return n=e}).catch(function(e){return t=e}).finally(function(){return setTimeout(i)})}),it("attempts to retrieve the {OpgpLiveKey} instance referenced by the given handle",function(){expect(cache.get).toHaveBeenCalledWith("stale-key-handle")}),it("does not delegate to the openpgp primitive",function(){expect(openpgp.message.fromText).not.toHaveBeenCalled()}),it("returns a Promise that rejects with an `invalid key reference: not a string or stale` {Error}",function(){expect(n).not.toBeDefined(),expect(t).toBeDefined(),expect(t.message).toBe("invalid key reference: not a string or stale")})}),describe("when given non-compliant arguments",function(){var t,n;beforeEach(function(){cache.get.and.returnValue(livekey)}),beforeEach(function(i){var r=getInvalidAuthArgs();Promise.any(r.map(function(t){return e.sign.apply(e,t)})).then(function(e){return n=e}).catch(function(e){return t=e}).finally(function(){return setTimeout(i)})}),it("attempts to retrieve the {OpgpLiveKey} instances referenced by the given handles when compliant",function(){cache.get.calls.allArgs().forEach(function(e){return expect(e).toEqual(["compliant handle"])})}),it("does not delegate to the openpgp primitive",function(){expect(openpgp.message.fromText).not.toHaveBeenCalled()}),it("returns a Promise that rejects with an `invalid key reference: not a string or stale` or an `invalid text: not a string` {Error}",function(){expect(n).not.toBeDefined(),expect(t).toEqual(jasmine.any(Promise.AggregateError)),t.forEach(function(e){expect(e).toEqual(jasmine.any(Error)),expect(e.message).toEqual(jasmine.stringMatching(/invalid key reference: not a string or stale|invalid text: not a string/))})})})}),describe("verify (keyRefs: KeyRef[]|KeyRef, armor: string, opts?: VerifyOpts): Promise<string>",function(){var t;beforeEach(function(){t=jasmine.createSpyObj("message",["verify","getText"])}),describe("when given a signed armor text string and the valid handle string of the corresponding authentication key",function(){var n,i;beforeEach(function(){cache.get.and.returnValue(livekey),openpgp.message.readArmored.and.returnValue(t),t.verify.and.returnValue([{keyid:"keyid",valid:!0}]),t.getText.and.returnValue("plain-text")}),beforeEach(function(t){e.verify("valid-auth-key-handle","signed armor text").then(function(e){return i=e}).catch(function(e){return n=e}).finally(function(){return setTimeout(t)})}),it("retrieves the {OpgpLiveKey} instance referenced by the given handle",function(){expect(cache.get).toHaveBeenCalledWith("valid-auth-key-handle")}),it("delegates to the openpgp primitive",function(){expect(openpgp.message.readArmored).toHaveBeenCalledWith("signed armor text"),expect(t.verify).toHaveBeenCalledWith([livekey.key]),expect(t.getText).toHaveBeenCalledWith()}),it("returns a Promise that resolves to the plain text string",function(){expect(i).toBe("plain-text"),expect(n).not.toBeDefined()})}),describe("when given a signed armor text string and a valid handle string of the wrong authentication key",function(){var n,i;beforeEach(function(){cache.get.and.returnValue(livekey),openpgp.message.readArmored.and.returnValue(t),t.verify.and.returnValue([{keyid:"verified-keyid",valid:!0},{keyid:"wrong-keyid",valid:!1},{keyid:"another-wrong-keyid",valid:!1}])}),beforeEach(function(t){e.verify(["correct-key-handle","wrong-key-handle","another-wrong-key-handle"],"signed armor text").then(function(e){return i=e}).catch(function(e){return n=e}).finally(function(){return setTimeout(t)})}),it("retrieves the {OpgpLiveKey} instance referenced by the given handle",function(){expect(cache.get.calls.allArgs()).toEqual([["correct-key-handle"],["wrong-key-handle"],["another-wrong-key-handle"]])}),it("delegates to the openpgp primitive",function(){expect(openpgp.message.readArmored).toHaveBeenCalledWith("signed armor text"),expect(t.verify).toHaveBeenCalledWith([livekey.key,livekey.key,livekey.key]),expect(t.getText).not.toHaveBeenCalled()}),it("returns a Promise that rejects with an {Error} containing a message with a trailing list of the key IDs that fail authentication",function(){expect(i).not.toBeDefined(),expect(n).toEqual(jasmine.any(Error)),expect(n.message).toBe("authentication failed: wrong-keyid,another-wrong-keyid")})}),describe("when given a signed armor text string and a stale handle string",function(){var t,n;beforeEach(function(){cache.get.and.returnValue(void 0)}),beforeEach(function(i){e.verify("stale-key-handle","signed armor text").then(function(e){return n=e}).catch(function(e){return t=e}).finally(function(){return setTimeout(i)})}),it("attempts to retrieve the {OpgpLiveKey} instance referenced by the given handle",function(){expect(cache.get).toHaveBeenCalledWith("stale-key-handle")}),it("does not delegate to the openpgp primitive",function(){expect(openpgp.message.readArmored).not.toHaveBeenCalled()}),it("returns a Promise that rejects with an `invalid key reference: not a string or stale` {Error}",function(){expect(n).not.toBeDefined(),expect(t).toBeDefined(),expect(t.message).toBe("invalid key reference: not a string or stale")})}),describe("when given non-compliant arguments",function(){var t,n;beforeEach(function(){cache.get.and.returnValue(livekey)}),beforeEach(function(i){var r=getInvalidAuthArgs();Promise.any(r.map(function(t){return e.verify.apply(e,t)})).then(function(e){return n=e}).catch(function(e){return t=e}).finally(function(){return setTimeout(i)})}),it("attempts to retrieve the {OpgpLiveKey} instances referenced by the given handles when compliant",function(){cache.get.calls.allArgs().forEach(function(e){return expect(e).toEqual(["compliant handle"])})}),it("does not delegate to the openpgp primitive",function(){expect(openpgp.message.readArmored).not.toHaveBeenCalled()}),it("returns a Promise that rejects with an `invalid key reference: not a string or stale` or an `invalid armor: not a string` {Error}",function(){expect(n).not.toBeDefined(),expect(t).toEqual(jasmine.any(Promise.AggregateError)),t.forEach(function(e){expect(e).toEqual(jasmine.any(Error)),expect(e.message).toEqual(jasmine.stringMatching(/invalid key reference: not a string or stale|invalid armor: not a string/));
})})})})});
},{"../src":7,"bluebird":undefined}],6:[function(require,module,exports){
"use strict";var live_key_1=require("../src/live-key"),Buffer=require("buffer").Buffer,getLiveKey,openpgp,key,subkeys,packets,msg,blueprint,cloneKey;beforeEach(function(){openpgp={crypto:{hash:jasmine.createSpyObj("hash",["sha256"])},key:jasmine.createSpyObj("key",["readArmored"]),message:jasmine.createSpyObj("message",["fromText","readArmored"])},key=jasmine.createSpyObj("key",["armor","getAllKeyPackets","isPublic","getUserIds","getSigningKeyPacket","getEncryptionKeyPacket","verifyPrimaryKey","getExpirationTime","encrypt","decrypt"]),packets=[0,1,2,3].map(function(e){return jasmine.createSpyObj("packet"+e,["getFingerprint","writeOld"])}),subkeys=[0,1,2].map(function(e){return jasmine.createSpyObj("subkey"+e,["isValidEncryptionKey","isValidSigningKey","verify","getExpirationTime"])}),msg=jasmine.createSpyObj("msg",["sign","verify"]),key.armor.and.returnValue("key-armor"),key.getAllKeyPackets.and.returnValue(packets),key.isPublic.and.returnValue(!1),key.getUserIds.and.returnValue(["user@test.io"]),key.getSigningKeyPacket.and.returnValue(packets[0]),key.getEncryptionKeyPacket.and.returnValue(packets[0]),key.verifyPrimaryKey.and.returnValue(6510),packets.forEach(function(e,t){e.getFingerprint.and.returnValue(t.toString()),e.writeOld.and.returnValue(["old"+t])}),subkeys.forEach(function(e,t){e.isValidEncryptionKey.and.returnValue(!0),e.isValidSigningKey.and.returnValue(!0),e.verify.and.returnValue(6511+t),e.getExpirationTime.and.returnValue(new Date(1984-t))}),key.primaryKey={isDecrypted:!1},key.subKeys=subkeys,cloneKey=function(e){var t=Object.assign({},e);return t.primaryKey={isDecrypted:e.primaryKey.isDecrypted},t.subKeys=e.subKeys.slice(),t},openpgp.crypto.hash.sha256.and.returnValue(Buffer.from("c2hhMjU2","base64")),openpgp.key.readArmored.and.callFake(function(){return{keys:[cloneKey(key)]}}),openpgp.message.readArmored.and.returnValue(msg),openpgp.message.fromText.and.returnValue(msg),blueprint={isLocked:!0,isPublic:!1,keys:[0,1,2,3].map(function(e){return{isAuth:!0,isCiph:!0,expires:e?1985-e:1/0,fingerprint:e.toString(),hash:"c2hhMjU2",status:6510+e}}),user:{ids:["user@test.io"]}}}),beforeEach(function(){getLiveKey=live_key_1.default({openpgp:openpgp})}),describe("default export: getLiveKeyFactory (config: {openpgp:any}): LiveKeyFactory",function(){it("returns a {LiveKey} factory when given an instance of openpgp",function(){expect(getLiveKey).toEqual(jasmine.any(Function))})}),describe("LiveKeyFactory: getLiveKey (key: any, opts?: LiveKeyFactoryOpts): OpgpLiveKey",function(){var e;beforeEach(function(){e=getLiveKey(key)}),it("returns a {OpgpLiveKey} instance that wraps the given openpgp key",function(){expect(e).toEqual(jasmine.objectContaining({key:key,bp:jasmine.any(Object),armor:jasmine.any(Function),unlock:jasmine.any(Function),lock:jasmine.any(Function),sign:jasmine.any(Function),verify:jasmine.any(Function)}))})}),describe("OpgpLiveKey",function(){var e;beforeEach(function(){e=getLiveKey(key)}),describe("bp: OpgpKeyBlueprint",function(){var t;beforeEach(function(){t=e.bp}),it("is a blueprint of the openpgp wrapped in the {OpgpLiveKey} instance:\n{\n  isLocked: boolean,\n  isPublic: boolean,\n  keys: OpgpKeyId[],\n  user: { ids: string[] }\n}\nwhere each {OpgpKeyId} element in `keys` is a blueprint of the corresponding key component:\n{\n  isAuth: boolean,\n  isCiph: boolean,\n  expires: number,\n  fingerprint: string,\n  hash: string,\n  status: number\n}",function(){expect(t).toEqual(blueprint)})}),describe("armor (): Promise<string>",function(){describe("when the openpgp primitive succeeds",function(){var t,n;beforeEach(function(r){e.armor().then(function(e){return n=e}).catch(function(e){return t=e}).finally(function(){return setTimeout(r)})}),it("returns a Promise that resolves to an armored string representation of the wrapped openpgp key when the openpgp primitive succeeds",function(){expect(key.armor).toHaveBeenCalled(),expect(n).toBe("key-armor"),expect(t).not.toBeDefined()})}),describe("when the openpgp primitive fails",function(){var t,n;beforeEach(function(r){key.armor.and.throwError("boom"),e.armor().then(function(e){return n=e}).catch(function(e){return t=e}).finally(function(){return setTimeout(r)})}),it("returns a Promise that rejects with the error from the openpgp primitive when it fails",function(){expect(key.armor).toHaveBeenCalled(),expect(n).not.toBeDefined(),expect(t).toBeDefined(),expect(t.message).toBe("boom")})})}),describe("unlock (passphrase: string, opts?: LiveKeyUnlockOpts): Promise<OpgpLiveKey>",function(){var t;beforeEach(function(){t=cloneKey(key),t.primaryKey.isDecrypted=!0}),describe("when given the correct passphrase",function(){var n,r;beforeEach(function(i){openpgp.key.readArmored.and.callFake(function(){var e=cloneKey(t);return e.decrypt=jasmine.createSpy("decrypt").and.returnValue(!0),{keys:[e]}}),e.unlock("correct passphrase").then(function(e){return r=e}).catch(function(e){return n=e}).finally(function(){return setTimeout(i)})}),it("returns a Promise that resolves to a new, unlocked {OpgpLiveKey} instance",function(){expect(n).not.toBeDefined(),expect(r).not.toBe(e),expect(r.bp.isLocked).toBe(!1)}),it("does not change the state of its {OpgpLiveKey} instance",function(){expect(e.key).toBe(key),expect(e.key.primaryKey.isDecrypted).toBe(!1),expect(e.bp.isLocked).toBe(!0),expect(e.key.decrypt).not.toHaveBeenCalled()})}),describe("when given an incorrect passphrase",function(){var t,n;beforeEach(function(r){key.decrypt.and.returnValue(!1),e.unlock("incorrect passphrase").then(function(e){return n=e}).catch(function(e){return t=e}).finally(function(){return setTimeout(r)})}),it("returns a Promise that rejects with a `fail to unlock key` {Error}",function(){expect(n).not.toBeDefined(),expect(t).toEqual(jasmine.any(Error)),expect(t.message).toBe("fail to unlock key")}),it("does not change the state of its {OpgpLiveKey} instance",function(){expect(e.key).toBe(key),expect(e.key.primaryKey.isDecrypted).toBe(!1),expect(e.bp.isLocked).toBe(!0)})}),describe("when its {OpgpLiveKey} is already unlocked",function(){var n,r;beforeEach(function(i){e=getLiveKey(t),e.unlock("passphrase").then(function(e){return r=e}).catch(function(e){return n=e}).finally(function(){return setTimeout(i)})}),it("returns a Promise that rejects with a `key not locked` {Error}",function(){expect(r).not.toBeDefined(),expect(n).toEqual(jasmine.any(Error)),expect(n.message).toBe("key not locked")}),it("does not change the state of its {OpgpLiveKey} instance",function(){expect(e.key).toBe(t),expect(e.key.primaryKey.isDecrypted).toBe(!0),expect(e.bp.isLocked).toBe(!1)})}),describe("when the openpgp primitive throws an exception",function(){var t,n;beforeEach(function(r){key.decrypt.and.throwError("boom"),e.unlock("passphrase").then(function(e){return n=e}).catch(function(e){return t=e}).finally(function(){return setTimeout(r)})}),it("returns a Promise that rejects with the corresponding error",function(){expect(n).not.toBeDefined(),expect(t).toEqual(jasmine.any(Error)),expect(t.message).toBe("boom")}),it("does not change the state of its {OpgpLiveKey} instance",function(){expect(e.key).toBe(key),expect(e.key.primaryKey.isDecrypted).toBe(!1),expect(e.bp.isLocked).toBe(!0)})})}),describe("lock (passphrase: string, opts?: LiveKeyUnlockOpts): Promise<OpgpLiveKey>",function(){var t;beforeEach(function(){t=cloneKey(key),t.primaryKey.isDecrypted=!0}),describe("when given a passphrase",function(){var n,r;beforeEach(function(i){t.encrypt=jasmine.createSpy("encrypt").and.callFake(function(){return t.primaryKey.isDecrypted=!1}),e=getLiveKey(t),e.lock("passphrase").then(function(e){return r=e}).catch(function(e){return n=e}).finally(function(){return setTimeout(i)})}),it("returns a Promise that resolves to a new, locked {OpgpLiveKey} instance",function(){expect(n).not.toBeDefined(),expect(r).not.toBe(e),expect(r.bp.isLocked).toBe(!0)}),it("invalidates its {OpgpLiveKey} instance",function(){expect(e.key).not.toBeDefined()})}),describe("when its {OpgpLiveKey} is already locked",function(){var t,n;beforeEach(function(r){e.lock("passphrase").then(function(e){return n=e}).catch(function(e){return t=e}).finally(function(){return setTimeout(r)})}),it("returns a Promise that rejects with a `key not unlocked` {Error}",function(){expect(n).not.toBeDefined(),expect(t).toEqual(jasmine.any(Error)),expect(t.message).toBe("key not unlocked")}),it("does not change the state of its {OpgpLiveKey} instance",function(){expect(e.key).toBe(key),expect(e.key.primaryKey.isDecrypted).toBe(!1),expect(e.bp.isLocked).toBe(!0)})}),describe("when the openpgp primitive throws an exception",function(){var n,r;beforeEach(function(i){key.encrypt.and.throwError("boom"),e=getLiveKey(t),e.lock("incorrect passphrase").then(function(e){return r=e}).catch(function(e){return n=e}).finally(function(){return setTimeout(i)})}),it("returns a Promise that rejects with the corresponding error",function(){expect(r).not.toBeDefined(),expect(n).toEqual(jasmine.any(Error)),expect(n.message).toBe("boom")}),it("invalidates its {OpgpLiveKey} instance",function(){expect(e.key).not.toBeDefined()})})})});

},{"../src/live-key":8,"buffer":2}],7:[function(require,module,exports){
"use strict";function reject(e){return Promise.reject(new Error(e))}function getHandle(e){var t=utils_1.isString(e)?e:!!e&&e.handle;return utils_1.isString(t)&&t}function getOpenpgp(e){var t=isOpenpgp(e)?e:require("openpgp");return t}function isOpenpgp(e){return!!e&&["crypto","key","message"].every(function(t){return!!e[t]})}var live_key_1=require("./live-key"),proxy_key_1=require("./proxy-key"),utils_1=require("./utils"),csrkey_cache_1=require("csrkey-cache"),Promise=require("bluebird"),tslib_1=require("tslib"),OpgpServiceClass=function(){function e(e,t,r,n){this.cache=e,this.getLiveKey=t,this.getProxyKey=r,this.openpgp=n}return e.prototype.generateKey=function(e,t){var r=this;return utils_1.isString(e)?Promise.try(function(){var n={userIds:t&&[].concat(t.users),passphrase:e,numBits:t&&t.size||4096,unlocked:t&&!!t.unlocked};return r.openpgp.key.generateKey(n).then(function(e){return r.cacheAndProxyKey(r.getLiveKey(e))})}):reject("invalid passphrase: not a string")},e.prototype.getKeysFromArmor=function(e,t){var r=this;return utils_1.isString(e)?Promise.try(function(){var t=r.openpgp.key.readArmored(e).keys.map(function(e){return r.cacheAndProxyKey(r.getLiveKey(e))});return t.length>1?t:t[0]}):reject("invalid armor: not a string")},e.prototype.unlock=function(e,t,r){var n=this;return utils_1.isString(t)?Promise.try(function(){return n.getCachedLiveKey(e).unlock(t)}).then(function(e){return n.cacheAndProxyKey(e)}):reject("invalid passphrase: not a string")},e.prototype.lock=function(e,t,r){var n=this;return utils_1.isString(t)?Promise.try(function(){var r=n.getCachedLiveKey(e);if(r.bp.isLocked)return reject("key not unlocked");var i=getHandle(e);return n.cache.del(i),r.lock(t)}).then(function(e){return n.cacheAndProxyKey(e)}):reject("invalid passphrase: not a string")},e.prototype.encrypt=function(e,t,r){var n=this;return utils_1.isString(t)?Promise.try(function(){return n.openpgp.encrypt({privateKeys:n.getCachedPrivateOpenpgpKeys(e.auth),publicKeys:n.getCachedOpenpgpKeys(e.cipher),data:t})}).get("data"):reject("invalid plain text: not a string")},e.prototype.decrypt=function(e,t,r){var n=this;return utils_1.isString(t)?Promise.try(function(){return n.openpgp.decrypt({privateKey:n.getCachedPrivateOpenpgpKeys(e.cipher)[0],publicKeys:n.getCachedOpenpgpKeys(e.auth),message:n.openpgp.message.readArmored(t)})}).get("data"):reject("invalid cipher: not a string")},e.prototype.sign=function(e,t,r){var n=this;return Promise.try(function(){var r=n.getCachedOpenpgpKeys(e);if(!utils_1.isString(t))return reject("invalid text: not a string");var i=n.openpgp.message.fromText(t);return i.sign(r).armor()})},e.prototype.verify=function(e,t,r){var n=this;return Promise.try(function(){var r=n.getCachedOpenpgpKeys(e);if(!utils_1.isString(t))return reject("invalid armor: not a string");var i=n.openpgp.message.readArmored(t),o=i.verify(r).filter(function(e){return!e.valid}).map(function(e){return e.keyid}).join();return o?reject("authentication failed: "+o):i.getText()})},e.prototype.getCachedLiveKey=function(e){var t=getHandle(e),r=t&&this.cache.get(t);if(!r)throw new Error("invalid key reference: not a string or stale");return r},e.prototype.getCachedLiveKeys=function(e){var t=this,r=[].concat(e);if(!r.length)throw new Error("no key references");return r.map(function(e){return t.getCachedLiveKey(e)})},e.prototype.getCachedOpenpgpKeys=function(e){return this.getCachedLiveKeys(e).map(function(e){return e.key})},e.prototype.getCachedPrivateOpenpgpKeys=function(e){var t=this.getCachedLiveKeys(e);if(t.some(function(e){return e.bp.isLocked}))throw new Error("private key not unlocked");return t.map(function(e){return e.key})},e.prototype.cacheAndProxyKey=function(e){var t=this.cache.set(e);if(!t)throw new Error("fail to cache key");return this.getProxyKey(t,e.bp)},e.getInstance=function(t){var r=tslib_1.__assign({},t),n=r.cache||csrkey_cache_1.default(),i=getOpenpgp(r.openpgp),o=r.getLiveKey||live_key_1.default({openpgp:i});return new e(n,o,r.getProxyKey||proxy_key_1.default,i)},e}(),getOpgpService=OpgpServiceClass.getInstance;Object.defineProperty(exports,"__esModule",{value:!0}),exports.default=getOpgpService;

},{"./live-key":8,"./proxy-key":9,"./utils":10,"bluebird":undefined,"csrkey-cache":undefined,"openpgp":undefined,"tslib":undefined}],8:[function(require,module,exports){
"use strict";function isLocked(e){return!e.primaryKey.isDecrypted}function getExpiry(e){var t=e.getExpirationTime();return t?t.getTime():1/0}var Buffer=require("buffer").Buffer,Promise=require("bluebird"),tslib_1=require("tslib"),LiveKeyClass=function(){function e(e,t,r){this.utils=e,this.key=t,this.bp=r}return e.prototype.armor=function(){var e=this;return Promise.try(function(){return e.key.armor()})},e.prototype.unlock=function(t,r){var i=this;return this.bp.isLocked?Promise.try(function(){var r=i.utils.cloneKey(i.key),n=r.decrypt(t);return n?e.getInstance(i.utils,r):Promise.reject(new Error("fail to unlock key"))}):Promise.reject(new Error("key not locked"))},e.prototype.lock=function(t,r){var i=this;return this.bp.isLocked?Promise.reject(new Error("key not unlocked")):Promise.try(function(){return i.key.encrypt(t),e.getInstance(i.utils,i.key)}).finally(function(){return delete i.key})},e.prototype.sign=function(e,t){var r=this;return Promise.try(function(){return r.utils.openpgp.message.fromText(e).sign([r.key]).armor()})},e.prototype.verify=function(e,t){var r=this;return Promise.try(function(){var t=r.utils.openpgp.message.readArmored(e),i=t.verify([r.key]);return!!i.length&&i[0].valid&&t.getText()})},e.getInstance=function(t,r,i){var n=t.getKeyBlueprint(r);return new e(t,r,n)},e.getFactory=function(t){var r=new OpenpgpKeyUtils(t.openpgp);return e.getInstance.bind(e,r)},e}(),OpenpgpKeyUtils=function(){function e(e){this.openpgp=e}return e.prototype.getKeyBlueprint=function(e){var t=this,r=e.getAllKeyPackets(),i=this.getOpgpKeyId(e,r[0]),n=r.slice(1).map(function(r,i){return t.getOpgpKeyId(e,r,i)});return{isLocked:isLocked(e),isPublic:e.isPublic(),keys:[i].concat(n),user:{ids:e.getUserIds()}}},e.prototype.getHashes=function(e){return{hash:this.getFingerprintHash(e),fingerprint:e.getFingerprint()}},e.prototype.getPrimaryKeyType=function(e){var t=this.cloneKey(e);return t.subKeys=null,{isAuth:!!t.getSigningKeyPacket(),isCiph:!!t.getEncryptionKeyPacket()}},e.prototype.getFingerprintHash=function(e,t){var r=e.writeOld(),i=this.openpgp.crypto.hash[t&&t.hash||"sha256"](r);return Buffer.from(i).toString(t&&t.format||"base64")},e.prototype.cloneKey=function(e){return this.openpgp.key.readArmored(e.armor()).keys[0]},e.prototype.getOpgpKeyId=function(e,t,r){return"undefined"==typeof r?this.getPrimaryOpgpKeyId(e,t):this.getSubkeyOpgpKeyId(e,t,r)},e.prototype.getPrimaryOpgpKeyId=function(e,t){return tslib_1.__assign(this.getHashes(t),this.getPrimaryKeyType(e),{status:e.verifyPrimaryKey(),expires:getExpiry(e)})},e.prototype.getSubkeyOpgpKeyId=function(e,t,r){var i=e.subKeys[r];return tslib_1.__assign(this.getHashes(t),{isCiph:i.isValidEncryptionKey(e.primaryKey),isAuth:i.isValidSigningKey(e.primaryKey),status:i.verify(e.primaryKey),expires:getExpiry(i)})},e}(),getLiveKeyFactory=LiveKeyClass.getFactory;Object.defineProperty(exports,"__esModule",{value:!0}),exports.default=getLiveKeyFactory;
},{"bluebird":undefined,"buffer":2,"tslib":undefined}],9:[function(require,module,exports){
"use strict";var tslib_1=require("tslib"),getProxyKey=function(e,s){var r=tslib_1.__assign({handle:e},s);return r.keys=s.keys.map(function(e){return tslib_1.__assign({},e)}),r.user={ids:s.user.ids.slice()},r};Object.defineProperty(exports,"__esModule",{value:!0}),exports.default=getProxyKey;

},{"tslib":undefined}],10:[function(require,module,exports){
"use strict";function isString(t){return"string"==typeof(t&&t.valueOf())}exports.isString=isString;
},{}]},{},[5,6]);
