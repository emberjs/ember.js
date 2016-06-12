function setProperties(object, properties) {
  for (let key in properties) {
    if (properties.hasOwnProperty(key)) {
      object[key] = properties[key];
    }
  }
}

let guids = 0;

export default function factory() {
  /*jshint validthis: true */

  function Klass(options) {
    setProperties(this, options);
    this._guid = guids++;
    this.isDestroyed = false;
  }

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
    function Child(options) {
      Klass.call(this, options);
    }

    let Parent = this;

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
