import { RenderingTest, moduleFor } from '../../utils/test-case';
import { set } from 'ember-metal/property_set';
import { strip } from '../../utils/abstract-test-case';


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

  ['@htmlbars dynamic partials in {{#each}}']() {
    this.registerPartial('_odd', 'ODD{{i}}');
    this.registerPartial('_even', 'EVEN{{i}}');

    this.render(strip`
      {{#each items as |template i|}}
        {{type}}: {{partial template}}
      {{/each}}`, {
      items: ['even', 'odd', 'even', 'odd'],
      type: 'number'
    });

    this.assertStableRerender();

    this.assertText('number: EVEN0number: ODD1number: EVEN2number: ODD3');

    this.runTask(() => set(this.context, 'type', 'integer'));

    this.assertText('integer: EVEN0integer: ODD1integer: EVEN2integer: ODD3');

    this.runTask(() => set(this.context, 'type', 'number'));

    this.assertText('number: EVEN0number: ODD1number: EVEN2number: ODD3');
  }

  ['@htmlbars dynamic partials in {{#with}}']() {
    this.registerPartial('_thing', '{{template.name}}');

    this.render(strip`
      {{#with item as |template|}}
        {{partial template.name}}
      {{else}}
        Nothing!
      {{/with}}`, {
      item: false
    });

    this.assertStableRerender();

    this.assertText('Nothing!');

    this.runTask(() => set(this.context, 'item', {
      name: 'thing'
    }));

    this.assertText('thing');

    this.runTask(() => set(this.context, 'item', false));

    this.assertText('Nothing!');
  }
});
