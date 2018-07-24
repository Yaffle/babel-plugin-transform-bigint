# babel-plugin-transform-bigint

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

console.log('√2 ≈ 1.' + sqrt(2n * 10n**(76n * 2n)).toString().slice(1) + '…');
// -> √2 ≈ 1.4142135623730950488016887242096980785696718753769480731766797379907324784621…

```

2. Use babel:
```
npm install --save https://github.com/Yaffle/babel-plugin-transform-bigint
npm install --save-dev @babel/core @babel/cli
npx babel --plugins=babel-plugin-transform-bigint test.js > test-transformed.js
```

3. create a file `test.html`.
```
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <script src="node_modules/big-integer/BigInteger.js"></script>
  <script src="node_modules/babel-plugin-transform-bigint/runtime.js"></script>
  <script src="test-transformed.js"></script>
</head>
<body>
  See the console output.
</body>
</html>
```

4. Open `test.html` in a web browser, see the console output.
