import isPresent from 'ember-metal/is_present';
var presence;

if (Ember.FEATURES.isEnabled('ember-metal-presence')) {
  presence = function(obj) {
    if ( isPresent(obj) ) { return obj; }
  };
}

export default presence;
