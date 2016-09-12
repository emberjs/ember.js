import { assign } from 'ember-utils';
import { set } from 'ember-metal';
import { TextArea } from '../../utils/helpers';
import { RenderingTest, moduleFor } from '../../utils/test-case';
import { classes } from '../../utils/test-helpers';
import { applyMixins } from '../../utils/abstract-test-case';

class TextAreaRenderingTest extends RenderingTest {
  constructor() {
    super();

    this.registerComponent('-text-area', { ComponentClass: TextArea });
  }

  assertTextArea({ attrs, value } = {}) {
    let mergedAttrs = assign({ 'class': classes('ember-view ember-text-area') }, attrs);
    this.assertComponentElement(this.firstChild, { tagName: 'textarea', attrs: mergedAttrs });

    if (value) {
      this.assert.strictEqual(value, this.firstChild.value);
    }
  }

  triggerEvent(type, options = {}) {
    let event = document.createEvent('Events');
    event.initEvent(type, true, true);
    assign(event, options);

    this.firstChild.dispatchEvent(event);
  }
}

class BoundTextAreaAttributes {
  constructor(cases) {
    this.cases = cases;
  }

  generate({ attribute, first, second }) {
    return {
      [`@test ${attribute}`](assert) {
        this.render(`{{textarea ${attribute}=value}}`, {
          value: first
        });
        this.assertTextArea({ attrs: { [attribute]: first } });

        this.assertStableRerender();

        this.runTask(() => set(this.context, 'value', second));
        this.assertTextArea({ attrs: { [attribute]: second } });

        this.runTask(() => set(this.context, 'value', first));
        this.assertTextArea({ attrs: { [attribute]: first } });
      }
    };
  }
}

applyMixins(
  TextAreaRenderingTest,
  new BoundTextAreaAttributes([
    { attribute: 'placeholder', first: 'Stuff here', second: 'Other stuff' },
    { attribute: 'name', first: 'Stuff here', second: 'Other stuff' },
    { attribute: 'title', first: 'Stuff here', second: 'Other stuff' },
    { attribute: 'maxlength', first: '1', second: '2' },
    { attribute: 'rows', first: '1', second: '2' },
    { attribute: 'cols', first: '1', second: '2' },
    { attribute: 'tabindex', first: '1', second: '2' }
  ])
);

moduleFor('Helpers test: {{textarea}}', class extends TextAreaRenderingTest {

  ['@test Should insert a textarea']() {
    this.render('{{textarea}}');

    equal(this.$('textarea').length, 1);

    this.assertStableRerender();
  }

  ['@test Should respect disabled']() {
    this.render('{{textarea disabled=disabled}}', {
      disabled: true
    });
    ok(this.$('textarea').is(':disabled'));
  }

  ['@test Should respect disabled when false']() {
    this.render('{{textarea disabled=disabled}}', {
      disabled: false
    });
    ok(this.$('textarea').is(':not(:disabled)'));
  }

  ['@test Should become disabled when the context changes']() {
    this.render('{{textarea disabled=disabled}}');
    ok(this.$('textarea').is(':not(:disabled)'));

    this.assertStableRerender();

    this.runTask(() => set(this.context, 'disabled', true));
    ok(this.$('textarea').is(':disabled'));

    this.runTask(() => set(this.context, 'disabled', false));
    ok(this.$('textarea').is(':not(:disabled)'));
  }

  ['@test Should bind its contents to the specified value']() {
    this.render('{{textarea value=model.val}}', {
      model: { val: 'A beautiful day in Seattle' }
    });
    this.assertTextArea({ value: 'A beautiful day in Seattle' });

    this.assertStableRerender();

    this.runTask(() => set(this.context, 'model.val', 'Auckland'));
    this.assertTextArea({ value: 'Auckland' });

    this.runTask(() => set(this.context, 'model', { val: 'A beautiful day in Seattle' }));
    this.assertTextArea({ value: 'A beautiful day in Seattle' });
  }

  ['@test GH#14001 Should correctly handle an empty string bound value']() {
    this.render('{{textarea value=message}}', { message: '' });

    this.assert.strictEqual(this.firstChild.value, '');

    this.assertStableRerender();

    this.runTask(() => set(this.context, 'message', 'hello'));

    this.assert.strictEqual(this.firstChild.value, 'hello');

    this.runTask(() => set(this.context, 'message', ''));

    this.assert.strictEqual(this.firstChild.value, '');
  }

  ['@test should update the value for `cut` / `input` / `change` events']() {
    this.render('{{textarea value=model.val}}', {
      model: { val: 'A beautiful day in Seattle' }
    });
    this.assertTextArea({ value: 'A beautiful day in Seattle' });

    this.assertStableRerender();

    this.runTask(() => {
      this.firstChild.value = 'Auckland';
      this.triggerEvent('cut');
    });
    this.assertTextArea({ value: 'Auckland' });

    this.runTask(() => {
      this.firstChild.value = 'Hope';
      this.triggerEvent('paste');
    });
    this.assertTextArea({ value: 'Hope' });

    this.runTask(() => {
      this.firstChild.value = 'Boston';
      this.triggerEvent('input');
    });
    this.assertTextArea({ value: 'Boston' });

    this.runTask(() => set(this.context, 'model', { val: 'A beautiful day in Seattle' }));
    this.assertTextArea({ value: 'A beautiful day in Seattle' });
  }
});
