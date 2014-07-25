import dictionary from 'ember-metal/dictionary';
export default Cache;

function Cache(limit, func) {
  this.store  = dictionary(null);
  this.size   = 0;
  this.misses = 0;
  this.hits   = 0;
  this.limit  = limit;
  this.func   = func;
}

var FALSE     = function() { };
var ZERO      = function() { };
var UNDEFINED = function() { };
var NULL      = function() { };

Cache.prototype = {
  set: function(key, value) {
    if (this.limit > this.size) {
      this.size ++;
      if (value === undefined) {
        this.store[key] = UNDEFINED;
      } else {
        this.store[key] = value;
      }
    }

    return value;
  },

  get: function(key) {
    var value = this.store[key];

    if (value === undefined) {
      this.misses ++;
      value = this.set(key, this.func(key));
    } else if (value === UNDEFINED) {
      this.hits ++;
      value = UNDEFINED;
    } else {
      this.hits ++;
      // nothing to translate
    }

    return value;
  },

  purge: function() {
    this.store  = dictionary(null);
    this.size   = 0;
    this.hits   = 0;
    this.misses = 0;
  }
};
