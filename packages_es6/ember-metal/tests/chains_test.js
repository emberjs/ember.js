import {META_KEY} from 'ember-metal/utils';
import {addObserver} from "ember-metal/observer";
import {finishChains} from "ember-metal/chains";
import {create} from 'ember-metal/platform';

module("Chains");

test("finishChains should properly copy chains from prototypes to instances", function() {
  function didChange() {}

  var obj = {};
  addObserver(obj, 'foo.bar', null, didChange);

  var childObj = create(obj);
  finishChains(childObj);

  ok(obj[META_KEY].chains !== childObj[META_KEY].chains, "The chains object is copied");
});
