import { normalizeQueryParamConfig } from '../lib/utils';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'Routing query parameter utils - normalizeQueryParamConfig',
  class extends AbstractTestCase {
    ['@test converts array style into verbose object style'](assert) {
      let paramName = 'foo';
      let params = [paramName];
      let normalized = normalizeQueryParamConfig(params);

      assert.ok(normalized[paramName], 'turns the query param name into key');
      assert.equal(normalized[paramName].as, null, "includes a blank alias in 'as' key");
      assert.equal(normalized[paramName].scope, 'model', 'defaults scope to model');
    }

    ["@test converts object style [{foo: 'an_alias'}]"](assert) {
      let paramName = 'foo';
      let params = [{ foo: 'an_alias' }];
      let normalized = normalizeQueryParamConfig(params);

      assert.ok(normalized[paramName], 'retains the query param name as key');
      assert.equal(normalized[paramName].as, 'an_alias', "includes the provided alias in 'as' key");
      assert.equal(normalized[paramName].scope, 'model', 'defaults scope to model');
    }

    ["@test retains maximally verbose object style [{foo: {as: 'foo'}}]"](assert) {
      let paramName = 'foo';
      let params = [{ foo: { as: 'foo' } }];
      let normalized = normalizeQueryParamConfig(params);

      assert.ok(normalized[paramName], 'retains the query param name as key');
      assert.equal(normalized[paramName].as, 'foo', "includes the provided alias in 'as' key");
      assert.equal(normalized[paramName].scope, 'model', 'defaults scope to model');
    }

    ["@test converts object style { foo: { as: 'foo' } }"](assert) {
      let paramName = 'foo';
      let params = { foo: { as: 'foo' } };
      let normalized = normalizeQueryParamConfig(params);

      assert.ok(normalized[paramName], 'retains the query param name as key');
      assert.equal(normalized[paramName].as, 'foo', "includes the provided alias in 'as' key");
      assert.equal(normalized[paramName].scope, 'model', 'defaults scope to model');
    }

    ["@test converts object style { foo: 'foo' }"](assert) {
      let paramName = 'foo';
      let params = { foo: 'foo' };
      let normalized = normalizeQueryParamConfig(params);

      assert.ok(normalized[paramName], 'retains the query param name as key');
      assert.equal(normalized[paramName].as, 'foo', "includes the provided alias in 'as' key");
      assert.equal(normalized[paramName].scope, 'model', 'defaults scope to model');
    }
  }
);
