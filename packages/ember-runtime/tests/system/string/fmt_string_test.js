import { ENV } from 'ember-environment';
import { fmt } from '../../../system/string';

QUnit.module('EmberStringUtils.fmt');

if (!ENV.EXTEND_PROTOTYPES.String) {
  QUnit.test('String.prototype.fmt is not modified without EXTEND_PROTOTYPES', function() {
    ok('undefined' === typeof String.prototype.fmt, 'String.prototype helper disabled');
  });
}

function test(given, args, expected, description) {
  QUnit.test(description, function() {
    expectDeprecation('Ember.String.fmt is deprecated, use ES6 template strings instead.');
    equal(fmt(given, args), expected);
    if (ENV.EXTEND_PROTOTYPES.String) {
      equal(given.fmt(...args), expected);
    }
  });
}

test('Hello %@ %@',   ['John', 'Doe'],  'Hello John Doe', `fmt('Hello %@ %@', ['John', 'Doe']) => 'Hello John Doe'`);
test('Hello %@2 %@1', ['John', 'Doe'],  'Hello Doe John', `fmt('Hello %@2 %@1', ['John', 'Doe']) => 'Hello Doe John'`);
test(
  '%@08 %@07 %@06 %@05 %@04 %@03 %@02 %@01',
  ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight'],
 'Eight Seven Six Five Four Three Two One',
  `fmt('%@08 %@07 %@06 %@05 %@04 %@03 %@02 %@01', ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight']) => 'Eight Seven Six Five Four Three Two One'`
);
test('data: %@', [{ id: 3 }],  'data: {id: 3}', `fmt('data: %@', [{ id: 3 }]) => 'data: {id: 3}'`);

QUnit.test('works with argument form', function() {
  expectDeprecation('Ember.String.fmt is deprecated, use ES6 template strings instead.');
  equal(fmt('%@', 'John'), 'John');
  equal(fmt('%@ %@', ['John'], 'Doe'), '[John] Doe');
});
