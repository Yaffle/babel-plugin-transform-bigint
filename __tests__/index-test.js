// to run this test file use `npx jest` in the parent folder or `npm run test`
// to transform some-file.js use a command: `npx babel --plugins=module:./index.js some-file.js` from the parent folder

// src/__tests__/index-test.js
const babel = require('@babel/core');
const plugin = require('../index.js');

it('it works with AssignmentExpressions', function () {
  const example = `
    const o = {};
    o.x = {};
    o.x.y = 1n;
    o.x.yz = 1n;
    const y = 'y';
    const z = 'z';
    const b = 1n;

    o.x.y += b;
    o.x['y'] += b;
    o.x[y] += b;
    o.x[y + z] += b;
  `;
  const {code} = babel.transform(example, {plugins: [plugin]});
  expect(code).toMatchSnapshot();
});

/*
it('it works with UpdateExpression', function () {
  const example = `
    const o = {};
    o.x = {};
    o.x.y = 1n;
    o.x.yz = 1n;
    const y = 'y';
    const z = 'z';
    const b = 1n;

    ++o.x.y;
    ++o.x['y'];
    ++o.x[y];
    ++o.x[y + z];

    o.x.y++;
    o.x['y']++;
    o.x[y]++;
    o.x[y + z]++;
  `;
  const {code} = babel.transform(example, {plugins: [plugin]});
  expect(code).toMatchSnapshot();
});
*/

it('works when type of variable is changed', function () {
  const example = `
    let g1 = 1;
    g1 = 1n;
    if (g1 === 1n) {
      console.log(g1);
    }
  `;
  const {code} = babel.transform(example, {plugins: [plugin]});
  expect(code).toMatchSnapshot();
});

it('non-strict comparisions are not changed', function () {
  const example = `
    const g = 1n;
    if (g == 1) {
      console.log(g);
    }
    if (g != 1) {
      console.log(g);
    }
    if (g < 1) {
      console.log(g);
    }
    if (g > 1) {
      console.log(g);
    }
    if (g <= 1) {
      console.log(g);
    }
    if (g >= 1) {
      console.log(g);
    }
  `;
  const {code} = babel.transform(example, {plugins: [plugin]});
  expect(code).toMatchSnapshot();
});

it('BigInt.asUintN(n, a) is replaced', function () {
  const example = `
    const g = 1n;
    BigInt.asUintN(10, g)
  `;
  const {code} = babel.transform(example, {plugins: [plugin]});
  expect(code).toMatchSnapshot();
});

it('works', function () {
  const example = `
    function f() {
      const x = 1n;
      return x + x;
    }
  `;
  const {code} = babel.transform(example, {plugins: [plugin]});
  expect(code).toMatchSnapshot();
});

it('BigInt.asUintN(64, a), BigInt.asIntN(64, a)', function () {
  const example = `
    const a = 1n;
    console.log(BigInt.asUintN(64, a));
    console.log(BigInt.asIntN(64, a));
  `;
  const {code} = babel.transform(example, {plugins: [plugin]});
  expect(code).toMatchSnapshot();
});

it('typeof type guard (see https://www.typescriptlang.org/docs/handbook/2/narrowing.html#typeof-type-guards)', function () {
  const example = `
    function f1(a) {
      if (typeof a !== 'bigint') {
        throw new RangeError();
      }
      return a * a;
    }
    function f2(a, b) {
      if (typeof a !== 'bigint' || typeof b !== 'bigint') {
        throw new RangeError();
      }
      return a * b;
    }
    function f3(a) {
      if (typeof a !== 'number') {
        throw new RangeError();
      }
      return a * a;
    }
    function f4(a, b) {
      if (typeof a !== 'number' || typeof b !== 'number') {
        throw new RangeError();
      }
      return a * b;
    }
  `;
  const {code} = babel.transform(example, {plugins: [plugin]});
  expect(code).toMatchSnapshot();
});

it('it does not mutable variables', function () {
  const example = `
    function f() {
      for (let i = 0; i < 10; i += 1) {
        console.log(i * i);
      }
    }
  `;
  const {code} = babel.transform(example, {plugins: [plugin]});
  expect(code).toMatchSnapshot();
});
