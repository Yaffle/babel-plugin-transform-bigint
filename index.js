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
      case '!==': return 'notEqual';
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
    if (path.node.type === 'StringLiteral') {
      return false;
    }
    if (path.node.type === 'UnaryExpression') {
      return canBeBigInt(path.get('argument'));
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
        if (binding.path.node.type === 'VariableDeclarator') {
          const x = binding.path.get('init');
          if (x.node != null && !canBeBigInt(x)) {
            return false;
          }
        }
        for (const path of binding.referencePaths) {
          if (!canBeBigInt(path.parentPath)) {
            //return false;
          }
        }
      } else {
        if (path.node.name === 'undefined') {
          return false;
        }
      }
      return true;
    }
    if (path.node.type === 'ConditionalExpression') {
      return canBeBigInt(path.get('consequent')) || canBeBigInt(path.get('alternate'));
    }
    if (path.node.type === 'FunctionExpression') {
      return false;
    }
    if (path.node.type === 'NewExpression') {
      return false;
    }
    if (path.node.type === 'NullLiteral') {
      return false;
    }
    if (path.node.type === 'LogicalExpression') {
      return false;//?
    }
    if (path.node.type === 'ObjectProperty') {
      return false;//?
    }
    if (path.node.type === 'CallExpression') {
      if (path.node.callee.type === 'MemberExpression' &&
          path.node.callee.object.type === 'Identifier' &&
          path.node.callee.object.name === 'Math') {
        return false;
      }
      if (path.node.callee.type === 'Identifier' &&
          path.node.callee.name === 'Number') {
        return false;
      }
    }
    if (path.node.type === 'CallExpression') {
      if (path.node.callee.type === 'Identifier') {
        const binding = path.scope.getBinding(path.node.callee.name);
        if (binding != null) {
          if (binding.path.node.type === 'FunctionDeclaration') {
            const statements = binding.path.get('body').get('body');
            for (const statement of statements) {
              if (statement.type === 'ReturnStatement') {
                if (!canBeBigInt(statement.get('argument'))) {
                  //console.log(path.node.callee.name);
                  return false;
                }
              }
            }
          }
        }
      }
    }
    //TODO:
    return true;
  };

  const JSBI = 'JSBI';
  const IMPORT_PATH = './jsbi.mjs';

  return {
    inherits: syntaxBigInt,
    visitor: {
      CallExpression: function (path, state) {
        if (path.node.callee.name === 'Number') {
          if (canBeBigInt(path.get('arguments')[0])) {
            path.replaceWith(types.callExpression(types.memberExpression(types.identifier(JSBI), types.identifier('toNumber')), path.node.arguments));
          }
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
                  types.assignmentExpression('=', y, argument.computed ? argument.property : types.StringLiteral(argument.property.name)),
                  types.assignmentExpression('=', types.memberExpression(x, y, true), types.callExpression(types.memberExpression(types.identifier(JSBI), types.identifier(functionName)), [types.memberExpression(x, y, true), one]))
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
                  types.assignmentExpression('=', y, argument.computed ? argument.property : types.StringLiteral(argument.property.name)),
                  types.assignmentExpression('=', z, types.memberExpression(x, y, true)),
                  types.assignmentExpression('=', types.memberExpression(x, y, true), types.callExpression(types.memberExpression(types.identifier(JSBI), types.identifier(functionName)), [z, one])),
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
                  types.assignmentExpression('=', y, left.computed ? left.property : types.StringLiteral(left.property.name)),
                  types.assignmentExpression('=', types.memberExpression(x, y, true), types.callExpression(types.memberExpression(types.identifier(JSBI), types.identifier(functionName)), [types.memberExpression(x, y, true), right]))
                ]));
              } else {
                // left += right -> (left = left + right)
                path.replaceWith(types.assignmentExpression('=', left, types.callExpression(types.memberExpression(types.identifier(JSBI), types.identifier(functionName)), [left, right])));
              }
            }
          }
        }
      },
      Program: function (path) {
        // https://stackoverflow.com/a/35994497
        const identifier = types.identifier(JSBI);
        const importDefaultSpecifier = types.importDefaultSpecifier(identifier);
        const importDeclaration = types.importDeclaration([importDefaultSpecifier], types.stringLiteral(IMPORT_PATH));
        path.unshiftContainer('body', importDeclaration);
      }
    }
  };
};
