import {
  normalizeControllerQueryParams
} from 'ember-routing/utils';


QUnit.module('Routing query parameter utils - normalizeControllerQueryParams');

QUnit.test('returns the cached value if that has been previously set', function(assert) {
  let cached = {};
  let params = ['foo'];
  params._qpMap = cached;

  let normalized = normalizeControllerQueryParams(params);
  equal(cached, normalized, 'cached value returned if previously set');
});

QUnit.test('converts array style into verbose object style', function(assert) {
  let paramName = 'foo';
  let params = [paramName];
  let normalized = normalizeControllerQueryParams(params);

  ok(normalized[paramName], 'turns the query param name into key');
  equal(normalized[paramName].as, null, 'includes a blank alias in \'as\' key');
  equal(normalized[paramName].scope, 'model', 'defaults scope to model');
});

QUnit.test('converts object stlye [{foo: \'an_alias\'}]', function(assert) {
  let paramName = 'foo';
  let params = [{ 'foo': 'an_alias' }];
  let normalized = normalizeControllerQueryParams(params);

  ok(normalized[paramName], 'retains the query param name as key');
  equal(normalized[paramName].as, 'an_alias', 'includes the provided alias in \'as\' key');
  equal(normalized[paramName].scope, 'model', 'defaults scope to model');
});

QUnit.test('retains maximally verbose object stlye [{foo: {as: \'foo\'}}]', function(assert) {
  let paramName = 'foo';
  let params = [{ 'foo': { as: 'an_alias' } }];
  let normalized = normalizeControllerQueryParams(params);

  ok(normalized[paramName], 'retains the query param name as key');
  equal(normalized[paramName].as, 'an_alias', 'includes the provided alias in \'as\' key');
  equal(normalized[paramName].scope, 'model', 'defaults scope to model');
});
