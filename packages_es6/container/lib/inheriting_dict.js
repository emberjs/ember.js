// A safe and simple inheriting object.
function InheritingDict(parent, prefix) {
  this.parent = parent;
  this.dict = {};
  this._prefix = prefix || '';
}

InheritingDict.prototype = {

  /**
    @property parent
    @type InheritingDict
    @default null
  */

  parent: null,

  /**
    Object used to store the current nodes data.

    @property dict
    @type Object
    @default Object
  */
  dict: null,

  /**
    Retrieve the value given a key, if the value is present at the current
    level use it, otherwise walk up the parent hierarchy and try again. If
    no matching key is found, return undefined.

    @method get
    @param {String} key
    @return {any}
  */
  get: function(key) {
    var dict = this.dict;
    key = this._prefix + key;

    if (dict.hasOwnProperty(key)) {
      return dict[key];
    }

    if (this.parent) {
      return this.parent.get(key);
    }
  },

  /**
    Set the given value for the given key, at the current level.

    @method set
    @param {String} key
    @param {Any} value
  */
  set: function(key, value) {
    this.dict[this._prefix + key] = value;
  },

  /**
    Delete the given key

    @method remove
    @param {String} key
  */
  remove: function(key) {
    delete this.dict[this._prefix + key];
  },

  /**
    Check for the existence of given a key, if the key is present at the current
    level return true, otherwise walk up the parent hierarchy and try again. If
    no matching key is found, return false.

    @method has
    @param {String} key
    @return {Boolean}
  */
  has: function(key) {
    var dict = this.dict;
    key = this._prefix + key;

    if (dict.hasOwnProperty(key)) {
      return true;
    }

    if (this.parent) {
      return this.parent.has(key);
    }

    return false;
  },

  /**
    Iterate and invoke a callback for each local key-value pair.

    @method eachLocal
    @param {Function} callback
    @param {Object} binding
  */
  eachLocal: function(callback, binding) {
    var dict = this.dict,
        pl = this._prefix.length;

    for (var prop in dict) {
      if (dict.hasOwnProperty(prop)) {
        callback.call(binding, prop.slice(pl), dict[prop]);
      }
    }
  }
};

export default InheritingDict;
