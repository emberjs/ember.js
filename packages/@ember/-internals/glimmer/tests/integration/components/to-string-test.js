import { moduleFor, RenderingTestCase } from 'internal-test-helpers';

import { Component } from '@ember/-internals/glimmer';

moduleFor(
  'built-in component toString',
  class AbstractAppendTest extends RenderingTestCase {
    '@test component has the correct toString value'(assert) {
      assert.strictEqual(Component.toString(), '@ember/component');
    }
  }
);
