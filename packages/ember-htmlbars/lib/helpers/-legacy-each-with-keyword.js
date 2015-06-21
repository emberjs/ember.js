import shouldDisplay from 'ember-views/streams/should_display';
import decodeEachKey from 'ember-htmlbars/utils/decode-each-key';

export default function legacyEachWithKeywordHelper(params, hash, blocks) {
  var list = params[0];
  var keyPath = hash.key;
  var legacyKeyword = hash['-legacy-keyword'];

  if (shouldDisplay(list)) {
    list.forEach(function(item, i) {
      var self;
      if (legacyKeyword) {
        self = bindKeyword(self, legacyKeyword, item);
      }

      var key = decodeEachKey(item, keyPath, i);
      blocks.template.yieldItem(key, [item, i], self);
    });
  } else if (blocks.inverse.yield) {
    blocks.inverse.yield();
  }
}

function bindKeyword(self, keyword, item) {
  return {
    self,
    [keyword]: item
  };
}

export var deprecation = 'Using the context switching form of {{each}} is deprecated. Please use the keyword form (`{{#each items as |item|}}`) instead.';
