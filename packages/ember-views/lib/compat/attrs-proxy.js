import { get } from "ember-metal/property_get";
//import { set } from "ember-metal/property_set";
import { Mixin } from "ember-metal/mixin";
import { on } from "ember-metal/events";
import objectKeys from "ember-metal/keys";

export default Mixin.create({
  attrs: null,

  legacyDidReceiveAttrs: on('didReceiveAttrs', function() {
    var keys = objectKeys(this.attrs);

    for (var i=0, l=keys.length; i<l; i++) {
      this.notifyPropertyChange(keys[i]);
    }
  }),

  unknownProperty(key) {
    var attrs = get(this, 'attrs');

    if (attrs && key in attrs) {
      Ember.deprecate("You tried to look up an attribute directly on the component. This is deprecated. Use attrs." + key + " instead.");
      return get(attrs, key);
    }
  },

  setUnknownProperty(key) {

  }
});
