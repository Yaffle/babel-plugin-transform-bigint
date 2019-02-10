// see https://github.com/babel/babel/pull/6015

const syntaxBigInt = require('@babel/plugin-syntax-bigint').default;

module.exports = function (babel) {
  const types = babel.types;
  const getFunctionName = function (operator) {
    switch (operator) {
      // Arithmetic operators
      case '+': return 'add';
      case '-': return 'subtract';
      case '*': return 'multiply';
      case '/': return 'divide';
      case '%': return 'remainder';
      case '**': return 'exponentiate';
      // Bitwise shift operators
      case '<<': return 'leftShift';
      case '>>': return 'signedRightShift';
      // Binary bitwise operators
      case '&': return 'bitwiseAnd';
      case '|': return 'bitwiseOr';
      case '^': return 'bitwiseXor';
    }
    return null;
  };
  const getRelationalFunctionName = function (operator) {
    // Relational operators
    switch (operator) {
      case '<': return 'lessThan';
      case '>': return 'greaterThan';
      case '<=': return 'lessThanOrEqual';
      case '>=': return 'greaterThanOrEqual';
      case '===': return 'equal';
    }
    return null;
  };
  const getUnaryFunctionName = function (operator) {
    switch (operator) {
      case '-': return 'unaryMinus';
      case '~': return 'bitwiseNot';
    }
    return null;
  };
  const getUpdateFunctionName = function (operator) {
    switch (operator) {
      case '++': return 'add';
      case '--': return 'subtract';
    }
    return null;
  };

  const visited = new Map();
  const canBeBigInt = function (path) {
    if (visited.get(path) != null) {
      return visited.get(path);
    }
    visited.set(path, true);
    const result = canBeBigIntInternal(path);
    visited.set(path, result);
    return result;
  };
  const canBeBigIntInternal = function (path) {
    if (path.node.type === 'BigIntLiteral') {
      return true;
    }
    if (path.node.type === 'NumericLiteral') {
      return false;
    }
    if (path.node.type === 'BinaryExpression') {
      return canBeBigInt(path.get('left')) && canBeBigInt(path.get('right'));
    }
    if (path.node.type === 'AssignmentExpression') {
      return canBeBigInt(path.get('left')) && canBeBigInt(path.get('right'));
    }
    if (path.node.type === 'Identifier') {
      const binding = path.scope.getBinding(path.node.name);
      if (binding != null) {
        for (const path of binding.referencePaths) {
          if (!canBeBigInt(path.parentPath)) {
            return false;
          }
        }
      }
      return true;
    }
    //TODO:
    return true;
  };

  const JSBI = 'JSBI';

  return {
    inherits: syntaxBigInt,
    visitor: {
      CallExpression: function (path, state) {
        if (path.node.callee.name === 'Number') {
          path.replaceWith(types.callExpression(types.memberExpression(types.identifier(JSBI), types.identifier('toNumber')), path.node.arguments));
        }
        if (path.node.callee.name === 'BigInt') {
          path.replaceWith(types.callExpression(types.memberExpression(types.identifier(JSBI), types.identifier('BigInt')), path.node.arguments));
        }
      },
      BigIntLiteral: function (path, state) {
        const value = path.node.value;
        const number = Number(value); //TODO:
        if (number >= Number.MIN_SAFE_INTEGER && number <= Number.MAX_SAFE_INTEGER) {
          // 1n -> JSBI.BigInt(1)
          path.replaceWith(types.callExpression(types.memberExpression(types.identifier(JSBI), types.identifier('BigInt')), [types.numericLiteral(number)]));
        } else {
          // 9007199254740993n -> JSBI.BigInt('9007199254740993')
          path.replaceWith(types.callExpression(types.memberExpression(types.identifier(JSBI), types.identifier('BigInt')), [types.StringLiteral(value)]));
        }
      },
      BinaryExpression: function (path, state) {
        if (canBeBigInt(path)) {
          const operator = path.node.operator;
          const functionName = getFunctionName(operator) || getRelationalFunctionName(operator);
          if (functionName != null) {
            // x * y -> JSBI.multiply(x, y)
            path.replaceWith(types.callExpression(types.memberExpression(types.identifier(JSBI), types.identifier(functionName)), [path.node.left, path.node.right]));
          }
        }
      },
      UnaryExpression: function (path, state) {
        if (canBeBigInt(path)) {
          const functionName = getUnaryFunctionName(path.node.operator);
          if (functionName !== null) {
            // -x -> JSBI.unaryMinus(x)
            path.replaceWith(types.callExpression(types.memberExpression(types.identifier(JSBI), types.identifier(functionName)), [path.node.argument]));
          }
        }
      },  
      UpdateExpression: function (path, state) {
        if (canBeBigInt(path)) {
          const operator = path.node.operator;
          const prefix = path.node.prefix;
          const functionName = getUpdateFunctionName(operator);
          if (functionName != null) {
            const one = types.callExpression(types.memberExpression(types.identifier(JSBI), types.identifier('BigInt')), [types.numericLiteral(1)]);
            const argument = path.node.argument;
            if (types.isMemberExpression(argument)) {
              if (prefix) {
                const x = path.scope.generateUidIdentifier('x');
                path.scope.push({id: x});
                const y = path.scope.generateUidIdentifier('y');
                path.scope.push({id: y});
                // ++object[property] -> (x = object, y = property, x[y] = x[y] + 1)
                path.replaceWith(types.sequenceExpression([
                  types.assignmentExpression('=', x, argument.object),
                  types.assignmentExpression('=', y, argument.property),
                  types.assignmentExpression('=', types.memberExpression(x, y), types.callExpression(types.memberExpression(types.identifier(JSBI), types.identifier(functionName)), [types.memberExpression(x, y), one]))
                ]));
              } else {
                const x = path.scope.generateUidIdentifier('x');
                path.scope.push({id: x});
                const y = path.scope.generateUidIdentifier('y');
                path.scope.push({id: y});
                const z = path.scope.generateUidIdentifier('z');
                path.scope.push({id: z});
                // object[property]++ -> (x = object, y = property, z = x[y], x[y] = x[y] + 1, z)
                path.replaceWith(types.sequenceExpression([
                  types.assignmentExpression('=', x, argument.object),
                  types.assignmentExpression('=', y, argument.property),
                  types.assignmentExpression('=', z, types.memberExpression(x, y)),
                  types.assignmentExpression('=', types.memberExpression(x, y), types.callExpression(types.memberExpression(types.identifier(JSBI), types.identifier(functionName)), [z, one])),
                  z
                ]));
              }
            } else {
              if (prefix) {
                // ++argument -> (argument = argument + 1)
                path.replaceWith(types.assignmentExpression('=', argument, types.callExpression(types.memberExpression(types.identifier(JSBI), types.identifier(functionName)), [argument, one])));
              } else {
                const x = path.scope.generateUidIdentifier('x');
                path.scope.push({id: x});
                // argument++ -> (x = argument, argument = argument + 1, x)
                path.replaceWith(types.sequenceExpression([
                  types.assignmentExpression('=', x, argument),
                  types.assignmentExpression('=', argument, types.callExpression(types.memberExpression(types.identifier(JSBI), types.identifier(functionName)), [argument, one])),
                  x
                ]));
              }
            }
          }
        }
      },
      AssignmentExpression: function (path, state) {
        if (canBeBigInt(path)) {
          const operator = path.node.operator;
          if (operator.endsWith('=')) {
            const functionName = getFunctionName(operator.slice(0, -'='.length));
            if (functionName != null) {
              const left = path.node.left;
              const right = path.node.right;
              if (types.isMemberExpression(left)) {
                const x = path.scope.generateUidIdentifier('x');
                path.scope.push({id: x});
                const y = path.scope.generateUidIdentifier('y');
                path.scope.push({id: y});
                // object[property] += right -> (x = object, y = property, x[y] = x[y] + right)
                path.replaceWith(types.sequenceExpression([
                  types.assignmentExpression('=', x, left.object),
                  types.assignmentExpression('=', y, left.property),
                  types.assignmentExpression('=', types.memberExpression(x, y), types.callExpression(types.memberExpression(types.identifier(JSBI), types.identifier(functionName)), [types.memberExpression(x, y), right]))
                ]));
              } else {
                // left += right -> (left = left + right)
                path.replaceWith(types.assignmentExpression('=', left, types.callExpression(types.memberExpression(types.identifier(JSBI), types.identifier(functionName)), [left, right])));
              }
            }
          }
        }
      }
    }
  };
};
