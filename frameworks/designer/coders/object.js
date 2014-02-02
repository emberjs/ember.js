// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


/**

  Generic base class to encode a view hierarchy.  `ViewCoder`s are used to
  collect the properties that may be included in a view design and then to 
  serialize that design to a JavaScript string that can be evaled.  
  
  To encode a view with a `ViewCoder`, simply call `SC.ViewCoder.encode(view)`.
  Most of the time, however, you will not initiate coding directly but instead
  work with the coder while designing an `SC.DesignerView` subclass.

  ## Using a Coder

  When you are passed an instance of a coder, you can simply write attributes
  into the coder using one of the many encoding methods defined on the view.
  Encoding methods are defined for most primitive view types.
  
      coder.string("firstName" , "Charles").string('lastName', 'Jolley');
  
  @extends SC.Object
*/
SC.ObjectCoder = SC.Object.extend({
  
  // ..........................................................
  // PROPERTIES
  // 
  
  /** The `className` used to emit the design. */
  className: 'SC.Object',
  
  /** 
    The method to be used to create the class or object. 
  */
  extendMethodName: 'extend',
  
  /** 
    The default encoding method.  If an object defines this method, then a new
    coder will be created to encode that object.
  */
  encodeMethodName: 'encode',
  
  /** 
    The attributes that will be emitted.  The values all must be strings. Use 
    one of the encoding methods defined below to actually encode attributes.
  */
  attributes: null,
  
  // ..........................................................
  // ENCODING METHODS
  // 
  // Call these methods to encode various types of attributes.  They all take
  // the same basic params: (key, value)...

  /**
    Utility method transforms the passed value with the passed function.  
    Handles both Arrays and individual items.
  */
  transform: function(val, func) {
    
    // for an array, transform each value with the func and then return a
    // combined array.
    if (SC.typeOf(val) === SC.T_ARRAY) {
      val = val.map(function(x) { return this.transform(x, func); }, this);
      val = '['+val+']';
      
    // otherwise, just call transform function on the value
    } else {
      val = func.call(this, val);
    }
    return val;
  },
  
  /**
    Encodes a string of raw JavaScript.  This is the most primitive method. 
    You are expected to prep the value yourself.  You can pass an array to
    this or any other method and it will be encoded as a full array.

    This method also automatically handles null and undefined values.  Null
    values are included in the output.  Undefined values are ignored.
    
    @param key {String} the key to set
    @param val {String} the JavaScript
    @param transform {Function} optional transform function to apply to val
    @returns {SC.ObjectCoder} receiver
  */
  js: function(key, val, transform) {
    
    // normalize
    if (val===undefined) { val=key; key = undefined; }
    val = this.transform(val, function(x) {
      return (x===null) ? "null" : transform ? transform.call(this, x) : x ;
    });
    
    // save if needed.  Undefined values are ignored
    if (key !== undefined && (val !== undefined)) {
      this.attributes[key] = val;
      return this ;
    } else return val ;
  },

  /**
    Encodes a string, wrapping it in quotes.
    
    @param key {String} the key to set
    @param val {String} the value
    @returns {SC.ObjectCoder} receiver
  */
  string: function(key, val) {
    return this.js(key, val, function(x) {
      return '"' + x.replace(/"/g, '\\"') + '"' ;
    });
  },
  
  /**
    Encodes a number, wrapping it in quotes.
    
    @param key {String} the key to set
    @param val {Number} the value
    @returns {SC.ObjectCoder} receiver
  */
  number: function(key, val) {
    return this.js(key, val, function(x) { return x.toString(); });
  },
  
  /**
    Encodes a bool, mapped as `YES` or `NO`
    
    @param key {String} the key to set
    @param val {Boolean} the value
    @returns {SC.ObjectCoder} receiver
  */
  bool: function(key, val) {
    return this.js(key, val, function(x) { return x ? "true" : "false"; });
  },

  /**
    Encodes an object.  This will do its best to autodetect the type of the
    object.  You can pass an optional processing function that will be used 
    on object members before processing to allow you to normalize.  The 
    method signature must be:
    
        function convert(value, rootObject, key);

    The rootObject and key will be set to give you the context in the 
    hierarchy.
    
    Generally this method will work for encoding simple value only.  If your 
    object graph may contain SproutCore objects, you will need to encode it
    yourself.
    
    @param key {String} the key to set
    @param val {Object} the value
    @param func {Function} optional transform func
    @returns {SC.ObjectCoder} receiver
  */
  encode: function(key, val, func) {
    // normalize params
    if (func===undefined && val instanceof Function) {
      func = val; val = key; key = undefined; 
    }

    return this.js(key, val, function(cur) { 
      if (func) cur = func.call(this, cur, null, null);
      switch(SC.typeOf(cur)) {
      case SC.T_STRING:
        cur = this.string(cur);
        break;

      case SC.T_NUMBER:
        cur = this.number(cur);
        break;

      case SC.T_BOOL:
        cur = this.bool(cur);
        break;

      case SC.T_ARRAY:
        cur = this.array(cur, func) ;
        break;

      case SC.T_HASH:
        cur = this.hash(cur, func);
        break ;
        
      default:
        // otherwise, if the object has a designer attached, try to encode
        // view.
        cur = cur ? this.object(cur) : this.js(cur);
      }
      return cur ;
    });
  },
  
  /**
    Encodes a hash of objects.  The object values must be simple objects for
    this method to work.  You can also optionally pass a processing function
    that will be invoked for each value, giving you a chance to convert the
    value first.  The signature must be `(key, value, rootObject)`.
    
    @param key {String} the key to set
    @param val {Object} the value
    @param func {Function} optional transform func
    @returns {SC.ObjectCoder} receiver
  */
  hash: function(key, val, func) {
    
    // normalize params
    if (func===undefined && val instanceof Function) {
      func = val; val = key; key = undefined; 
    }
    
    return this.js(key, val, function(x) { 
      var ret = [] ;
      for(var key in x) {
        if (!x.hasOwnProperty(key)) continue; // only include added...
        ret.push("%@: %@".fmt(this.encode(key), this.encode(x[key], func)));
      }
      return "{%@}".fmt(ret.join(","));
    });
  },

  /**
    Encodes a array of objects.  The object values must be simple objects for
    this method to work.  You can also optionally pass a processing function
    that will be invoked for each value, giving you a chance to convert the
    value first.  The signature must be `(index, value, rootObject)`.
    
    @param key {String} the key to set
    @param val {Object} the value
    @param func {Function} optional transform func
    @returns {SC.ObjectCoder} receiver
  */
  array: function(key, val, func) {
    
    // normalize params
    if (func===undefined && val instanceof Function) {
      func = val; val = key; key = undefined; 
    }

    val = val.map(function(x) { return this.encode(x, func); }, this);
    val = "[%@]".fmt(val.join(","));

    return this.js(key, val);
  },
  
  /**
    Attempts to encode an object.  The object must implement the 
    encodeMethodName for this encoder, or else an exception will be raised.
    
    @param key {String} the key to set
    @param val {Object} the object to encode
    @returns {SC.ObjectCoder} receiver
  */
  object: function(key, val) {
    return this.js(key, val, function(x) {
      return this.constructor.encode(x, this);
    });
  },
  
  // ..........................................................
  // INTERNAL SUPPORT
  // 
  
  spaces: function() {
    var spaces = this.context ? this.context.get('spaces') : '' ;
    spaces = spaces + '  ';  
    return spaces ;
  }.property().cacheable(),
  
  /** 
    Emits the final JavaScript output for this coder based on the current
    attributes.
  */
  emit: function() {
    
    // return undefined if the encoding was rejected...
    if (this.invalid) return undefined ;
    
    var ret = [], attrs = this.attributes, key ;
    var methodName = this.get('extendMethodName');
    var spaces = this.get('spaces');
    
    // compute attribute body...
    for(key in attrs) {
      if (!attrs.hasOwnProperty(key)) continue ;
      ret.push("%@: %@".fmt(key, attrs[key]));
    }
    
    if (ret.length <= 0) {
      return "%@1%@2.%@3({})".fmt(spaces, this.className, methodName);
    } else {
      // handle NO class formatting..
      ret = ret.join(",");
      return "%@2.%@3({%@4})".fmt(spaces, this.className, methodName, ret);
    }
  },
  
  /**
    Begins encoding with a particular object, setting the className to the 
    object's `className`.  This is used internally by the `encode()` method.
  */
  begin: function(object) {
    var methodName = this.get('encodeMethodName');
    if (SC.typeOf(object[methodName]) !== SC.T_FUNCTION) {
      throw SC.$error("Cannot encode %@ because it does not respond to %@()".fmt(object, methodName)) ;
    } 
    
    // save className for later coding
    this.set('className', SC._object_className(object.constructor));

    // then call encode method...
    var ret = object[methodName](this);
    
    // if encoding method returns NO, then encoding is not allowed.
    // note that returning void should count as YES.
    this.invalid = ret === NO ;
    
    // and return this
    return this ;
  },
  
  init: function() {
    sc_super();
    this.set('attributes', {});
  },
  
  destroy: function() {
    sc_super();
    this.context = this.className = this.attributes = null ; // cleanup
  }
  
});

SC.ObjectCoder.encode = function(object, context) {
  // create coder and emit code...
  var coder = this.create({ context: context });
  var ret = coder.begin(object).emit();
  
  // cleanup and return
  coder.destroy();
  return ret ;
} ;
