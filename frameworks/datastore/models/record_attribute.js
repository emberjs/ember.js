// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('models/record');

/** @class

  A RecordAttribute describes a single attribute on a record.  It is used to
  generate computed properties on records that can automatically convert data
  types and verify data.

  When defining an attribute on an SC.Record, you can configure it this way:

      title: SC.Record.attr(String, {
        defaultValue: 'Untitled',
        isRequired: YES|NO
      })

  In addition to having predefined transform types, there is also a way to
  set a computed relationship on an attribute. A typical example of this would
  be if you have record with a parentGuid attribute, but are not able to
  determine which record type to map to before looking at the guid (or any
  other attributes). To set up such a computed property, you can attach a
  function in the attribute definition of the SC.Record subclass:

      relatedToComputed: SC.Record.toOne(function() {
        return (this.readAttribute('relatedToComputed').indexOf("foo")==0) ? MyApp.Foo : MyApp.Bar;
      })

  Notice that we are not using .get() to avoid another transform which would
  trigger an infinite loop.

  You usually will not work with RecordAttribute objects directly, though you
  may extend the class in any way that you like to create a custom attribute.

  A number of default RecordAttribute types are defined on the SC.Record.

  @extends SC.Object
  @see SC.Record
  @see SC.ManyAttribute
  @see SC.SingleAttribute
  @since SproutCore 1.0
*/
SC.RecordAttribute = SC.Object.extend(
  /** @scope SC.RecordAttribute.prototype */ {
  /**
    Walk like a duck.

    @type Boolean
    @default YES
  */
  isRecordAttribute: YES,

  /**
    The default value.  If attribute is `null` or `undefined`, this default
    value will be substituted instead.  Note that `defaultValue`s are not
    converted, so the value should be in the output type expected by the
    attribute.

    If you use a `defaultValue` function, the arguments given to it are the
    record instance and the key.

    @type Object|function
    @default null
  */
  defaultValue: null,

  /**
    The attribute type.  Must be either an object class or a property path
    naming a class.  The built in handler allows all native types to pass
    through, converts records to ids and dates to UTF strings.

    If you use the `attr()` helper method to create a RecordAttribute instance,
    it will set this property to the first parameter you pass.

    @type Object|String
    @default String
  */
  type: String,

  /**
    The underlying attribute key name this attribute should manage.  If this
    property is left empty, then the key will be whatever property name this
    attribute assigned to on the record.  If you need to provide some kind
    of alternate mapping, this provides you a way to override it.

    @type String
    @default null
  */
  key: null,

  /**
    If `YES`, then the attribute is required and will fail validation unless
    the property is set to a non-null or undefined value.

    @type Boolean
    @default NO
  */
  isRequired: NO,

  /**
    If `NO` then attempts to edit the attribute will be ignored.

    @type Boolean
    @default YES
  */
  isEditable: YES,

  /**
    If set when using the Date format, expect the ISO8601 date format.
    This is the default.

    @type Boolean
    @default YES
  */
  useIsoDate: YES,

  /**
    Can only be used for toOne or toMany relationship attributes. If YES,
    this flag will ensure that any related objects will also be marked
    dirty when this record dirtied.

    Useful when you might have multiple related objects that you want to
    consider in an 'aggregated' state. For instance, by changing a child
    object (image) you might also want to automatically mark the parent
    (album) dirty as well.

    @type Boolean
    @default NO
  */
  aggregate: NO,


  /**
    Can only be used for toOne or toMany relationship attributes. If YES,
    this flag will lazily create the related record that was pushed in
    from the data source (via pushRetrieve) if the related record does
    not exist yet.

    Useful when you have a record used as a join table. Assumptions then
    can be made that the record exists at all times (even if it doesn't).
    For instance, if you have a contact that is a member of groups,
    a group will be created automatically when a contact pushes a new
    group.

    Note that you will have to take care of destroying the created record
    once all relationships are removed from it.

    @type Boolean
    @default NO
   */
  lazilyInstantiate: NO,

  // ..........................................................
  // HELPER PROPERTIES
  //

  /**
    Returns the type, resolved to a class.  If the type property is a regular
    class, returns the type unchanged.  Otherwise attempts to lookup the
    type as a property path.

    @property
    @type Object
    @default String
  */
  typeClass: function() {
    var ret = this.get('type');
    if (SC.typeOf(ret) === SC.T_STRING) ret = SC.requiredObjectForPropertyPath(ret);
    return ret ;
  }.property('type').cacheable(),

  /**
    Finds the transform handler. Attempts to find a transform that you
    registered using registerTransform for this attribute's type, otherwise
    defaults to using the default transform for String.

    @property
    @type Transform
  */
  transform: function() {
    var klass      = this.get('typeClass') || String,
        transforms = SC.RecordAttribute.transforms,
        ret ;

    // walk up class hierarchy looking for a transform handler
    while(klass && !(ret = transforms[SC.guidFor(klass)])) {
      // check if super has create property to detect SC.Object's
      if(klass.superclass.hasOwnProperty('create')) klass = klass.superclass ;
      // otherwise return the function transform handler
      else klass = SC.T_FUNCTION ;
    }

    return ret ;
  }.property('typeClass').cacheable(),

  // ..........................................................
  // LOW-LEVEL METHODS
  //

  /**
    Converts the passed value into the core attribute value.  This will apply
    any format transforms.  You can install standard transforms by adding to
    the `SC.RecordAttribute.transforms` hash.  See
    SC.RecordAttribute.registerTransform() for more.

    @param {SC.Record} record The record instance
    @param {String} key The key used to access this attribute on the record
    @param {Object} value The property value before being transformed
    @returns {Object} The transformed value
  */
  toType: function(record, key, value) {
    var transform = this.get('transform'),
        type      = this.get('typeClass'),
        children;

    if (transform && transform.to) {
      value = transform.to(value, this, type, record, key) ;

      // if the transform needs to do something when its children change, we need to set up an observer for it
      if(!SC.none(value) && (children = transform.observesChildren)) {
        var i, len = children.length,
        // store the record, transform, and key so the observer knows where it was called from
        context = {
          record: record,
          key: key
        };

        for(i = 0; i < len; i++) value.addObserver(children[i], this, this._SCRA_childObserver, context);
      }
    }

    return value ;
  },

  /**
    @private

    Shared observer used by any attribute whose transform creates a seperate
    object that needs to write back to the datahash when it changes. For
    example, when enumerable content changes on a `SC.Set` attribute, it
    writes back automatically instead of forcing you to call `.set` manually.

    This functionality can be used by setting an array named
    observesChildren on your transform containing the names of keys to
    observe. When one of them triggers it will call childDidChange on your
    transform with the same arguments as to and from.

    @param {Object} obj The transformed value that is being observed
    @param {String} key The key used to access this attribute on the record
    @param {Object} prev Previous value (not used)
    @param {Object} context Hash of extra context information
  */
  _SCRA_childObserver: function(obj, key, prev, context) {
    // write the new value back to the record
    this.call(context.record, context.key, obj);

    // mark the attribute as dirty
    context.record.notifyPropertyChange(context.key);
  },

  /**
    Converts the passed value from the core attribute value.  This will apply
    any format transforms.  You can install standard transforms by adding to
    the `SC.RecordAttribute.transforms` hash.  See
    `SC.RecordAttribute.registerTransform()` for more.

    @param {SC.Record} record The record instance
    @param {String} key The key used to access this attribute on the record
    @param {Object} value The transformed value
    @returns {Object} The value converted back to attribute format
  */
  fromType: function(record, key, value) {
    var transform = this.get('transform'),
        type      = this.get('typeClass');

    if (transform && transform.from) {
      value = transform.from(value, this, type, record, key);
    }
    return value;
  },

  /**
    The core handler. Called when `get()` is called on the
    parent record, since `SC.RecordAttribute` uses `isProperty` to masquerade
    as a computed property. Get expects a property be a function, thus we
    need to implement call.

    @param {SC.Record} record The record instance
    @param {String} key The key used to access this attribute on the record
    @param {Object} value The property value if called as a setter
    @returns {Object} property value
  */
  call: function(record, key, value) {
    var attrKey = this.get('key') || key, nvalue;

    if ((value !== undefined) && this.get('isEditable')) {
      // careful: don't overwrite value here.  we want the return value to
      // cache.
      nvalue = this.fromType(record, key, value) ; // convert to attribute.
      record.writeAttribute(attrKey, nvalue);
    }

    value = record.readAttribute(attrKey);
    if (SC.none(value) && (value = this.get('defaultValue'))) {
       if (typeof value === SC.T_FUNCTION) {
        value = value(record, key, this);
      }
    }

    value = this.toType(record, key, value);

    return value ;
  },

  /**
    Apply needs to implemented for sc_super to work.

    @see SC.RecordAttribute#call
  */
  apply: function(target, args) {
    return this.call.apply(target, args);
  },

  // ..........................................................
  // INTERNAL SUPPORT
  //

  /** @private - Make this look like a property so that `get()` will call it. */
  isProperty: YES,

  /** @private - Make this look cacheable */
  isCacheable: YES,

  /** @private - needed for KVO `property()` support */
  dependentKeys: [],

  /** @private */
  init: function() {
    sc_super();
    // setup some internal properties needed for KVO - faking 'cacheable'
    this.cacheKey = "__cache__recattr__" + SC.guidFor(this) ;
    this.lastSetValueKey = "__lastValue__recattr__" + SC.guidFor(this) ;
  }
}) ;

// ..........................................................
// CLASS METHODS
//

SC.RecordAttribute.mixin(
  /** @scope SC.RecordAttribute.prototype */{
  /**
    The default method used to create a record attribute instance.  Unlike
    `create()`, takes an `attributeType` as the first parameter which will be
    set on the attribute itself.  You can pass a string naming a class or a
    class itself.

    @static
    @param {Object|String} attributeType the assumed attribute type
    @param {Hash} opts optional additional config options
    @returns {SC.RecordAttribute} new instance
  */
  attr: function(attributeType, opts) {
    if (!opts) opts = {} ;
    if (!opts.type) opts.type = attributeType || String ;
    return this.create(opts);
  },

  /** @private
    Hash of registered transforms by class guid.
  */
  transforms: {},

  /**
    Call to register a transform handler for a specific type of object.  The
    object you pass can be of any type as long as it responds to the following
    methods

     - `to(value, attr, klass, record, key)` converts the passed value
       (which will be of the class expected by the attribute) into the
       underlying attribute value
     - `from(value, attr, klass, record, key)` converts the underlying
       attribute value into a value of the class

    You can also provide an array of keys to observer on the return value.
    When any of these change, your from method will be called to write the
    changed object back to the record. For example:

        {
          to: function(value, attr, type, record, key) {
            if(value) return value.toSet();
            else return SC.Set.create();
          },

          from: function(value, attr, type, record, key) {
            return value.toArray();
          },

          observesChildren: ['[]']
        }

    @static
    @param {Object} klass the type of object you convert
    @param {Object} transform the transform object
    @returns {SC.RecordAttribute} receiver
  */
  registerTransform: function(klass, transform) {
    SC.RecordAttribute.transforms[SC.guidFor(klass)] = transform;
  }
});

// ..........................................................
// STANDARD ATTRIBUTE TRANSFORMS
//

// Object, String, Number just pass through.

/** @private - generic converter for Boolean records */
SC.RecordAttribute.registerTransform(Boolean, {
  /** @private - convert an arbitrary object value to a boolean */
  to: function(obj) {
    return SC.none(obj) ? null : !!obj;
  }
});

/** @private - generic converter for Numbers */
SC.RecordAttribute.registerTransform(Number, {
  /** @private - convert an arbitrary object value to a Number */
  to: function(obj) {
    return SC.none(obj) ? null : Number(obj) ;
  }
});

/** @private - generic converter for Strings */
SC.RecordAttribute.registerTransform(String, {
  /** @private -
    convert an arbitrary object value to a String
    allow null through as that will be checked separately
  */
  to: function(obj) {
    if (!(typeof obj === SC.T_STRING) && !SC.none(obj) && obj.toString) {
      obj = obj.toString();
    }
    return obj;
  }
});

/** @private - generic converter for Array */
SC.RecordAttribute.registerTransform(Array, {
  /** @private - check if obj is an array
  */
  to: function(obj) {
    if (!SC.isArray(obj) && !SC.none(obj)) {
      obj = [];
    }
    return obj;
  },

  observesChildren: ['[]']
});

/** @private - generic converter for Object */
SC.RecordAttribute.registerTransform(Object, {
  /** @private - check if obj is an object */
  to: function(obj) {
    if (!(typeof obj === 'object') && !SC.none(obj)) {
      obj = {};
    }
    return obj;
  }
});

/** @private - generic converter for SC.Record-type records */
SC.RecordAttribute.registerTransform(SC.Record, {

  /** @private - convert a record id to a record instance */
  to: function(id, attr, recordType, parentRecord) {
    var store = parentRecord.get('store');
    if (SC.none(id) || (id==="")) return null;
    else return store.find(recordType, id);
  },

  /** @private - convert a record instance to a record id */
  from: function(record) { return record ? record.get('id') : null; }
});

/** @private - generic converter for transforming computed record attributes */
SC.RecordAttribute.registerTransform(SC.T_FUNCTION, {

  /** @private - convert a record id to a record instance */
  to: function(id, attr, recordType, parentRecord) {
    recordType = recordType.apply(parentRecord);
    var store = parentRecord.get('store');
    return store.find(recordType, id);
  },

  /** @private - convert a record instance to a record id */
  from: function(record) { return record.get('id'); }
});

/** @private - generic converter for Date records */
SC.RecordAttribute.registerTransform(Date, {

  /** @private - convert a string to a Date */
  to: function(str, attr) {

    // If a null or undefined value is passed, don't
    // do any normalization.
    if (SC.none(str)) { return str; }

    var ret ;
    str = str.toString() || '';

    if (attr.get('useIsoDate')) {
      var regexp = "([0-9]{4})(-([0-9]{2})(-([0-9]{2})" +
             "(T([0-9]{2}):([0-9]{2})(:([0-9]{2})(\\.([0-9]+))?)?" +
             "(Z|(([-+])([0-9]{2}):([0-9]{2})))?)?)?)?",
          d      = str.match(new RegExp(regexp)),
          offset = 0,
          date   = new Date(d[1], 0, 1),
          time ;

      if (d[3]) { date.setMonth(d[3] - 1); }
      if (d[5]) { date.setDate(d[5]); }
      if (d[7]) { date.setHours(d[7]); }
      if (d[8]) { date.setMinutes(d[8]); }
      if (d[10]) { date.setSeconds(d[10]); }
      if (d[12]) { date.setMilliseconds(Number("0." + d[12]) * 1000); }
      if (d[14]) {
         offset = (Number(d[16]) * 60) + Number(d[17]);
         offset *= ((d[15] === '-') ? 1 : -1);
      }

      offset -= date.getTimezoneOffset();
      time = (Number(date) + (offset * 60 * 1000));

      ret = new Date();
      ret.setTime(Number(time));
    } else ret = new Date(Date.parse(str));
    return ret ;
  },

  _dates: {},

  /** @private - pad with leading zeroes */
  _zeropad: function(num) {
    return ((num<0) ? '-' : '') + ((num<10) ? '0' : '') + Math.abs(num);
  },

  /** @private - convert a date to a string */
  from: function(date) {

    if (SC.none(date)) { return null; }

    var ret = this._dates[date.getTime()];
    if (ret) return ret ;

    // figure timezone
    var zp = this._zeropad,
        tz = 0-date.getTimezoneOffset()/60;

    tz = (tz === 0) ? 'Z' : '%@:00'.fmt(zp(tz));

    this._dates[date.getTime()] = ret = "%@-%@-%@T%@:%@:%@%@".fmt(
      zp(date.getFullYear()),
      zp(date.getMonth()+1),
      zp(date.getDate()),
      zp(date.getHours()),
      zp(date.getMinutes()),
      zp(date.getSeconds()),
      tz) ;

    return ret ;
  }
});

if (SC.DateTime && !SC.RecordAttribute.transforms[SC.guidFor(SC.DateTime)]) {

  /**
    Registers a transform to allow `SC.DateTime` to be used as a record
    attribute, ie `SC.Record.attr(SC.DateTime);`
  */

  SC.RecordAttribute.registerTransform(SC.DateTime, {

    /** @private
      Convert a String to a DateTime
    */
    to: function(str, attr) {
      if (SC.none(str) || SC.instanceOf(str, SC.DateTime)) return str;
      if(attr.get('useUnixTime')) {
        if(SC.typeOf(str) === SC.T_STRING) { str = parseInt(str); }
        if(isNaN(str) || SC.typeOf(str) !== SC.T_NUMBER) { str = 0; }
        return SC.DateTime.create({ milliseconds: str*1000, timezone: 0 });
      }
      if (SC.instanceOf(str, Date)) return SC.DateTime.create(str.getTime());
      var format = attr.get('format');
      return SC.DateTime.parse(str, format ? format : SC.DateTime.recordFormat);
    },

    /** @private
      Convert a DateTime to a String
    */
    from: function(dt, attr) {
      if (SC.none(dt)) return dt;
      if (attr.get('useUnixTime')) {
        return dt.get('milliseconds')/1000;
      }
      var format = attr.get('format');
      return dt.toFormattedString(format ? format : SC.DateTime.recordFormat);
    }
  });

}

/**
  Parses a coreset represented as an array.
 */
SC.RecordAttribute.registerTransform(SC.Set, {
  to: function(value, attr, type, record, key) {
    return SC.Set.create(value);
  },

  from: function(value, attr, type, record, key) {
    return value.toArray();
  },

  observesChildren: ['[]']
});
