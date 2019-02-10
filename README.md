# babel-plugin-transform-bigint

*Update:* Now it can convert a code using BigInt into a code using JSBI (https://github.com/GoogleChromeLabs/jsbi).

An example from https://github.com/GoogleChromeLabs/babel-plugin-transform-jsbi-to-bigint:
==========================================================================================

Input using native `BigInt`s:

```javascript
const a = BigInt(Number.MAX_SAFE_INTEGER);
const b = 2n;

a + b;
a - b;
a * b;
a / b;
a % b;
a ** b;
a << b;
a >> b;
a & b;
a | b;
a ^ b;

-a;
~a;

a === b;
a < b;
a <= b;
a > b;
a >= b;

a.toString();
Number(a);
```

Compiled output using `JSBI`:

```
const a = JSBI.BigInt(Number.MAX_SAFE_INTEGER);
const b = JSBI.BigInt(2);
JSBI.add(a, b);
JSBI.subtract(a, b);
JSBI.multiply(a, b);
JSBI.divide(a, b);
JSBI.remainder(a, b);
JSBI.exponentiate(a, b);
JSBI.leftShift(a, b);
JSBI.signedRightShift(a, b);
JSBI.bitwiseAnd(a, b);
JSBI.bitwiseOr(a, b);
JSBI.bitwiseXor(a, b);
JSBI.unaryMinus(a);
JSBI.bitwiseNot(a);
JSBI.equal(a, b);
JSBI.lessThan(a, b);
JSBI.lessThanOrEqual(a, b);
JSBI.greaterThan(a, b);
JSBI.greaterThanOrEqual(a, b);
a.toString();
JSBI.toNumber(a);
```

¡ It is buggy !

Usage:

1. Create a file test.js:
```javascript
// floor(log2(n)), n >= 1
function ilog2(n) {
  let i = 0n;
  while (n >= 2n**(2n**i)) {
    i += 1n;
  }
  let e = 0n;
  let t = 1n;
  while (i >= 0n) {
    let b = 2n**i;
    if (n >= t * 2n**b) {
      t *= 2n**b;
      e += b;
    }
    i -= 1n;
  }
  return e;
}

// floor(sqrt(S)), S >= 0, https://en.wikipedia.org/wiki/Methods_of_computing_square_roots#Babylonian_method
function sqrt(S) {
  let e = ilog2(S);
  if (e < 2n) {
    return 1n;
  }
  let f = e / 4n + 1n;
  let x = (sqrt(S / 2n**(f * 2n)) + 1n) * 2n**f;
  let xprev = x + 1n;
  while (xprev > x) {
    xprev = x;
    x = (x + S / x) / 2n;
  }
  return xprev;
}

function squareRoot(value, decimalDigits) {
  return (sqrt(BigInt(value) * 10n**(BigInt(decimalDigits) * 2n + 2n)) + 5n).toString();
}


```

2. Use babel:
```sh
npm install --save https://github.com/Yaffle/babel-plugin-transform-bigint
npm install --save-dev @babel/core @babel/cli
npx babel --plugins=babel-plugin-transform-bigint test.js > test-transformed.js
```

3. create a file `test.html`.
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <script src="node_modules/big-integer/BigInteger.js"></script>
  <script src="node_modules/babel-plugin-transform-bigint/runtime.js"></script>
  <script src="test-transformed.js"></script>
  <script>
    document.addEventListener("DOMContentLoaded", function (event) {
      const form = document.querySelector("form");
      const update = function () {
        const value = form.value.value;
        const digits = Number(form.digits.value);
        const s = squareRoot(value, digits);
        form.output.value = '√' + value +  ' ≈ ' + s.slice(0, 0 - digits - 1) + '.' + s.slice(0 - digits - 1, -1) + '…';
      };
      form.oninput = function () {
        update();
      };
      update();
    }, false);
  </script>
  <style>
    output {
      overflow-wrap: break-word;
    }
  </style>
</head>
<body>
  <form>
    <div>
      <label for="value">Value:</label>
      <input id="value" name="value" type="number" min="2" step="1" value="2" />
    </div>
    <div>
      <label for="digits">Number of decimal digits:</label>
      <input id="digits" name="digits" type="number" min="1" step="1" value="100" />
    </div>
    <div>
      <output id="output" name="output" for="value digits" tabindex="0"></output>
    </div>
  </form>
</body>
</html>
```

4. Open `test.html` in a web browser.
