
(function (global) {
'use strict';

//import bigInt from 'big-integer';

const fromString = function (string) {
  string = string.trim();
  if (string === '') {
    string = '0';
  }
  let radix = 10;
  const prefix = string.slice(0, 2);
  if (prefix === '0b' || prefix === '0B') {
    radix = 2;
  }
  if (prefix === '0o' || prefix === '0O') {
    radix = 8;
  }
  if (prefix === '0x' || prefix === '0X') {
    radix = 16;
  }
  if (radix !== 10) {
    string = string.slice(2).trim();
  }
  let negative = false;
  if (string.slice(0, 1) === '-') {
    string = string.slice(1).trim();
    negative = true;
  }
  if (string.length === 0) {
    throw new SyntaxError('Cannot convert a string to a BigInt');
  }
  for (let i = 0; i < string.length; i += 1) {
    const charCode = string.charCodeAt(i);
    let n = radix;
    if (charCode >= '0'.charCodeAt(0) && charCode <= '9'.charCodeAt(0)) {
      n = charCode - '0'.charCodeAt(0);
    } else if (charCode >= 'A'.charCodeAt(0) && charCode <= 'Z'.charCodeAt(0)) {
      n = charCode - 'A'.charCodeAt(0) + 10;
    } else if (charCode >= 'a'.charCodeAt(0) && charCode <= 'z'.charCodeAt(0)) {
      n = charCode - 'a'.charCodeAt(0) + 10;
    }
    if (n >= radix) {
      throw new SyntaxError('Cannot convert a string to a BigInt');
    }
  }
  const v = bigInt(string, radix);
  return negative ? v.negate() : v;
};

const fromNumber = function (number) {
  if (number !== number || number === -1 / 0 || number === +1 / 0 || Math.floor(number) !== number) {
    throw new RangeError('Cannot convert a non-integer to a BigInt');
  }
  if (number >= -9007199254740991 && number <= +9007199254740991) {
    return bigInt(number);
  }
  const getExponent = function (n) { // n >= 2
    const e = Math.floor(Math.log(n) / Math.log(2)) - 1;
    return n / Math.pow(2, e) >= 2 ? e + 1 : e;
  };
  const e = getExponent(number > 0 ? number : 0 - number) - 53;
  const x = number / Math.pow(2, e);
  return bigInt(x).shiftLeft(e);
};

function BigInt(value) {
  if (this == undefined) {
    if (value instanceof BigInt) {
      return value;
    }
    if (typeof value === 'string') {
      return new BigInt(fromString(value));
    }
    return new BigInt(fromNumber(Number(value)));
  }
  //throw new TypeError('BigInt cannot be used as a constructor');
  this.value = value;
}

BigInt.prototype.valueOf = function () {
  //return this;
  //throw new TypeError('Cannot mix BigInt and other types, use explicit conversions');
  return this.value.toJSNumber();
};
BigInt.prototype.toString = function (radix = 10) {
  radix = Math.floor(radix);
  if (!(radix >= 2 && radix <= 36)) {
    throw new RangeError();
  }
  return this.value.toString(radix);
};

BigInt.asUintN = function (bits, bigint) {
  bits = Number(bits);
  bigint = BigInt(bigint);
  if (bigint.value.compareTo(bigInt(0)) >= 0 && bigint.value.bitLength() < bits) {
    return bigint;
  }
  const mod = bigint.value.and(bigInt(1).shiftLeft(bits).subtract(bigInt(1)));
  return new BigInt(mod);
};
BigInt.asIntN = function (bits, bigint) {
  bits = Number(bits);
  bigint = BigInt(bigint);
  if (bigint.value.abs().bitLength() < bits) {
    return bigint;
  }
  const mod = bigint.value.and(bigInt(1).shiftLeft(bits).subtract(bigInt(1)));
  return new BigInt(mod >= bigInt(1).shiftLeft(bits - 1) ? mod.subtract(bigInt(1).shiftLeft(bits)) : mod);
};

const binary = function (notValue, value, mixed) {
  return function (x, y) {
    if (!(x instanceof BigInt) && !(y instanceof BigInt)) {
      return notValue(x, y);
    }
    if (x instanceof BigInt && y instanceof BigInt) {
      return value(x.value, y.value);
    }
    return mixed(x, y);
  };
};
const binaryValue = function (notValue, valueValue) {
  return binary(notValue, (x, y) => new BigInt(valueValue(x, y)), (x, y) => { throw new TypeError('Cannot mix types, use explicit conversions'); });
};
const nonStrictRelational = function (notValue, value) {
  return binary(notValue, (x, y) => value(x, y), (x, y) => { throw new Error(); });
};
const strictRelational = function (notValue, value) {
  return binary(notValue, (x, y) => value(x, y), (x, y) => false);
};
const unary = function (notValue, value) {
  return function (x) {
    return !(x instanceof BigInt) ? notValue(x) : value(x.value);
  };
};
const unaryValue = function (notValue, valueValue) {
  return unary(notValue, (x) => new BigInt(valueValue(x)));
};

function BigIntRuntime() {
}
BigIntRuntime.BigInt = function (value) {
  return BigInt(value);
};
BigIntRuntime.toNumber = function (bigint) {
  return bigint.value.toJSNumber();
};

BigIntRuntime.add = binaryValue((x, y) => x + y, (x, y) => x.add(y));
BigIntRuntime.subtract = binaryValue((x, y) => x - y, (x, y) => x.subtract(y));
BigIntRuntime.multiply = binaryValue((x, y) => x * y, (x, y) => x.multiply(y));
BigIntRuntime.divide = binaryValue((x, y) => x / y, (x, y) => x.divide(y));
BigIntRuntime.remainder = binaryValue((x, y) => x % y, (x, y) => x.remainder(y));
BigIntRuntime.exponentiate = binaryValue((x, y) => x**y, (x, y) => x.pow(y));

BigIntRuntime.leftShift = binaryValue((x, y) => x << y, (x, y) => x.shiftLeft(y.toJSNumber()));
BigIntRuntime.signedRightShift = binaryValue((x, y) => x >> y, (x, y) => x.shiftRight(y.toJSNumber()));
//const _ushr = binaryValue((x, y) => x >>> y, (x, y) => { throw new TypeError() });

BigIntRuntime.bitwiseAnd = binaryValue((x, y) => x & y, (x, y) => x.and(y));
BigIntRuntime.bitwiseOr = binaryValue((x, y) => x | y, (x, y) => x.or(y));
BigIntRuntime.bitwiseXor = binaryValue((x, y) => x ^ y, (x, y) => x.xor(y));

BigIntRuntime.lessThan = nonStrictRelational((x, y) => x < y, (x, y) => x.compareTo(y) < 0);
BigIntRuntime.greaterThan = nonStrictRelational((x, y) => x > y, (x, y) => x.compareTo(y) > 0);
BigIntRuntime.lessThanOrEqual = nonStrictRelational((x, y) => x <= y, (x, y) => x.compareTo(y) <= 0);
BigIntRuntime.greaterThanOrEqual = nonStrictRelational((x, y) => x >= y, (x, y) => x.compareTo(y) >= 0);
BigIntRuntime.equal = nonStrictRelational((x, y) => x == y, (x, y) => x.compareTo(y) === 0);
//const _ne = nonStrictRelational((x, y) => x != y, (x, y) => x.compareTo(y) !== 0);

//const _seq = strictRelational((x, y) => x === y, (x, y) => x.compareTo(y) === 0);
//const _sne = strictRelational((x, y) => x !== y, (x, y) => x.compareTo(y) !== 0);

//const _typeof = unary((x) => typeof x, (x) => 'bigint');
BigIntRuntime.unaryMinus = unaryValue((x) => -x, (x) => x.negate());
BigIntRuntime.bitwiseNot = unaryValue((x) => ~x, (x) => x.not());

//export default BigIntRuntime;
global.JSBI = BigIntRuntime;

}(this));
