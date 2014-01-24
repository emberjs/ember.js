/**
@module ember
@submodule ember-runtime
*/

var get = Ember.get, set = Ember.set, forEach = Ember.EnumerableUtils.forEach;


var delayedType = function(type) {
  type = type || 'debounce';
  Ember.assert("A delayed property type must be 'throttle' or 'debounce', '" + type + "' given.",
      type === 'throttle' || type === 'debounce');
  return type;
};

function DelayedSetPropertyMeta(options) {
  this.type = delayedType(options.type);
  this.target = options.target;
  this.name = options.name;
  this.timerId = null;
  this.delay = options.delay || 0;
  this.forceSet = false;
}
Ember.merge(DelayedSetPropertyMeta.prototype, {
  doSet: function() {
    var value = this.nextValue;
    delete this.nextValue;
    this.timerId = null;
    this.forceSet = true;
    if (this.target && !this.target.isDestroyed && !this.target.isDestroying) {
      this.target.set(this.name, value);
    }
  },
  cancel: function(apply) {
    if (this.timerId) {
      Ember.run.cancel(this.timerId);
      if (apply) {
        this.doSet();
      } else {
        this.timerId = null;
        delete this.nextValue;
      }
    }
  },
  destroy: function() {
    this.cancel();
    this.target = null;
    if (Object.freeze) Object.freeze(this);
  },
  start: function() {
    this.timerId = Ember.run.later(this, 'doSet', this.delay);
  }
});

var metaFactory = function(object, name, delay, type) {
  var meta = {name: name, target: object, type: type}, index;
  meta.delay = Math.max(delay ? delay : 0, 0);
  index = object._delayedPropertiesIndex = object._delayedPropertiesIndex || {};
  if (!index[name]) {
    if (!meta.delay) {
      // if the delay is lower than 0 and we don't have such meta, just get outa here
      return meta;
    }
    index[name] = meta = new DelayedSetPropertyMeta(meta);
  }
  meta.delay = Math.max(meta.delay, 0);
  meta.type = delayedType(type);
  return meta;
};

var findMeta = function(object, name) {
  var index, meta;
  if ((index = object._delayedPropertiesIndex) && (meta = index[name])) {
    return meta;
  }
  return undefined;
};

/**
  `Ember.DelayedSetMixin` provides a way to delay the set of some properties
  on Ember objects by throttle or debounce.

  The delayed properties can be defined on object creation or class definition
  using the `delayedProperties` property, in which case the delayed properties
  will not be set on the object on creation until the delay is passed.
  They can also be defined/updated/disabled afterward using the
  `defineDelayedProperty` method.

  Example:
  ```javascript
  var obj = Ember.Object.createWithMixins(Ember.DelayedSetMixin, {
    delayedProperties: [
      {name: 'myProperty', delay: 500}, // `type` is optional as 'debounce' is the default
      {name: 'myOtherProperty', delay: 500, type: 'throttle'}
    ],
    myProperty: 'someValue',
    myOtherProperty: 'welcome!'
  });
  obj.get('myProperty'); // will output `undefined`
  // after 1/2 second or more:
  obj.get('myProperty'); // will output "someValue"
  obj.set('myProperty', 'hello');
  obj.get('myProperty'); // will output "someValue"
  // after 1/2 second or more:
  obj.get('myProperty'); // will output "hello"
  ```

  @class DelayedSetMixin
  @namespace Ember
*/
Ember.DelayedSetMixin = Ember.Mixin.create({

  /**
    Specifies which properties are delayed. Each element should be an object
    with 2 or 3 keys: `name` and `delay`; `name` being the name of the property
    to delay the set, and `delay` being the number of milliseconds for the
    delay. The 3rd property is optional and defines the method to delay the set.
    By default, 'debounce' is used, but 'throttle' can be used too.

    ```javascript
    var MyClass = Ember.Object.extend(Ember.DelayedSetMixin, {
      delayedProperties: [
        {name: 'myProperty', delay: 100},
        {name: 'myProperty2', delay: 150, 'type: 'throttle'}
      ],
      myProperty: null,
      myProperty2: null
    });
    var myObject = MyClass.create();
    // will really set the property after 100ms without any change to that property
    myObject.set('myProperty', 'hello');
    ```

    @property {Array} delayedProperties
  */
  delayedProperties: null,

  /**
    Defines/update or removes a delayed property. If the delay is not given or 0,
    the property will act as a standard property, else it'll be transformed into a
    delayed property.

    @param {String} name   Name of the property
    @param {Number} delay  The delay in milliseconds after which the property will
                           be actually set (default to 0)
    @param {String} type   The type of delay, default to 'debounce'. Value can be 'debounce'
                           or 'throttle'
    @returns {Object|null} Meta information about the delayed property or null if removed
   */
  defineDelayedProperty: function(name, delay, type) {
    var meta = metaFactory(this, name, delay, type);
    if (meta.delay === 0) {
      // disable the throttled property applying possible waiting value
      if (meta instanceof DelayedSetPropertyMeta) {
        meta.cancel(true);
        meta.destroy();
      }
      delete this._delayedPropertiesIndex[name];
      meta = null;
    }
    return meta;
  },

  /**
    Cancel the possible incoming set on the given property if any.
    The property will still be a delayed one.

    @param {String}  name  Name of the delayed property to cancel
    @param {Boolean} apply If true, the possible waiting value will be immediately set
   */
  cancelDelayedProperty: function(name, apply) {
    var meta = findMeta(this, name);
    if (meta) meta.cancel(apply);
  },

  /**
    Store an index on delayed properties

    @private
    @property {Object} _delayedPropertiesIndex
   */
  _delayedPropertiesIndex: null,

  /**
    Overrides the set to handle delayed properties

    @inheritDoc
    @param key
    @param value
   */
  set: function(key, value) {
    var meta;
    if (key.indexOf('.') === -1) {
      // only try to handle the throttled feature if it's a direct property
      meta = findMeta(this, key);
      if (meta && meta.delay !== 0) {
        // only handles it if there is some delay
        if (meta.forceSet) {
          // if we're asked to bypass the throttle, un-flag it
          meta.forceSet = false;
        } else {
          // update the next value and (re)start the throttle
          meta.nextValue = value;
          if (meta.timerId) {
            if (meta.type === 'debounce') {
              // restart the timer if we're debouncing
              Ember.run.cancel(meta.timerId);
              meta.start();
            }
          } else {
            meta.start();
          }
          // exit, we don't want the property to be set
          return;
        }
      }
    }
    return this._super(key, value);
  },


  /**
    Read the configuration of delayed properties from the `delayedProperties` property.
   */
  init: function() {
    var props, meta, that = this;
    this._super.apply(this, arguments);

    if ((props = get(this, 'delayedProperties'))) {
      that = this;
      forEach(props, function(prop) {
        meta = metaFactory(that, prop.name, prop.delay, prop.type);
        if (meta.delay && (meta.nextValue = get(that, prop.name)) !== undefined) {
          meta.forceSet = true;
          that.set(prop.name, undefined);
          meta.start();
        }
      });
    }
  },

  /**
    Removes future values and stops timers
   */
  destroy: function() {
    var id, meta, key, index = this._delayedPropertiesIndex;
    if (index) {
      for (key in index) {
        if (!index.hasOwnProperty(key)) {
          continue;
        }
        index[key].destroy();
      }
      delete this._delayedPropertiesIndex;
    }

    return this._super();
  }
});
