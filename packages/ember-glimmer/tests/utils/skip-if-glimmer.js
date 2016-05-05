import isEnabled from 'ember-metal/features';

export function test(name, fn) {
  if (isEnabled('ember-glimmer')) {
    QUnit.skip('[GLIMMER] ' + name, fn);
  } else {
    QUnit.test(name, fn);
  }
}

export function testModule(name, setup) {
  if (!isEnabled('ember-glimmer')) {
    QUnit.module(name, setup);
  }
}

export function asyncTest(name, fn) {
  if (isEnabled('ember-glimmer')) {
    QUnit.skip('[GLIMMER] ' + name, fn);
  } else {
    QUnit.asyncTest(name, fn);
  }
}
