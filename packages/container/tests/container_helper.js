/*global setProperties:true factory:true o_create:true */

setProperties = function(object, properties) {
  for (var key in properties) {
    if (properties.hasOwnProperty(key)) {
      object[key] = properties[key];
    }
  }
};

var o_create = Object.create || (function(){
  function F(){}

  return function(o) {
    if (arguments.length !== 1) {
      throw new Ember.Error('Object.create implementation only accepts one parameter.');
    }
    F.prototype = o;
    return new F();
  };
}());

var guids = 0;

var passedOptions;

factory = function() {
  var Klass = function(options) {
    setProperties(this, options);
    this._guid = guids++;
  };

  Klass.prototype.constructor = Klass;
  Klass.prototype.destroy = function() {
    this.isDestroyed = true;
  };

  Klass.prototype.toString = function() {
    return "<Factory:" + this._guid + ">";
  };

  Klass.create = create;
  Klass.extend = extend;
  Klass.reopen = extend;
  Klass.reopenClass = reopenClass;

  return Klass;

  function create(options) {
    var passedOptions = options;
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

    setProperties(Child.prototype, options);

    Child.create = create;
    Child.extend = extend;
    Child.reopen = extend;

    Child.reopenClass = reopenClass;

    return Child;
  }
};
