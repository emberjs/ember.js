var GUID = 0;

export function guid() {
  return ++GUID;
}

export function dict() {
  let d = Object.create(null);
  d.x = 1;
  delete d.x;
  return d;
}

export class DictSet {
  constructor() {
    this._dict = dict();
  }

  add(obj) {
    this._dict[obj._guid] = obj;
  }

  remove(obj) {
    delete this._dict[obj._guid];
  }

  forEach(callback) {
    let { _dict } = this;
    Object.keys(_dict).forEach(key => callback(_dict[key]));
  }
}

export function intern(str) {
  var obj = {};
  obj[str] = 1;
  for (var key in obj) return key;
}

export function EMPTY_CACHE() {}
