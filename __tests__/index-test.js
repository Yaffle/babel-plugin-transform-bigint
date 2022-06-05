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
    function f5(a) {
      if (typeof a !== 'bigint') {
        void 0;
      }
      return a * a;
    }
    export {f1, f2, f3, f4, f5};
  `;
  const {code} = babel.transform(example, {plugins: [plugin]});
  expect(code).toMatchSnapshot();
});

it('it does not replace expression for a mutable variable', function () {
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

it('it does not replace expression for a mutable variable2', function () {
  const example = `
    function f() {
      let i = 1;
      i = -i;
      return i * i;
    }
  `;
  const {code} = babel.transform(example, {plugins: [plugin]});
  expect(code).toMatchSnapshot();
});


it('default values', function () {
  const example = `
    function f(y = unknown(), z = y * y) {
      if (typeof y !== 'bigint') {
        throw new RangeError();
      }
      return y * y;
    }
  `;
  const {code} = babel.transform(example, {plugins: [plugin]});
  expect(code).toMatchSnapshot();
});


it('arguments in non-strict mode', function () {
  const example = `
    function func(a) {
      if (typeof a !== 'number') {
        throw new RangeError();
      }
      arguments[0] = 99n;
      console.log(a * a);
    }
    func(10); // prints 9801
  `;
  try {
    const {code} = babel.transform(example, {plugins: [plugin]});
    expect(code).toMatchSnapshot();
  } catch (error) {
    console.assert(error instanceof RangeError);
  }
});

it('eval in non-strict mode', function () {
  const example = `
    function func(a) {
      if (typeof a !== 'number') {
        throw new RangeError();
      }
      eval('a = 99n')
      console.log(a * a);
    }
    func(10); // prints 9801
  `;
  try {
    const {code} = babel.transform(example, {plugins: [plugin]});
    expect(code).toMatchSnapshot();
  } catch (error) {
    console.assert(error instanceof RangeError);
  }
});


it('sometimes type of conditional expression can be determined as JSBI', function () {
  const example = `
    function f(a) {
      const b = a % 3n === 0n ? 1n : 3n;
      return b * b;
    }
    export default f;
  `;
  const {code} = babel.transform(example, {plugins: [plugin]});
  expect(code).toMatchSnapshot();
});

it('internal number function', function () {
  const example = `
    function f(a) {
      return a * a;
    }
    console.log(f(3));
  `;
  const {code} = babel.transform(example, {plugins: [plugin]});
  expect(code).toMatchSnapshot();
});

it('internal bigint function', function () {
  const example = `
    function f(a) {
      return a * a;
    }
    console.log(f(3n));
  `;
  const {code} = babel.transform(example, {plugins: [plugin]});
  expect(code).toMatchSnapshot();
});

