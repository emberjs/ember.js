import { set } from 'ember-metal/property_set';
import { TextArea } from '../../utils/helpers';
import { RenderingTest, moduleFor } from '../../utils/test-case';

class TextAreaRenderingTest extends RenderingTest {
  constructor() {
    super();

    this.registerComponent('-text-area', { ComponentClass: TextArea });
  }
}

moduleFor('Helpers test: {{textarea}}', class extends TextAreaRenderingTest {

  ['@htmlbars Should insert a textarea']() {
    this.render('{{textarea}}');

    equal(this.$('textarea').length, 1);

    this.assertStableRerender();
  }

  ['@htmlbars Should become disabled when the context changes']() {
    this.render('{{textarea disabled=disabled}}');
    ok(this.$('textarea').is(':not(:disabled)'));

    this.assertStableRerender();

    this.runTask(() => set(this.context, 'disabled', true));
    ok(this.$('textarea').is(':disabled'));

    this.runTask(() => set(this.context, 'disabled', false));
    ok(this.$('textarea').is(':not(:disabled)'));
  }

  ['@htmlbars Should bind its contents to the specified value']() {
    this.render('{{textarea value=model.val}}', {
      model: { val: 'A beautiful day in Seattle' }
    });
    ok(this.$('textarea').val('A beautiful day in Seattle'));

    this.assertStableRerender();

    this.runTask(() => set(this.context, 'model.val', 'Auckland'));
    ok(this.$('textarea').val('Auckland'));

    this.runTask(() => set(this.context, 'model', { val: 'A beautiful day in Seattle' }));
    ok(this.$('textarea').val('A beautiful day in Seattle'));
  }

});
