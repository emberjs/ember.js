/**
@module ember
@submodule ember-runtime
*/

var get = Ember.get, set = Ember.set, forEach = Ember.EnumerableUtils.forEach;

function throttledMeta(object, name, delay) {
  var meta = {name: name, target: object}, index;
  meta.delay = delay ? delay : 0;
  index = object._throttledPropertiesIndex = object._throttledPropertiesIndex || {};
  if (!index[name] && !meta.delay) {
    // if the delay is lower than 0 and we don't have such meta, just get outa here
    return meta;
  }
  meta = index[name] = index[name] || meta;
  meta.delay = Math.max(meta.delay || 0, 0);
  return meta;
}

function throttleSet() {
  var value = this.nextValue;
  delete this.nextValue;
  this.throttlerId = null;
  this.bypassThrottle = true;
  if (!this.target.isDestroyed && !this.target.isDestroying) {
    this.target.set(this.name, value);
  }
}

/**
  `Ember.ThrottleSetMixin` provides a way to delay the set of some properties
  on Ember objects.

  @class ThrottleSetMixin
  @namespace Ember
*/
Ember.ThrottleSetMixin = Ember.Mixin.create({

  /**
    Specifies which properties are delayed. Each element should be an object
    with 2 keys: `name` and `delay`; `name` being the name of the property
    to delay the set, and `delay` being the number of milliseconds for the
    throttle.

    ```javascript
    var MyClass = Ember.Object.extend(Ember.ThrottleSetMixin, {
      throttledProperties: [
        {name: 'myProperty', delay: 100},
        {name: 'myProperty2', delay: 150}
      ],
      myProperty: null,
      myProperty2: null
    });
    var myObject = MyClass.create();
    // will really set the property after 100ms without any change to that property
    myObject.set('myProperty', 'hello');
    ```

    @property {Array} throttledProperties
  */
  throttledProperties: null,

  /**
    Defines/update or removes a throttled property. If the delay is not given or 0,
    the property will act as a standard property, else it'll be transformed into a
    throttled property.

    @param {String} name   Name of the property
    @param {Number} delay  The delay in milliseconds after which the property will
                           be actually set (default to 0)
    @returns {Object|null} Meta information about the throttled property or null if removed
   */
  defineThrottledProperty: function(name, delay) {
    var meta = throttledMeta(name);
    delay = Math.max(delay || 0, 0);
    if (delay === 0) {
      // disable the throttled property
      if (meta.throttlerId) {
        // stops the throttler and set the value
        throttleSet.apply(meta);
        meta = null;
      }
      delete this._throttledPropertiesIndex[name];
    } else {
      // defines/update a throttled property setting
      meta = throttledMeta(name, delay);
    }
    return meta;
  },

  /**
    Cancel the possible incoming set on the given property if any.
    The property will still be a throttled one.

    @param {String} name
   */
  cancelThrottledProperty: function(name) {
    var meta = throttledMeta(name);
    if (meta.throttlerId) {
      Ember.run.cancel(meta.throttlerId);
      meta.throttlerId = null;
      delete meta.nextValue;
    }
  },

  /**
    Store an index on throttled properties

    @private
    @property {Object} _throttledPropertiesIndex
   */
  _throttledPropertiesIndex: null,

  /**
    Overrides the set to handle throttled properties

    @inheritDoc
    @param key
    @param value
   */
  set: function(key, value) {
    var meta;
    if (key.indexOf('.') === -1) {
      // only try to handle the throttled feature if it's a direct property
      meta = throttledMeta(this, key);
      if (meta.delay !== 0) {
        // only handles it if there is some delay
        if (meta.bypassThrottle) {
          // if we're asked to bypass the throttle, un-flag it
          meta.bypassThrottle = false;
        } else {
          // update the next value and (re)start the throttle
          meta.nextValue = value;
          meta.throttlerId = Ember.run.throttle(meta, throttleSet, meta.delay);
          // exit, we don't want the property to be set
          return;
        }
      }
    }
    return this._super(key, value);
  },


  /**
    Read the configuration fo throttled properties from the `throttledProperties` property.
   */
  init: function() {
    var props, that, meta, that = this;
    this._super.apply(this, arguments);

    if ((props = get(this, 'throttledProperties'))) {
      that = this;
      forEach(props, function(prop) {
        meta = throttledMeta(that, prop.name, prop.delay);
        if (meta.delay && (meta.nextValue = get(that, prop.name)) !== undefined) {
          meta.bypassThrottle = true;
          that.set(prop.name, undefined);
          meta.throttlerId = Ember.run.throttle(meta, throttleSet, meta.delay);
        }
      });
    }
  },

  /**
    Removes future values and stops throttlers
   */
  destroy: function() {
    var id, meta, key, index = this._throttledPropertiesIndex;
    if (index) {
      for (key in index) {
        if (!index.hasOwnProperty(key)) {
          continue;
        }
        meta = index[key];
        if ((id = meta.throttlerId)) {
          Ember.run.cancel(id);
        }
      }
    }

    return this._super();
  }
});
