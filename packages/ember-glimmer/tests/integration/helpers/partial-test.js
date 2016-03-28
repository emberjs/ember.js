import { RenderingTest, moduleFor } from '../../utils/test-case';
import { set } from 'ember-metal/property_set';

moduleFor('Helpers test: {{partial}}', class extends RenderingTest {

  ['@htmlbars should render other templates registered with the container']() {
    this.registerPartial('_subTemplateFromContainer', 'sub-template');

    this.render(`This {{partial "subTemplateFromContainer"}} is pretty great.`);

    equal(this.$().text(), 'This sub-template is pretty great.');

    this.assertStableRerender();
  }

  ['@htmlbars should render other slash-separated templates registered with the container']() {
    this.registerPartial('child/_subTemplateFromContainer', 'sub-template');

    this.render(`This {{partial "child/subTemplateFromContainer"}} is pretty great.`);

    equal(this.$().text(), 'This sub-template is pretty great.');

    this.assertStableRerender();
  }

  ['@htmlbars should use the current context']() {
    this.registerPartial('_person_name', '{{firstName}} {{lastName}}');

    this.render('Who is {{partial "person_name"}}?', { firstName: 'Kris', lastName: 'Selden' });

    equal(this.$().text(), 'Who is Kris Selden?');

    this.assertStableRerender();
  }

  ['@htmlbars Quoteless parameters passed to {{template}} perform a bound property lookup of the partial name']() {
    this.registerPartial('_subTemplate', 'sub-template');
    this.registerPartial('_otherTemplate', 'other-template');

    this.render('This {{partial partialName}} is pretty {{partial nonexistent}}great.', { partialName: 'subTemplate' });

    equal(this.$().text(), 'This sub-template is pretty great.');

    this.runTask(() => set(this.context, 'partialName', 'otherTemplate'));

    equal(this.$().text(), 'This other-template is pretty great.');

    this.runTask(() => set(this.context, 'partialName', null));

    equal(this.$().text(), 'This  is pretty great.');
  }
});
