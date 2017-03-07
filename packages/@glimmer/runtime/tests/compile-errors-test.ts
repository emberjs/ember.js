import { TestEnvironment } from "@glimmer/test-helpers";

let env: TestEnvironment;

QUnit.module("Compile errors", {
  beforeEach() {
    env = new TestEnvironment();
  }
});

QUnit.test('context switching using ../ is not allowed', assert => {
  assert.throws(() => {
    env.compile('<div><p>{{../value}}</p></div>');
  }, new Error("Changing context using \"../\" is not supported in Glimmer: \"../value\" on line 1."));
});

QUnit.test('mixing . and / is not allowed', assert => {
  assert.throws(() => {
    env.compile('<div><p>{{a/b.c}}</p></div>');
  }, new Error("Mixing '.' and '/' in paths is not supported in Glimmer; use only '.' to separate property paths: \"a/b.c\" on line 1."));
});

QUnit.test('explicit self ref with ./ is not allowed', assert => {
  assert.throws(() => {
    env.compile('<div><p>{{./value}}</p></div>');
  }, new Error("Using \"./\" is not supported in Glimmer and unnecessary: \"./value\" on line 1."), "should throw error");
});

QUnit.test('helper invocation with dot-paths are not allowed', assert => {
  assert.throws(() => {
    env.compile('{{foo.bar some="args"}}');
  }, new Error("`foo.bar` is not a valid name for a helper on line 1."), "should throw error");
});

QUnit.test('sub-expression helper invocation with dot-paths are not allowed', assert => {
  assert.throws(() => {
    env.compile('{{log (foo.bar some="args")}}');
  }, new Error("`foo.bar` is not a valid name for a helper on line 1."), "should throw error");
});

QUnit.test('sub-expression modifier invocation with dot-paths are not allowed', assert => {
  assert.throws(() => {
    env.compile('<div {{foo.bar some="args"}} />');
  }, new Error("`foo.bar` is not a valid name for a modifier on line 1."), "should throw error");
});
