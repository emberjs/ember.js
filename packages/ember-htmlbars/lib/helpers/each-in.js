import isEnabled from 'ember-metal/features';
import keys from 'ember-metal/keys';
import shouldDisplay from 'ember-views/streams/should_display';

if (isEnabled('ember-htmlbars-each-in')) {
  var eachInHelper = function([ object ], hash, blocks) {
    var objKeys, prop, i;
    objKeys = object ? keys(object) : [];
    if (shouldDisplay(objKeys)) {
      for (i = 0; i < objKeys.length; i++) {
        prop = objKeys[i];
        blocks.template.yieldItem(prop, [prop, object[prop]]);
      }
    } else if (blocks.inverse.yield) {
      blocks.inverse.yield();
    }
  };
}

export default eachInHelper;
