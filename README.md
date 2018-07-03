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
  if (S < 1n) {
    return 0n;
  }
  let e = ilog2(S) / 4n + 1n;
  let x = (sqrt(S / 2n**(e * 2n)) + 1n) * 2n**e;
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
npx babel --plugins=babel-plugin-transform-bigint test.js
```

3. import `runtime.js`.
