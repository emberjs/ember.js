import { ENV } from 'ember-environment';
import { fmt } from '../../../system/string';

QUnit.module('EmberStringUtils.fmt');

if (!ENV.EXTEND_PROTOTYPES.String) {
  QUnit.test('String.prototype.fmt is not modified without EXTEND_PROTOTYPES', function() {
    ok('undefined' === typeof String.prototype.fmt, 'String.prototype helper disabled');
  });
}

QUnit.test('\'Hello %@ %@\'.fmt(\'John\', \'Doe\') => \'Hello John Doe\'', function() {
  expectDeprecation('Ember.String.fmt is deprecated, use ES6 template strings instead.');
  equal(fmt('Hello %@ %@', ['John', 'Doe']), 'Hello John Doe');
  if (ENV.EXTEND_PROTOTYPES.String) {
    equal('Hello %@ %@'.fmt('John', 'Doe'), 'Hello John Doe');
  }
});

QUnit.test('\'Hello %@2 %@1\'.fmt(\'John\', \'Doe\') => \'Hello Doe John\'', function() {
  expectDeprecation('Ember.String.fmt is deprecated, use ES6 template strings instead.');
  equal(fmt('Hello %@2 %@1', ['John', 'Doe']), 'Hello Doe John');
  if (ENV.EXTEND_PROTOTYPES.String) {
    equal('Hello %@2 %@1'.fmt('John', 'Doe'), 'Hello Doe John');
  }
});

QUnit.test('\'%@08 %@07 %@06 %@05 %@04 %@03 %@02 %@01\'.fmt(\'One\', \'Two\', \'Three\', \'Four\', \'Five\', \'Six\', \'Seven\', \'Eight\') => \'Eight Seven Six Five Four Three Two One\'', function() {
  expectDeprecation('Ember.String.fmt is deprecated, use ES6 template strings instead.');
  equal(fmt('%@08 %@07 %@06 %@05 %@04 %@03 %@02 %@01', ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight']), 'Eight Seven Six Five Four Three Two One');

  if (ENV.EXTEND_PROTOTYPES.String) {
    equal('%@08 %@07 %@06 %@05 %@04 %@03 %@02 %@01'.fmt('One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight'), 'Eight Seven Six Five Four Three Two One');
  }
});

QUnit.test('\'data: %@\'.fmt({ id: 3 }) => \'data: {id: 3}\'', function() {
  expectDeprecation('Ember.String.fmt is deprecated, use ES6 template strings instead.');
  equal(fmt('data: %@', [{ id: 3 }]), 'data: {id: 3}');
  if (ENV.EXTEND_PROTOTYPES.String) {
    equal('data: %@'.fmt({ id: 3 }), 'data: {id: 3}');
  }
});

QUnit.test('works with argument form', function() {
  expectDeprecation('Ember.String.fmt is deprecated, use ES6 template strings instead.');
  equal(fmt('%@', 'John'), 'John');
  equal(fmt('%@ %@', ['John'], 'Doe'), '[John] Doe');
});
