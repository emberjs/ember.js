var setProperties = function(object, properties) {
  for (var key in properties) {
    if (properties.hasOwnProperty(key)) {
      object[key] = properties[key];
    }
  }
};

var guids = 0;

export default function factory() {
  /*jshint validthis: true */

  var Klass = function(options) {
    setProperties(this, options);
    this._guid = guids++;
  };

  Klass.prototype.constructor = Klass;
  Klass.prototype.destroy = function() {
    this.isDestroyed = true;
  };

  Klass.prototype.toString = function() {
    return '<Factory:' + this._guid + '>';
  };

  Klass.create = create;
  Klass.extend = extend;
  Klass.reopen = extend;
  Klass.reopenClass = reopenClass;

  return Klass;

  function create(options) {
    return new this.prototype.constructor(options);
  }

  function reopenClass(options) {
    setProperties(this, options);
  }

  function extend(options) {
    var Child = function(options) {
      Klass.call(this, options);
    };

    var Parent = this;

    Child.prototype = new Parent();
    Child.prototype.constructor = Child;

    setProperties(Child, Klass);
    setProperties(Child.prototype, options);

    Child.create = create;
    Child.extend = extend;
    Child.reopen = extend;

    Child.reopenClass = reopenClass;

    return Child;
  }
}
