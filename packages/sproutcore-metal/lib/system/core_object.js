// ==========================================================================
// Project:   SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('sproutcore-metal/system/props');
require('sproutcore-metal/system/mixin');

// NOTE: this object should never be included directly.  Instead use SC.
// SC.Object.  We only define this separately so that SC.Set can depend on it



var rewatch = SC.rewatch;
var classToString = SC.Mixin.prototype.toString;

function makeCtor() {

  // Note: avoid accessing any properties on the object since it makes the
  // method a lot faster.  This is glue code so we want it to be as fast as
  // possible.
  
  var isPrepared = false, initMixins, init = false, hasChains = false;
  
  var Class = function() {
    if (!isPrepared) {
      isPrepared = true;
      Class.PrototypeMixin.applyPartial(Class.prototype);
      hasChains = !!SC.meta(this, false).chains; // avoid rewatch unless req.
    }
    
    if (initMixins) {
      this.reopen.apply(this, initMixins);
      initMixins = null;
      rewatch(this); // ålways rewatch just in case
      this.init.apply(this, arguments);
    } else {
      if (hasChains) rewatch(this);
      if (init===false) init = this.init; // cache for later instantiations
      init.apply(this, arguments);
    }
  };

  Class.toString = classToString;
  Class._prototypeMixinDidChange = function() { isPrepared = false; };
  Class._initMixins = function(args) { initMixins = args; };
  
  return Class;
  
}

var Object = makeCtor();

Object.PrototypeMixin = SC.Mixin.create({
  
  reopen: function() {
    SC.Mixin._apply(this, arguments, true);
    return this;
  },
  
  init: function() {},
  
  bind: function(to, from) {
    if (!(from instanceof SC.Binding)) from = SC.Binding.from(from);
    from.to(to).connect(this);
    return from;
  },

  toString: function() {
    return '<'+this.constructor.toString()+':'+SC.guidFor(this)+'>';
  }
});

Object.__super__ = null;

var ClassMixin = SC.Mixin.create({
    
  ClassMixin: SC.required(),
  
  PrototypeMixin: SC.required(),
  
  isMethod: false,
  
  extend: function() {
    var Class = makeCtor();
    Class.ClassMixin = SC.Mixin.create(this.ClassMixin);
    Class.PrototypeMixin = SC.Mixin.create(this.PrototypeMixin);
    
    var PrototypeMixin = Class.PrototypeMixin;
    PrototypeMixin.reopen.apply(PrototypeMixin, arguments);
    
    Class.superclass = this;
    Class.__super__  = this.prototype;
    Class.prototype = SC.create(this.prototype);
    Class.prototype.constructor = Class;
    Class.subclasses = SC.Set ? new SC.Set() : null;
    
    if (this.subclasses) this.subclasses.add(Class);
    
    Class.ClassMixin.apply(Class);
    return Class;
  },
  
  create: function() {
    var C = this;
    if (arguments.length>0) this._initMixins(arguments);
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
    if ('function' !== typeof obj) return false;
    while(obj) {
      if (obj===this) return true;
      obj = obj.superclass;
    }
    return false;
  }
  
});

Object.ClassMixin = ClassMixin;
ClassMixin.apply(Object);

SC.CoreObject = Object;



