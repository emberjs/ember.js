import { deprecate } from 'ember-metal/debug';
import { get } from 'ember-metal/property_get';
import normalizeSelf from 'ember-htmlbars/utils/normalize-self';
import decodeEachKey from 'ember-htmlbars/utils/decode-each-key';

export default function legacyEachWithControllerHelper(params, hash, blocks) {
  var list = params[0];
  var keyPath = hash.key;

  // TODO: Correct falsy semantics
  if (!list || get(list, 'length') === 0) {
    if (blocks.inverse.yield) { blocks.inverse.yield(); }
    return;
  }

  list.forEach(function(item, i) {
    var self;

    if (blocks.template.arity === 0) {
      deprecate(deprecation, false, { id: 'ember-htmlbars.each-with-controller-helper', until: '2.4.0' });
      self = normalizeSelf(item);
      self = bindController(self, true);
    }

    var key = decodeEachKey(item, keyPath, i);
    blocks.template.yieldItem(key, [item, i], self);
  });
}

function bindController(controller, isSelf) {
  return {
    controller: controller,
    hasBoundController: true,
    self: controller ? controller : undefined
  };
}

export var deprecation = 'Using the context switching form of {{each}} is deprecated. Please use the keyword form (`{{#each items as |item|}}`) instead.';
