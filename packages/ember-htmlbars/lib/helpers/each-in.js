if (Ember.FEATURES.isEnabled('ember-htmlbars-each-in')) {
  var eachInHelper = function([ object ]) {
    for (var prop in object) {
      if (!object.hasOwnProperty(prop)) { continue; }
      this.yieldItem(prop, [prop, object[prop]]);
    }
  };
}

export default eachInHelper;
