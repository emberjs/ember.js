var get = SC.get, set = SC.set;

SC.State = SC.Object.extend({
  isState: true,
  parentState: null,
  start: null,

  init: function() {
    SC.keys(this).forEach(function(name) {
      var value = this[name];

      if (value && value.isState) {
        set(value, 'parentState', this);
        set(value, 'name', (get(this, 'name') || '') + '.' + name);
      }
    }, this);
  },

  enter: SC.K,
  exit: SC.K
});
