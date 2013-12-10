/**
@module ember
@submodule ember-runtime
*/

var get = Ember.get, set = Ember.set, addBeforeObserver = Ember.addBeforeObserver;

/**
  The `Ember.Trackable` mixin allows you to track the previous property values on an object.

  ## Example Usage

  The example below shows a simple object that implement the `Ember.Trackable`
  protocol.

  ```javascript
  Contact = Ember.Object.extend(Ember.Trackable, {
    //specify an array of properties you wish to track
    trackableProperties: ['name']
  });

  c = Contact.create({ name: 'Tom' });
  c.set('name', 'Yehuda');
  c.set('name', 'Steve');
  c.get('name') // returns 'Steve'
  c.getPrevious('name') // returns 'Yehuda'
  c.getFirst('name') // returns 'Tom'
  c.getFirst('name') // returns ['Tom', 'Yehuda']
  ```

  @class Trackable
  @namespace Ember
*/
Ember.Trackable = Ember.Mixin.create({

  trackedProperties: [],

  init: function() {
    var self = this;

    get(self, 'trackedProperties').forEach(function(key) {
      set(self, key+'History', Ember.A());
      addBeforeObserver(self, key, self, '_updateHistory');
    });

    this._super();
  },

  getPrevious: function(key) {
    return get(this, key+'History').get('lastObject');
  },
  
  getFirst: function(key) {
    return this.getHistory(key).get('firstObject');
  },

  getHistory: function(key) {
    return get(this, key+'History');
  },

  _updateHistory: function(sender, key) {
    this.getHistory(key).pushObject(get(this, key));
  }

});