# babel-plugin-transform-bigint

¡ It is buggy !

Usage:

1. Create a file test.js:
```
// Takes a BigInt as an argument and returns a BigInt
function nthPrime(nth) {
  function isPrime(p) {
    for (let i = 2n; i < p; i++) {
      if (p % i === 0n) return false;
    }
    return true;
  }
  for (let i = 2n; ; i++) {
    if (isPrime(i)) {
      if (--nth === 0n) return i;
    }
  }
}
```

2. Use babel:
```
npm install --save https://github.com/Yaffle/babel-plugin-transform-bigint
npm install --save-dev @babel/core @babel/cli
npx babel --plugins=babel-plugin-transform-bigint test.js
```

3. import `runtime.js`.
