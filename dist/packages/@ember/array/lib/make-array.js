const {
  isArray
} = Array;
function makeArray(obj) {
  if (obj === null || obj === undefined) {
    return [];
  }
  return isArray(obj) ? obj : [obj];
}
export default makeArray;