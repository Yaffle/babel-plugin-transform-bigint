// to run the test use a command: `npx babel --plugins=./index.js tests.js`

o.x.y += b;
o.x['y'] += b;
o.x[y] += b;
o.x[y + z] += b;

++o.x.y;
++o.x['y'];
++o.x[y];
++o.x[y + z];

o.x.y++;
o.x['y']++;
o.x[y]++;
o.x[y + z]++;

/*

var _x, _y, _x2, _y2, _x3, _y3, _x4, _y4, _x5, _y5, _x6, _y6, _x7, _y7, _x8, _y8, _x9, _y9, _z, _x10, _y10, _z2, _x11, _y11, _z3, _x12, _y12, _z4;

_x = o.x, _y = "y", _x[_y] = JSBI.add(_x[_y], b);
_x2 = o.x, _y2 = 'y', _x2[_y2] = JSBI.add(_x2[_y2], b);
_x3 = o.x, _y3 = y, _x3[_y3] = JSBI.add(_x3[_y3], b);
_x4 = o.x, _y4 = JSBI.add(y, z), _x4[_y4] = JSBI.add(_x4[_y4], b);
_x5 = o.x, _y5 = "y", _x5[_y5] = JSBI.add(_x5[_y5], JSBI.BigInt(1));
_x6 = o.x, _y6 = 'y', _x6[_y6] = JSBI.add(_x6[_y6], JSBI.BigInt(1));
_x7 = o.x, _y7 = y, _x7[_y7] = JSBI.add(_x7[_y7], JSBI.BigInt(1));
_x8 = o.x, _y8 = JSBI.add(y, z), _x8[_y8] = JSBI.add(_x8[_y8], JSBI.BigInt(1));
_x9 = o.x, _y9 = "y", _z = _x9[_y9], _x9[_y9] = JSBI.add(_z, JSBI.BigInt(1)), _z;
_x10 = o.x, _y10 = 'y', _z2 = _x10[_y10], _x10[_y10] = JSBI.add(_z2, JSBI.BigInt(1)), _z2;
_x11 = o.x, _y11 = y, _z3 = _x11[_y11], _x11[_y11] = JSBI.add(_z3, JSBI.BigInt(1)), _z3;
_x12 = o.x, _y12 = JSBI.add(y, z), _z4 = _x12[_y12], _x12[_y12] = JSBI.add(_z4, JSBI.BigInt(1)), _z4;

*/
