import { RenderingTest, moduleFor } from '../../utils/test-case';
import { set } from 'ember-metal/property_set';

moduleFor('Helpers test: {{partial}}', class extends RenderingTest {

  ['@htmlbars should render other templates registered with the container']() {
    this.registerPartial('_subTemplateFromContainer', 'sub-template');

    this.render(`This {{partial "subTemplateFromContainer"}} is pretty great.`);

    this.assertStableRerender();

    this.assertText('This sub-template is pretty great.');
  }

  ['@htmlbars should render other slash-separated templates registered with the container']() {
    this.registerPartial('child/_subTemplateFromContainer', 'sub-template');

    this.render(`This {{partial "child/subTemplateFromContainer"}} is pretty great.`);

    this.assertStableRerender();

    this.assertText('This sub-template is pretty great.');
  }

  ['@htmlbars should use the current context']() {
    this.registerPartial('_person_name', '{{firstName}} {{lastName}}');

    this.render('Who is {{partial "person_name"}}?', {
      firstName: 'Kris',
      lastName: 'Selden'
    });

    this.assertStableRerender();

    this.assertText('Who is Kris Selden?');

    this.runTask(() => set(this.context, 'firstName', 'Kelly'));

    this.assertText('Who is Kelly Selden?');

    this.runTask(() => set(this.context, 'firstName', 'Kris'));

    this.assertText('Who is Kris Selden?');
  }

  ['@htmlbars Quoteless parameters passed to {{partial}} perform a bound property lookup of the partial name']() {
    this.registerPartial('_subTemplate', 'sub-template');
    this.registerPartial('_otherTemplate', 'other-template');

    this.render('This {{partial partialName}} is pretty {{partial nonexistent}}great.', { partialName: 'subTemplate' });

    this.assertStableRerender();

    this.assertText('This sub-template is pretty great.');

    this.runTask(() => set(this.context, 'partialName', 'otherTemplate'));

    this.assertText('This other-template is pretty great.');

    this.runTask(() => set(this.context, 'partialName', null));

    this.assertText('This  is pretty great.');

    this.runTask(() => set(this.context, 'partialName', 'subTemplate'));

    this.assertText('This sub-template is pretty great.');
  }
});
