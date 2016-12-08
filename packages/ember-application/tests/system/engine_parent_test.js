import {
  getEngineParent,
  setEngineParent,
  ENGINE_PARENT
} from '../../system/engine-parent';

QUnit.module('EngineParent', {});

QUnit.test('An engine\'s parent can be set with `setEngineParent` and retrieved with `getEngineParent`', function() {
  let engine = {};
  let parent = {};

  strictEqual(getEngineParent(engine), undefined, 'parent has not been set');

  setEngineParent(engine, parent);

  strictEqual(getEngineParent(engine), parent, 'parent has been set');

  strictEqual(engine[ENGINE_PARENT], parent, 'parent has been set to the ENGINE_PARENT symbol');
});
