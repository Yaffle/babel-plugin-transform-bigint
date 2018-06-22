'use strict';

// import bigInt from 'big-integer';

function BigInt(value) {
  if (this == undefined) {
    if (value instanceof BigInt) {
      value = value;
    } else if (typeof value === 'string') {
      value = bigInt(value);
    } else {
      value = bigInt(Number(value));
    }
    return new BigInt(value);
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
  return this.value.toString(radix);
};

BigInt.asUintN = function (bits, bigint) {
  throw new Error();
};
BigInt.asIntN = function (bits, bigint) {
  throw new Error();
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

const _add = binaryValue((x, y) => x + y, (x, y) => x.add(y));
const _sub = binaryValue((x, y) => x - y, (x, y) => x.subtract(y));
const _mul = binaryValue((x, y) => x * y, (x, y) => x.multiply(y));
const _div = binaryValue((x, y) => x / y, (x, y) => x.divide(y));
const _rem = binaryValue((x, y) => x % y, (x, y) => x.remainder(y));
const _pow = binaryValue((x, y) => x**y, (x, y) => x.pow(y));

const _shl = binaryValue((x, y) => x << y, (x, y) => x.shiftLeft(y.toJSNumber()));
const _shr = binaryValue((x, y) => x >> y, (x, y) => x.shiftRight(y.toJSNumber()));
const _ushr = binaryValue((x, y) => x >>> y, (x, y) => { throw new TypeError() });

const _and = binaryValue((x, y) => x & y, (x, y) => x.and(y));
const _or = binaryValue((x, y) => x | y, (x, y) => x.or(y));
const _xor = binaryValue((x, y) => x ^ y, (x, y) => x.xor(y));

const _lt = nonStrictRelational((x, y) => x < y, (x, y) => x.compareTo(y) < 0);
const _gt = nonStrictRelational((x, y) => x > y, (x, y) => x.compareTo(y) > 0);
const _le = nonStrictRelational((x, y) => x <= y, (x, y) => x.compareTo(y) <= 0);
const _ge = nonStrictRelational((x, y) => x >= y, (x, y) => x.compareTo(y) >= 0);
const _eq = nonStrictRelational((x, y) => x == y, (x, y) => x.compareTo(y) === 0);
const _ne = nonStrictRelational((x, y) => x != y, (x, y) => x.compareTo(y) !== 0);

const _seq = strictRelational((x, y) => x === y, (x, y) => x.compareTo(y) === 0);
const _sne = strictRelational((x, y) => x !== y, (x, y) => x.compareTo(y) !== 0);

const _typeof = unary((x) => typeof x, (x) => 'bigint');
const _neg = unaryValue((x) => -x, (x) => x.negate());
const _not = unaryValue((x) => ~x, (x) => x.not());

//export default { BigInt, _add, _sub, _mul, _div, _rem, _pow, _shl, _shr, _ushr, _and, _or, _xor, _lt, _gt, _le, _ge, _eq, _ne, _seq, _sne, _typeof, _neg, _not };
