import shouldDisplay from 'ember-views/streams/should_display';
import { defineProperty } from 'ember-metal/properties';
import computed from 'ember-metal/computed';

QUnit.module('shouldDisplay');

QUnit.test('predicate permutations', function() {
  equal(shouldDisplay(0), false, 'shouldDisplay(0)');
  equal(shouldDisplay(-1), true, 'shouldDisplay(-1)');
  equal(shouldDisplay(1), true, 'shouldDisplay(1)');
  equal(shouldDisplay(Number(1)), true, 'shouldDisplay(Number(1))');
  equal(shouldDisplay(Number(0)), false, 'shouldDisplay(Number(0))');
  equal(shouldDisplay(Number(-1)), true, 'shouldDisplay(Number(-1))');
  equal(shouldDisplay(Boolean(true)), true, 'shouldDisplay(Boolean(true))');
  equal(shouldDisplay(Boolean(false)), false, 'shouldDisplay(Boolean(false))');
  equal(shouldDisplay(NaN), false, 'shouldDisplay(NaN)');
  equal(shouldDisplay('string'), true, 'shouldDisplay("string")');
  equal(shouldDisplay(String('string')), true, 'shouldDisplay(String("string"))');
  equal(shouldDisplay(Infinity), true, 'shouldDisplay(Infinity)');
  equal(shouldDisplay(-Infinity), true, 'shouldDisplay(-Infinity)');
  equal(shouldDisplay([]), false, 'shouldDisplay([])');
  equal(shouldDisplay([1]), true, 'shouldDisplay([1])');
  equal(shouldDisplay({}), true, 'shouldDisplay({})');
  equal(shouldDisplay(true), true, 'shouldDisplay(true)');
  equal(shouldDisplay(false), false, 'shouldDisplay(false)');
  equal(shouldDisplay({ isTruthy: true }), true, 'shouldDisplay({ isTruthy: true })');
  equal(shouldDisplay({ isTruthy: false }), false, 'shouldDisplay({ isTruthy: false })');

  equal(shouldDisplay(function foo() {}), true, 'shouldDisplay(function (){})');

  function falseFunction() { }
  falseFunction.isTruthy = false;

  equal(shouldDisplay(falseFunction), true, 'shouldDisplay(function.isTruthy = false)');

  function trueFunction() { }
  falseFunction.isTruthy = true;
  equal(shouldDisplay(trueFunction), true, 'shouldDisplay(function.isTruthy = true)');

  var truthyObj = { };
  defineProperty(truthyObj, 'isTruthy', computed(() => true));
  equal(shouldDisplay(truthyObj), true, 'shouldDisplay(obj.get("isTruthy") === true)');

  var falseyObj = { };
  defineProperty(falseyObj, 'isTruthy', computed(() => false));
  equal(shouldDisplay(falseyObj), false, 'shouldDisplay(obj.get("isFalsey") === false)');

  var falsyArray = [1];
  falsyArray.isTruthy = false;
  equal(shouldDisplay(falsyArray), false, '[1].isTruthy = false');

  var falseyCPArray = [1];
  defineProperty(falseyCPArray, 'isTruthy', computed(() => false));
  equal(shouldDisplay(falseyCPArray), false, 'shouldDisplay([1].get("isFalsey") === true');
});
