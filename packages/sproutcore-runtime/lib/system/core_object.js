// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================



// NOTE: this object should never be included directly.  Instead use SC.
// SC.Object.  We only define this separately so that SC.Set can depend on it



var rewatch = SC.rewatch;
var classToString = SC.Mixin.prototype.toString;
var set = SC.set, get = SC.get;
var o_create = SC.platform.create,
    meta = SC.meta;

function makeCtor() {

  // Note: avoid accessing any properties on the object since it makes the
  // method a lot faster.  This is glue code so we want it to be as fast as
  // possible.

  var isPrepared = false, initMixins, init = false, hasChains = false;

  var Class = function() {
    if (!isPrepared) { get(Class, 'proto'); } // prepare prototype...
    if (initMixins) {
      this.reopen.apply(this, initMixins);
      initMixins = null;
      rewatch(this); // ålways rewatch just in case
      this.init.apply(this, arguments);
    } else {
      if (hasChains) {
        rewatch(this);
      } else {
        this[SC.GUID_KEY] = undefined;
      }
      if (init===false) { init = this.init; } // cache for later instantiations
      init.apply(this, arguments);
    }
  };

  Class.toString = classToString;
  Class._prototypeMixinDidChange = function() { isPrepared = false; };
  Class._initMixins = function(args) { initMixins = args; };

  SC.defineProperty(Class, 'proto', SC.computed(function() {
    if (!isPrepared) {
      isPrepared = true;
      Class.PrototypeMixin.applyPartial(Class.prototype);
      hasChains = !!meta(Class.prototype, false).chains; // avoid rewatch
    }
    return this.prototype;
  }));

  return Class;

}

var CoreObject = makeCtor();

CoreObject.PrototypeMixin = SC.Mixin.create({

  reopen: function() {
    SC.Mixin._apply(this, arguments, true);
    return this;
  },

  isInstance: true,

  init: function() {},

  isDestroyed: false,

  /**
    Destroys an object by setting the isDestroyed flag and removing its
    metadata, which effectively destroys observers and bindings.

    If you try to set a property on a destroyed object, an exception will be
    raised.

    Note that destruction is scheduled for the end of the run loop and does not
    happen immediately.

    @returns {SC.Object} receiver
  */
  destroy: function() {
    set(this, 'isDestroyed', true);
    SC.run.schedule('destroy', this, this._scheduledDestroy);
    return this;
  },

  /**
    Invoked by the run loop to actually destroy the object. This is
    scheduled for execution by the `destroy` method.

    @private
  */
  _scheduledDestroy: function() {
    this[SC.META_KEY] = null;
  },

  bind: function(to, from) {
    if (!(from instanceof SC.Binding)) { from = SC.Binding.from(from); }
    from.to(to).connect(this);
    return from;
  },

  toString: function() {
    return '<'+this.constructor.toString()+':'+SC.guidFor(this)+'>';
  }
});

CoreObject.__super__ = null;

var ClassMixin = SC.Mixin.create({

  ClassMixin: SC.required(),

  PrototypeMixin: SC.required(),

  isClass: true,

  isMethod: false,

  extend: function() {
    var Class = makeCtor(), proto;
    Class.ClassMixin = SC.Mixin.create(this.ClassMixin);
    Class.PrototypeMixin = SC.Mixin.create(this.PrototypeMixin);

    Class.ClassMixin.ownerConstructor = Class;
    Class.PrototypeMixin.ownerConstructor = Class;

    var PrototypeMixin = Class.PrototypeMixin;
    PrototypeMixin.reopen.apply(PrototypeMixin, arguments);

    Class.superclass = this;
    Class.__super__  = this.prototype;

    proto = Class.prototype = o_create(this.prototype);
    proto.constructor = Class;
    SC.generateGuid(proto, 'sc');
    meta(proto).proto = proto; // this will disable observers on prototype
    SC.rewatch(proto); // setup watch chains if needed.


    Class.subclasses = SC.Set ? new SC.Set() : null;
    if (this.subclasses) { this.subclasses.add(Class); }

    Class.ClassMixin.apply(Class);
    return Class;
  },

  create: function() {
    var C = this;
    if (arguments.length>0) { this._initMixins(arguments); }
    return new C();
  },

  reopen: function() {
    var PrototypeMixin = this.PrototypeMixin;
    PrototypeMixin.reopen.apply(PrototypeMixin, arguments);
    this._prototypeMixinDidChange();
    return this;
  },

  reopenClass: function() {
    var ClassMixin = this.ClassMixin;
    ClassMixin.reopen.apply(ClassMixin, arguments);
    SC.Mixin._apply(this, arguments, false);
    return this;
  },

  detect: function(obj) {
    if ('function' !== typeof obj) { return false; }
    while(obj) {
      if (obj===this) { return true; }
      obj = obj.superclass;
    }
    return false;
  }

});

CoreObject.ClassMixin = ClassMixin;
ClassMixin.apply(CoreObject);

SC.CoreObject = CoreObject;



