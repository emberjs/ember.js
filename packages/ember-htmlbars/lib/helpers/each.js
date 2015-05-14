import { get } from "ember-metal/property_get";
import { forEach } from "ember-metal/enumerable_utils";
import normalizeSelf from "ember-htmlbars/utils/normalize-self";
import shouldDisplay from "ember-views/streams/should_display";

export default function eachHelper(params, hash, blocks) {
  var list = params[0];
  var keyPath = hash.key;

  if (shouldDisplay(list)) {
    forEach(list, function(item, i) {
      var self;
      if (blocks.template.arity === 0) {
        Ember.deprecate(deprecation);
        self = normalizeSelf(item);
      }

      var key = keyPath ? get(item, keyPath) : String(i);
      blocks.template.yieldItem(key, [item, i], self);
    });
  } else if (blocks.inverse.yield) {
    blocks.inverse.yield();
  }
}

export var deprecation = "Using the context switching form of {{each}} is deprecated. Please use the keyword form (`{{#each items as |item|}}`) instead.";
