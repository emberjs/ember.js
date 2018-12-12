import { moduleFor, RenderingTestCase } from '../../utils/test-case';
import { Checkbox, Component, LinkComponent, TextArea, TextField } from '@ember/-internals/glimmer';

moduleFor(
  'built-in component toString',
  class AbstractAppendTest extends RenderingTestCase {
    '@test text-field has the correct toString value'(assert) {
      assert.strictEqual(TextField.toString(), '@ember/component/text-field');
    }

    '@test checkbox has the correct toString value'(assert) {
      assert.strictEqual(Checkbox.toString(), '@ember/component/checkbox');
    }

    '@test text-area has the correct toString value'(assert) {
      assert.strictEqual(TextArea.toString(), '@ember/component/text-area');
    }

    '@test component has the correct toString value'(assert) {
      assert.strictEqual(Component.toString(), '@ember/component');
    }

    '@test LinkTo has the correct toString value'(assert) {
      assert.strictEqual(LinkComponent.toString(), '@ember/routing/link-component');
    }
  }
);
