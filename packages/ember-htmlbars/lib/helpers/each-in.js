if (Ember.FEATURES.isEnabled('ember-htmlbars-each-in')) {
  var shouldDisplay = function(object) {
    if (object === undefined || object === null) {
      return false;
    }

    return true;
  };

  var eachInHelper = function([ object ], hash, blocks) {
    if (shouldDisplay(object)) {
      for (var prop in object) {
        if (!object.hasOwnProperty(prop)) { continue; }
        blocks.template.yieldItem(prop, [prop, object[prop]]);
      }
    } else if (blocks.inverse.yield) {
      blocks.inverse.yield();
    }
  };
}

export default eachInHelper;
