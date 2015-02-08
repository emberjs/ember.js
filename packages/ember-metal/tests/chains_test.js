import { addObserver } from "ember-metal/observer";
import { finishChains } from "ember-metal/chains";
import create from 'ember-metal/platform/create';

QUnit.module("Chains");

QUnit.test("finishChains should properly copy chains from prototypes to instances", function() {
  function didChange() {}

  var obj = {};
  addObserver(obj, 'foo.bar', null, didChange);

  var childObj = create(obj);
  finishChains(childObj);

  ok(obj['__ember_meta__'].chains !== childObj['__ember_meta__'].chains, "The chains object is copied");
});
