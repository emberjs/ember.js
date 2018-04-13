import { getEngineParent, setEngineParent } from '@ember/engine';
import { moduleFor, AbstractTestCase as TestCase } from 'internal-test-helpers';

moduleFor(
  'EngineParent',
  class extends TestCase {
    ["@test An engine's parent can be set with `setEngineParent` and retrieved with `getEngineParent`"](
      assert
    ) {
      let engine = {};
      let parent = {};

      assert.strictEqual(getEngineParent(engine), undefined, 'parent has not been set');

      setEngineParent(engine, parent);

      assert.strictEqual(getEngineParent(engine), parent, 'parent has been set');
    }
  }
);
