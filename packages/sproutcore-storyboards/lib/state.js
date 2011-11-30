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

  initChildState: function(state) {
    set(state, 'parentState', this);
  },

  storyboard: SC.computed(function() {
    var parent = get(this, 'parentState');
    if (!parent) { return; }

    if (parent.isStoryboard) { return parent; }
    else { return get(parent, 'storyboard'); }
  }).property('parentState').cacheable(),

  sheet: SC.computed(function() {
    var parent = get(this, 'parentState');
    if (!parent) { return; }

    if (parent.isSheet) { return parent; }
    else { return get(parent, 'sheet'); }
  }).property('parentState').cacheable(),

  goToState: function(state) {
    var storyboard = get(this, 'storyboard');
    sc_assert("a state must have an associated storyboard", !!storyboard);

    storyboard.goToState(state);
  },

  enter: SC.K,
  exit: SC.K
});
