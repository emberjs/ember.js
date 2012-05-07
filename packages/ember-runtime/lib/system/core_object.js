// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================



// NOTE: this object should never be included directly.  Instead use Ember.
// Ember.Object.  We only define this separately so that Ember.Set can depend on it



var rewatch = Ember.rewatch;
var classToString = Ember.Mixin.prototype.toString;
var set = Ember.set, get = Ember.get;
var o_create = Ember.platform.create,
    o_defineProperty = Ember.platform.defineProperty,
    a_slice = Array.prototype.slice,
    meta = Ember.meta;

/** @private */
function makeCtor() {

  // Note: avoid accessing any properties on the object since it makes the
  // method a lot faster.  This is glue code so we want it to be as fast as
  // possible.

  var wasApplied = false, initMixins, init = false, hasChains = false;

  var Class = function() {
    if (!wasApplied) { Class.proto(); } // prepare prototype...
    if (initMixins) {
      this.reopen.apply(this, initMixins);
      initMixins = null;
      rewatch(this); // always rewatch just in case
      Ember.Mixin.finishPartial(this);
      this.init.apply(this, arguments);
    } else {
      if (hasChains) {
        rewatch(this);
      } else {
        Ember.GUID_DESC.value = undefined;
        o_defineProperty(this, Ember.GUID_KEY, Ember.GUID_DESC);
      }
      if (init===false) { init = this.init; } // cache for later instantiations
      Ember.GUID_DESC.value = undefined;
      o_defineProperty(this, '_super', Ember.GUID_DESC);
      Ember.Mixin.finishPartial(this);
      init.apply(this, arguments);
    }
  };

  Class.toString = classToString;
  Class.willReopen = function() {
    if (wasApplied) {
      Class.PrototypeMixin = Ember.Mixin.create(Class.PrototypeMixin);
    }

    wasApplied = false;
  };
  Class._initMixins = function(args) { initMixins = args; };

  Class.proto = function() {
    var superclass = Class.superclass;
    if (superclass) { superclass.proto(); }

    if (!wasApplied) {
      wasApplied = true;
      Class.PrototypeMixin.applyPartial(Class.prototype);
      Ember.rewatch(Class.prototype); // setup watch chains if needed.
      hasChains = !!meta(Class.prototype, false).chains; // avoid rewatch
    }

    return this.prototype;
  };

  return Class;

}

var CoreObject = makeCtor();

CoreObject.PrototypeMixin = Ember.Mixin.create(
/** @scope Ember.CoreObject */ {

  reopen: function() {
    Ember.Mixin._apply(this, arguments, true);
    return this;
  },

  isInstance: true,

  /** @private */
  init: function() {},

  /** @field */
  isDestroyed: false,

  /** @field */
  isDestroying: false,

  /**
    Destroys an object by setting the isDestroyed flag and removing its
    metadata, which effectively destroys observers and bindings.

    If you try to set a property on a destroyed object, an exception will be
    raised.

    Note that destruction is scheduled for the end of the run loop and does not
    happen immediately.

    @returns {Ember.Object} receiver
  */
  destroy: function() {
    if (this.isDestroying) { return; }

    this.isDestroying = true;

    if (this.willDestroy) { this.willDestroy(); }

    set(this, 'isDestroyed', true);
    Ember.run.schedule('destroy', this, this._scheduledDestroy);
    return this;
  },

  /**
    Invoked by the run loop to actually destroy the object. This is
    scheduled for execution by the `destroy` method.

    @private
  */
  _scheduledDestroy: function() {
    Ember.destroy(this);
    if (this.didDestroy) { this.didDestroy(); }
  },

  bind: function(to, from) {
    if (!(from instanceof Ember.Binding)) { from = Ember.Binding.from(from); }
    from.to(to).connect(this);
    return from;
  },

  toString: function() {
    return '<'+this.constructor.toString()+':'+Ember.guidFor(this)+'>';
  }
});

CoreObject.__super__ = null;

var ClassMixin = Ember.Mixin.create({

  ClassMixin: Ember.required(),

  PrototypeMixin: Ember.required(),

  isClass: true,

  isMethod: false,

  extend: function() {
    var Class = makeCtor(), proto;
    Class.ClassMixin = Ember.Mixin.create(this.ClassMixin);
    Class.PrototypeMixin = Ember.Mixin.create(this.PrototypeMixin);

    Class.ClassMixin.ownerConstructor = Class;
    Class.PrototypeMixin.ownerConstructor = Class;

    var PrototypeMixin = Class.PrototypeMixin;
    PrototypeMixin.reopen.apply(PrototypeMixin, arguments);

    Class.superclass = this;
    Class.__super__  = this.prototype;

    proto = Class.prototype = o_create(this.prototype);
    proto.constructor = Class;
    Ember.generateGuid(proto, 'ember');
    meta(proto).proto = proto; // this will disable observers on prototype


    Class.subclasses = Ember.Set ? new Ember.Set() : null;
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
    this.willReopen();
    var PrototypeMixin = this.PrototypeMixin;
    PrototypeMixin.reopen.apply(PrototypeMixin, arguments);
    return this;
  },

  reopenClass: function() {
    var ClassMixin = this.ClassMixin;
    ClassMixin.reopen.apply(ClassMixin, arguments);
    Ember.Mixin._apply(this, arguments, false);
    return this;
  },

  detect: function(obj) {
    if ('function' !== typeof obj) { return false; }
    while(obj) {
      if (obj===this) { return true; }
      obj = obj.superclass;
    }
    return false;
  },

  detectInstance: function(obj) {
    return obj instanceof this;
  },

  /**
    In some cases, you may want to annotate computed properties with additional
    metadata about how they function or what values they operate on. For example,
    computed property functions may close over variables that are then no longer
    available for introspection.

    You can pass a hash of these values to a computed property like this:

        person: function() {
          var personId = this.get('personId');
          return App.Person.create({ id: personId });
        }.property().meta({ type: App.Person })

    Once you've done this, you can retrieve the values saved to the computed
    property from your class like this:

        MyClass.metaForProperty('person');

    This will return the original hash that was passed to `meta()`.
  */
  metaForProperty: function(key) {
    var desc = meta(this.proto(), false).descs[key];

    Ember.assert("metaForProperty() could not find a computed property with key '"+key+"'.", !!desc && desc instanceof Ember.ComputedProperty);
    return desc._meta || {};
  },

  /**
    Iterate over each computed property for the class, passing its name
    and any associated metadata (see `metaForProperty`) to the callback.
  */
  eachComputedProperty: function(callback, binding) {
    var proto = this.proto(),
        descs = meta(proto).descs,
        empty = {},
        property;

    for (var name in descs) {
      property = descs[name];

      if (property instanceof Ember.ComputedProperty) {
        callback.call(binding || this, name, property._meta || empty);
      }
    }
  }

});

CoreObject.ClassMixin = ClassMixin;
ClassMixin.apply(CoreObject);

/**
  @class
*/
Ember.CoreObject = CoreObject;



