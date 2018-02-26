/**
 @param {Object} t target
 @param {String} m method
 @param {Array} a args
 @private
 */
export default function applyStr(t, m, a) {
  let l = a && a.length;
  if (!a || !l) { return t[m](); }
  switch (l) {
    case 1:  return t[m](a[0]);
    case 2:  return t[m](a[0], a[1]);
    case 3:  return t[m](a[0], a[1], a[2]);
    case 4:  return t[m](a[0], a[1], a[2], a[3]);
    case 5:  return t[m](a[0], a[1], a[2], a[3], a[4]);
    default: return t[m](...a);
  }
}
