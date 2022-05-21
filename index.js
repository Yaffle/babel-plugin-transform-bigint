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
    visited.set(path, maybeJSBI);
    const result = canBeBigIntInternal(path);
    //console.debug('canBeBigInt: ' + path.toString() + ', result: ' + result);
    if (result === maybeJSBI) {
      visited.delete(path);
    } else {
      visited.set(path, result);
    }
    return result;
  };
  const and = function (a, b) {
    if (a === maybeJSBI) {
      return b;
    }
    if (b === maybeJSBI) {
      return a;
    }
    if (a === JSBI && b === JSBI) {
      return JSBI;
    }
    return false;
  };
  const canBeBigIntInternal = function (path) {
    if (path.node.type === 'BigIntLiteral') {
      return JSBI;
    }
    if (path.node.type === 'NumericLiteral') {
      return false;
    }
    if (path.node.type === 'StringLiteral') {
      return false;
    }
    if (path.node.type === 'UnaryExpression') {
      if (path.node.operator === '+') { // +0n is not allowed
        return false;
      }
      return canBeBigInt(path.get('argument'));
    }
    if (path.node.type === 'BinaryExpression') {
      return and(canBeBigInt(path.get('left')), canBeBigInt(path.get('right')));
    }
    if (path.node.type === 'AssignmentExpression') {
      return and(canBeBigInt(path.get('left')), canBeBigInt(path.get('right')));
    }
    if (path.node.type === 'Identifier') {
      const binding = path.scope.getBinding(path.node.name);
      if (binding != null) {
        if (binding.path.node.type === 'VariableDeclarator') {
          const x = binding.path.get('init');
          if (x.node != null && canBeBigInt(x) === false && binding.constant) {
            return false;
          }
          if (x.node != null && canBeBigInt(x) === JSBI && binding.constant) {
            return JSBI;
          }
        }
        for (const path of binding.referencePaths) {
          //The next code causes infinite recursion, seems:
          //if (path.parentPath.node.type === 'BinaryExpression' && getFunctionName(path.parentPath.node.operator) != null && canBeBigInt(path.parentPath) === false) {
          //  return false;
          //}
        }
      } else {
        if (path.node.name === 'undefined') {
          return false;
        }
      }
      if (binding != null && binding.constant) {
        const ifStatement = path.findParent(path => path.isIfStatement());
        const variableName = path.node.name;
        if (ifStatement != null) {
          const tmp = ifStatement.get('test');
          if (tmp.node.operator === '&&') {
            const checkTypeOf = function (node) {
              if (node.type === 'BinaryExpression' && node.operator === '===') {
                if (node.left.type === 'UnaryExpression' && node.left.operator === 'typeof') {
                  if (node.left.argument.type === 'Identifier' && node.left.argument.name === variableName) {
                    if (node.right.type === 'StringLiteral' && node.right.value === 'number') {
                      return true;
                    }
                  }
                }
              }
              return false;
            };
            if (checkTypeOf(tmp.node.left)) {
              return false;
            }
            if (checkTypeOf(tmp.node.right)) {
              return false;
            }
          }
        }
      }
      return maybeJSBI;
    }
    if (path.node.type === 'ConditionalExpression') {
      return canBeBigInt(path.get('consequent')) !== false || canBeBigInt(path.get('alternate')) !== false ? maybeJSBI : false;
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
      if (path.node.callee.type === 'Identifier' &&
          path.node.callee.name === 'BigInt') {
        return JSBI;
      }
      if (path.node.callee.type === 'MemberExpression' &&
          path.node.callee.object.type === 'Identifier' &&
          path.node.callee.object.name === 'JSBI') {
        return JSBI;
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
                if (canBeBigInt(statement.get('argument')) === false) {
                  return false;
                }
              }
            }
          }
        }
      }
    }
    if (path.node.type === 'UpdateExpression') {
      return canBeBigInt(path.get('argument'));
    }
    //TODO:
    return maybeJSBI;
  };

  const JSBI = 'JSBI';
  const maybeJSBI = 'maybeJSBI';
  //const maybeJSBI = JSBI;
  const IMPORT_PATH = './jsbi.mjs';

  const maybeJSBICode = `

var maybeJSBI = {
  toNumber: function toNumber(a) {
    return typeof a === "object" ? JSBI.toNumber(a) : Number(a);
  },
  add: function add(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.add(a, b) : a + b;
  },
  subtract: function subtract(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.subtract(a, b) : a - b;
  },
  multiply: function multiply(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.multiply(a, b) : a * b;
  },
  divide: function divide(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.divide(a, b) : a / b;
  },
  remainder: function remainder(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.remainder(a, b) : a % b;
  },
  exponentiate: function exponentiate(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.exponentiate(a, b) : (typeof a === "bigint" && typeof b === "bigint" ? new Function("a**b", "a", "b")(a, b) : Math.pow(a, b));
  },
  leftShift: function leftShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.leftShift(a, b) : a << b;
  },
  signedRightShift: function signedRightShift(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.signedRightShift(a, b) : a >> b;
  },
  bitwiseAnd: function bitwiseAnd(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseAnd(a, b) : a & b;
  },
  bitwiseOr: function bitwiseOr(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseOr(a, b) : a | b;
  },
  bitwiseXor: function bitwiseXor(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.bitwiseXor(a, b) : a ^ b;
  },
  lessThan: function lessThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThan(a, b) : a < b;
  },
  greaterThan: function greaterThan(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThan(a, b) : a > b;
  },
  lessThanOrEqual: function lessThanOrEqual(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.lessThanOrEqual(a, b) : a <= b;
  },
  greaterThanOrEqual: function greaterThanOrEqual(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.greaterThanOrEqual(a, b) : a >= b;
  },
  equal: function equal(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.equal(a, b) : a === b;
  },
  notEqual: function notEqual(a, b) {
    return typeof a === "object" && typeof b === "object" ? JSBI.notEqual(a, b) : a !== b;
  },
  unaryMinus: function unaryMinus(a) {
    return typeof a === "object" ? JSBI.unaryMinus(a) : -a;
  },
  bitwiseNot: function bitwiseNot(a) {
    return typeof a === "object" ? JSBI.bitwiseNot(a) : ~a;
  }
};
  `;
  //const maybeJSBICode = '';

  return {
    inherits: syntaxBigInt,
    visitor: {
      CallExpression: function (path, state) {
        if (path.node.callee.name === 'Number') {
          const JSBI = canBeBigInt(path.get('arguments')[0]);
          if (JSBI !== false) {
            path.replaceWith(types.callExpression(types.memberExpression(types.identifier(JSBI), types.identifier('toNumber')), path.node.arguments));
          }
        }
        if (path.node.callee.name === 'BigInt') {
          path.replaceWith(types.callExpression(types.memberExpression(types.identifier(JSBI), types.identifier('BigInt')), path.node.arguments));
        }
        if (path.node.callee.type === 'MemberExpression' &&
            path.node.callee.object.type === 'Identifier' &&
            path.node.callee.object.name === 'BigInt' &&
            path.node.callee.property.name === 'asUintN') {
          path.replaceWith(types.callExpression(types.memberExpression(types.identifier(JSBI), types.identifier('asUintN')), path.node.arguments));
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
        const JSBI = canBeBigInt(path);
        if (JSBI !== false) {
          const operator = path.node.operator;
          const functionName = getFunctionName(operator) || getRelationalFunctionName(operator);
          if (functionName != null) {
            // x * y -> JSBI.multiply(x, y)
            path.replaceWith(types.callExpression(types.memberExpression(types.identifier(JSBI), types.identifier(functionName)), [path.node.left, path.node.right]));
          }
        }
      },
      UnaryExpression: function (path, state) {
        const JSBI = canBeBigInt(path);
        if (JSBI !== false) {
          const functionName = getUnaryFunctionName(path.node.operator);
          if (functionName !== null) {
            // -x -> JSBI.unaryMinus(x)
            path.replaceWith(types.callExpression(types.memberExpression(types.identifier(JSBI), types.identifier(functionName)), [path.node.argument]));
          }
        }
      },  
      UpdateExpression: function (path, state) {
        throw new RangeError('UpdateExpressions are not supported because of the complexity: ' + path);
        // The implementation below is buggy, as it converts ++x to x += 1n even for number x
        /*
        const JSBI = canBeBigInt(path);
        if (JSBI !== false) {
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
        }*/
        
      },
      AssignmentExpression: function (path, state) {
        const JSBI = canBeBigInt(path);
        if (JSBI !== false) {
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
    },
    pre: function () {
      visited.clear();
    },
    post: function (state) {
      //console.log(state);
      const usesMaybeJSBI = state.path.toString().indexOf('maybeJSBI') !== -1;
      if (usesMaybeJSBI) {
        state.ast.program.body.unshift(babel.parse(maybeJSBICode).program.body[0]);
      }
    }
  };
};
