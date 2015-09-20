let BASE_KEY = intern(`__htmlbars${+ new Date()}`);

export function symbol(debugName) {
  return intern(debugName + ' [id=' + BASE_KEY + Math.floor(Math.random() * new Date()) + ']');
}

export function intern(str) {
  var obj = {};
  obj[str] = 1;
  for (var key in obj) {
    if (key === str) {
      return key;
    }
  }
  return str;
}
