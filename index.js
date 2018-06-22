// see https://github.com/babel/babel/pull/6015

const syntaxBigInt = require('@babel/plugin-syntax-bigint').default;

module.exports = function (babel) {
  const types = babel.types;
  const getFunctionName = function (operator) {
    switch (operator) {
      // Arithmetic operators
      case '+': return 'add';
      case '-': return 'sub';
      case '*': return 'mul';
      case '/': return 'div';
      case '%': return 'rem';
      case '**': return 'pow';
      // Bitwise shift operators
      case '<<': return 'shl';
      case '>>': return 'shr';
      case '>>>': return 'ushr';
      // Binary bitwise operators
      case '&': return 'and';
      case '|': return 'or';
      case '^': return 'xor';
    }
    return null;
  };
  const getRelationalFunctionName = function (operator) {
      // Relational operators
    switch (operator) {
      case '<': return 'lt';
      case '>': return 'gt';
      case '<=': return 'le';
      case '>=': return 'ge';
      case '==': return 'eq';
      case '!=': return 'ne';
      case '===': return 'seq';
      case '!==': return 'sne';
    }
    return null;
  };
  const getUnaryFunctionName = function (operator) {
    switch (operator) {
      case 'typeof': return 'typeof';
      case '-': return 'neg';
      case '~': return 'not';
      case 'in': return 'in';
    }
    return null;
  };
  const f = function (functionName) {
    return types.identifier('_' + functionName);
  };
  return {
    inherits: syntaxBigInt,

    visitor: {
      BigIntLiteral: function (path, state) {
        const value = path.node.value;
        const number = Number(value); //!!!
        path.replaceWith(types.callExpression(types.identifier('BigInt'), [number >= Number.MIN_SAFE_INTEGER && number <= Number.MAX_SAFE_INTEGER ? types.numericLiteral(number) : types.StringLiteral(value)]));
      },
      BinaryExpression: function (path, state) {
        const operator = path.node.operator;
        const functionName = getFunctionName(operator) || getRelationalFunctionName(operator);
        if (functionName != null) {
          path.replaceWith(types.callExpression(f(functionName), [path.node.left, path.node.right]));
        }
      },
      UnaryExpression: function (path, state) {
        const functionName = getUnaryFunctionName(path.node.operator);
        if (functionName !== null) {
          path.replaceWith(types.callExpression(f(functionName), [path.node.argument]));
        }
      },
      AssignmentExpression: function (path, state) {
        const operator = path.node.operator;
        if (operator.endsWith('=')) {
          const functionName = getFunctionName(operator.slice(0, -'='.length));
          if (functionName != null) {
            path.replaceWith(types.assignmentExpression('=', path.node.left, types.callExpression(f(functionName), [path.node.left, path.node.right])));
          }
        }
      }
    }
  };
};
