require('ember-runtime/system/object');

var get = Ember.get,
    set = Ember.set,
    fmt = Ember.String.fmt,
    addBeforeObserver = Ember.addBeforeObserver,
    addObserver = Ember.addObserver,
    removeBeforeObserver = Ember.removeBeforeObserver,
    removeObserver = Ember.removeObserver,
    propertyWillChange = Ember.propertyWillChange,
    propertyDidChange = Ember.propertyDidChange;

function contentPropertyWillChange(content, contentKey) {
  var key = contentKey.slice(8); // remove "content."
  if (key in this) { return; }  // if shadowed in proxy
  propertyWillChange(this, key);
}

function contentPropertyDidChange(content, contentKey) {
  var key = contentKey.slice(8); // remove "content."
  if (key in this) { return; } // if shadowed in proxy
  propertyDidChange(this, key);
}

/**
  @class

  `Ember.ObjectProxy` forwards all properties not defined by the proxy itself
  to a proxied `content` object.

      object = Ember.Object.create({
        name: 'Foo'
      });
      proxy = Ember.ObjectProxy.create({
        content: object
      });

      // Access and change existing properties
      proxy.get('name') // => 'Foo'
      proxy.set('name', 'Bar');
      object.get('name') // => 'Bar'

      // Create new 'description' property on `object`
      proxy.set('description', 'Foo is a whizboo baz');
      object.get('description') // => 'Foo is a whizboo baz'

  While `content` is unset, setting a property to be delegated will throw an Error.

      proxy = Ember.ObjectProxy.create({
        content: null,
        flag: null
      });
      proxy.set('flag', true);
      proxy.get('flag'); // => true
      proxy.get('foo'); // => undefined
      proxy.set('foo', 'data'); // throws Error

  Delegated properties can be bound to and will change when content is updated.

  Computed properties on the proxy itself can depend on delegated properties.

      ProxyWithComputedProperty = Ember.ObjectProxy.extend({
        fullName: function () {
          var firstName = this.get('firstName'),
              lastName = this.get('lastName');
          if (firstName && lastName) {
            return firstName + ' ' + lastName;
          }
          return firstName || lastName;
        }.property('firstName', 'lastName')
      });
      proxy = ProxyWithComputedProperty.create();
      proxy.get('fullName'); => undefined
      proxy.set('content', {
        firstName: 'Tom', lastName: 'Dale'
      }); // triggers property change for fullName on proxy
      proxy.get('fullName'); => 'Tom Dale'
*/
Ember.ObjectProxy = Ember.Object.extend(
/** @scope Ember.ObjectProxy.prototype */ {
  /**
    The object whose properties will be forwarded.

    @type Ember.Object
    @default null
  */
  content: null,
  _contentDidChange: Ember.observer(function() {
    Ember.assert("Can't set ObjectProxy's content to itself", this.get('content') !== this);
  }, 'content'),
  /** @private */
  willWatchProperty: function (key) {
    var contentKey = 'content.' + key;
    addBeforeObserver(this, contentKey, null, contentPropertyWillChange);
    addObserver(this, contentKey, null, contentPropertyDidChange);
  },
  /** @private */
  didUnwatchProperty: function (key) {
    var contentKey = 'content.' + key;
    removeBeforeObserver(this, contentKey, null, contentPropertyWillChange);
    removeObserver(this, contentKey, null, contentPropertyDidChange);
  },
  /** @private */
  unknownProperty: function (key) {
    var content = get(this, 'content');
    if (content) {
      return get(content, key);
    }
  },
  /** @private */
  setUnknownProperty: function (key, value) {
    var content = get(this, 'content');
    Ember.assert(fmt("Cannot delegate set('%@', %@) to the 'content' property of object proxy %@: its 'content' is undefined.", [key, value, this]), content);
    return set(content, key, value);
  }
});
