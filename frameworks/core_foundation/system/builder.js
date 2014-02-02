// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/** @class

  The Builder class makes it easy to create new chained-builder API's such as
  those provided by CoreQuery or jQuery.  Usually you will not create a new
  builder yourself, but you will often use instances of the Builder object to
  configure parts of the UI such as menus and views.
  
  # Anatomy of a Builder
  
  You can create a new Builder much like you would any other class in 
  SproutCore.  For example, you could create a new CoreQuery-type object with
  the following:
  
      SC.$ = SC.Builder.create({
        // methods you can call go here.
      });
  
  Unlike most classes in SproutCore, Builder objects are actually functions 
  that you can call to create new instances.  In the example above, to use 
  the builder, you must call it like a function:
  
      buildit = SC.$();
  
  If you define an init() method on a builder, it will be invoked wheneve the
  builder is called as a function, including any passed params.  Your init()
  method MUST return this, unlike regular SC objects.  i.e.
  
      SC.$ = SC.Builder.create({
        init: function(args) { 
          this.args = SC.A(args);
          return this;
        }
      });
      
      buildit = SC.$('a', 'b');
      buildit.args => ['a','b']
  
  In addition to defining a function like this, all builder objects also have
  an 'fn' property that contains a hash of all of the helper methods defined
  on the builder function.  Once a builder has been created, you can add 
  addition "plugins" for the builder by simply adding new methods to the
  fn property.
  
  # Writing Builder Functions
  
  All builders share a few things in common:
  
   * when a new builder is created, it's init() method will be called.  The default version of this method simply copies the passed parameters into the builder as content, but you can override this with anything you want.
   * the content the builder works on is stored as indexed properties (i.e. 0,1,2,3, like an array).  The builder should also have a length property if you want it treated like an array.
   *- Builders also maintain a stack of previous builder instances which you can pop off at any time.
  
  To get content back out of a builder once you are ready with it, you can
  call the method done().  This will return an array or a single object, if 
  the builder only works on a single item.
  
  You should write your methods using the getEach() iterator to work on your
  member objects.  All builders implement SC.Enumerable in the fn() method.

      CoreQuery = SC.Builder.create({
        ...
      }) ;
      
      CoreQuery = new SC.Builder(properties) {
        ...
      } ;
      
      CoreQuery2 = CoreQuery.extend() {
      }
  
  @constructor
*/
SC.Builder = function (props) { return SC.Builder.create(props); };

/** 
  Create a new builder object, applying the passed properties to the 
  builder's fn property hash.
  
  @param {Hash} properties
  @returns {SC.Builder}
*/
SC.Builder.create = function create(props) { 
  
  // generate new fn with built-in properties and copy props
  var fn = SC.mixin(SC.beget(this.fn), props||{}) ;
  if (props.hasOwnProperty('toString')) fn.toString = props.toString;
  
  // generate new constructor and hook in the fn
  var construct = function() {
    var ret = SC.beget(fn); // NOTE: using closure here...
    
    // the defaultClass is usually this for this constructor. 
    // e.g. SC.View.build() -> this = SC.View
    ret.defaultClass = this ;
    ret.constructor = construct ;

    // now init the builder object.
    return ret.init.apply(ret, arguments) ;
  } ;
  construct.fn = construct.prototype = fn ;

  // the create() method can be used to extend a new builder.
  // eg. SC.View.buildCustom = SC.View.build.extend({ ...props... })
  construct.extend = SC.Builder.create ;
  construct.mixin = SC.Builder.mixin ;
  
  return construct; // return new constructor
} ;

SC.Builder.mixin = function() {
  var len = arguments.length, idx;
  for(idx=0;idx<len;idx++) SC.mixin(this, arguments[idx]);
  return this ;
};

/** This is the default set of helper methods defined for new builders. */
SC.Builder.fn = {

  /** 
    Default init method for builders.  This method accepts either a single
    content object or an array of content objects and copies them onto the 
    receiver.  You can override this to provide any kind of init behavior 
    that you want.  Any parameters passed to the builder method will be 
    forwarded to your init method.
    
    @returns {SC.Builder} receiver
  */
  init: function(content) {
    if (content !== undefined) {
      if (SC.typeOf(content) === SC.T_ARRAY) {
        var loc=content.length;
        while(--loc >= 0) {
          this[loc] = content.objectAt ? content.objectAt(loc) : content[loc];
        }
        this.length = content.length ;
      } else {
        this[0] = content; this.length=1;
      }
    }
    return this ;
  },
  
  /** Return the number of elements in the matched set. */
  size: function() { return this.length; },
  
  /** 
    Take an array of elements and push it onto the stack (making it the
    new matched set.)  The receiver will be saved so it can be popped later.
    
    @param {Object|Array} content
    @returns {SC.Builder} new instance
  */
  pushStack: function() {
    // Build a new CoreQuery matched element set
    var ret = this.constructor.apply(this,arguments);

    // Add the old object onto the stack (as a reference)
    ret.prevObject = this;

    // Return the newly-formed element set
    return ret;
  },

  /**
    Returns the previous object on the stack so you can continue with that
    transform.  If there is no previous item on the stack, an empty set will
    be returned.
  */
  end: function() { 
    return this.prevObject || this.constructor(); 
  },
  
  // toString describes the builder
  toString: function() { 
    return "%@$(%@)".fmt(this.defaultClass.toString(), 
      SC.A(this).invoke('toString').join(',')); 
  },
  
  /** You can enhance the fn using this mixin method. */
  mixin: SC.Builder.mixin
  
};

// Apply SC.Enumerable.  Whenever possible we want to use the Array version
// because it might be native code.
(function() {
  var enumerable = SC.Enumerable, fn = SC.Builder.fn, key, value ;
  for(key in enumerable) {
    if (!enumerable.hasOwnProperty(key)) continue ;
    value = Array.prototype[key] || enumerable[key];
    fn[key] = value ;
  }
})();



