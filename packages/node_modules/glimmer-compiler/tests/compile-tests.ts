import { compile } from "glimmer-test-helpers";
import { TestEnvironment } from "glimmer-test-helpers";

let env: TestEnvironment;

QUnit.module('compile: buildMeta', {
  setup() {
    env = new TestEnvironment();
  }
});

QUnit.skip('is merged into meta in template', function() {
  let template = compile('Hi, {{name}}!', {
    env,
    buildMeta: function() {
      return { blah: 'zorz' };
    }
  });

  equal(template.meta['blah'], 'zorz', 'return value from buildMeta was pass through');
});

QUnit.skip('the program is passed to the callback function', function() {
  let template = compile('Hi, {{name}}!', {
    env,
    buildMeta: function(program) {
      return { loc: program.loc };
    }
  });

  equal(template.meta['loc'].start.line, 1, 'the loc was passed through from program');
});

QUnit.skip('value keys are properly stringified', function() {
  let template = compile('Hi, {{name}}!', {
    env,
    buildMeta: function() {
      return { 'loc-derp.lol': 'zorz' };
    }
  });

  equal(template.meta['loc-derp.lol'], 'zorz', 'return value from buildMeta was pass through');
});

QUnit.skip('returning undefined does not throw errors', function () {
  let template = compile('Hi, {{name}}!', {
    env,
    buildMeta: function() {
      return;
    }
  });

  ok(template.meta, 'meta is present in template, even if empty');
});

QUnit.skip('options are not required for `compile`', function () {
  let template = compile('Hi, {{name}}!', { env });

  ok(template.meta, 'meta is present in template, even if empty');
});
