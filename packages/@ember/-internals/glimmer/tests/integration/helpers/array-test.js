import { RenderingTestCase, moduleFor } from '../../utils/test-case';
import { strip } from '../../utils/abstract-test-case';
import { Component } from '../../utils/helpers';
import { set } from '@ember/-internals/metal';
import { EMBER_GLIMMER_ARRAY_HELPER } from '@ember/canary-features';

if (EMBER_GLIMMER_ARRAY_HELPER) {
  moduleFor(
    'Helpers test: {{array}}',
    class extends RenderingTestCase {
      ['@test returns an array']() {
        this.render(strip`
        {{#with (array "Sergio") as |people|}}
          {{#each people as |personName|}}
            {{personName}}
          {{/each}}
        {{/with}}`);

        this.assertText('Sergio');

        this.assertStableRerender();
      }

      ['@test can have more than one value']() {
        this.render(strip`
        {{#with (array "Sergio" "Robert") as |people|}}
          {{#each people as |personName|}}
            {{personName}},
          {{/each}}
        {{/with}}`);

        this.assertText('Sergio,Robert,');

        this.assertStableRerender();
      }

      ['@test binds values when variables are used']() {
        this.render(
          strip`{{#with (array personOne) as |people|}}
                {{#each people as |personName|}}
                  {{personName}}
                {{/each}}
              {{/with}}`,
          {
            personOne: 'Tom',
          }
        );

        this.assertText('Tom');

        this.assertStableRerender();

        this.runTask(() => set(this.context, 'personOne', 'Yehuda'));
        this.assertText('Yehuda');

        this.runTask(() => set(this.context, 'personOne', 'Tom'));
        this.assertText('Tom');
      }

      ['@test binds multiple values when variables are used']() {
        this.render(
          strip`{{#with (array personOne personTwo) as |people|}}
                {{#each people as |personName|}}
                  {{personName}},
                {{/each}}
              {{/with}}`,
          {
            personOne: 'Tom',
            personTwo: 'Yehuda',
          }
        );

        this.assertText('Tom,Yehuda,');

        this.assertStableRerender();

        this.runTask(() => set(this.context, 'personOne', 'Sergio'));

        this.assertText('Sergio,Yehuda,');

        this.runTask(() => set(this.context, 'personTwo', 'Tom'));

        this.assertText('Sergio,Tom,');

        this.runTask(() => {
          set(this.context, 'personOne', 'Tom');
          set(this.context, 'personTwo', 'Yehuda');
        });

        this.assertText('Tom,Yehuda,');
      }

      ['@test array helpers can be nested']() {
        this.render(
          strip`{{#with (array (array personOne personTwo)) as |listOfPeople|}}
                {{#each listOfPeople as |people|}}
                  List:
                  {{#each people as |personName|}}
                    {{personName}},
                  {{/each}}
                {{/each}}
              {{/with}}`,
          {
            personOne: 'Tom',
            personTwo: 'Yehuda',
          }
        );

        this.assertText('List:Tom,Yehuda,');

        this.assertStableRerender();

        this.runTask(() => set(this.context, 'personOne', 'Chad'));

        this.assertText('List:Chad,Yehuda,');

        this.runTask(() => set(this.context, 'personTwo', 'Balint'));

        this.assertText('List:Chad,Balint,');

        this.runTask(() => {
          set(this.context, 'personOne', 'Tom');
          set(this.context, 'personTwo', 'Yehuda');
        });

        this.assertText('List:Tom,Yehuda,');
      }

      ['@test should yield hash of an array of internal properties']() {
        let fooBarInstance;
        let FooBarComponent = Component.extend({
          init() {
            this._super();
            fooBarInstance = this;
            this.model = { personOne: 'Chad' };
          },
        });

        this.registerComponent('foo-bar', {
          ComponentClass: FooBarComponent,
          template: `{{yield (hash people=(array model.personOne))}}`,
        });

        this.render(strip`
        {{#foo-bar as |values|}}
          {{#each values.people as |personName|}}
            {{personName}}
          {{/each}}
        {{/foo-bar}}`);

        this.assertText('Chad');

        this.assertStableRerender();

        this.runTask(() => set(fooBarInstance, 'model.personOne', 'Godfrey'));

        this.assertText('Godfrey');

        this.runTask(() => set(fooBarInstance, 'model', { personOne: 'Chad' }));

        this.assertText('Chad');

        this.runTask(() => set(fooBarInstance, 'model.personOne', 'Godfrey'));

        this.assertText('Godfrey');
      }

      ['@test should yield hash of an array of internal and external properties']() {
        let fooBarInstance;
        let FooBarComponent = Component.extend({
          init() {
            this._super();
            fooBarInstance = this;
            this.model = { personOne: 'Chad' };
          },
        });

        this.registerComponent('foo-bar', {
          ComponentClass: FooBarComponent,
          template: `{{yield (hash people=(array model.personOne personTwo))}}`,
        });

        this.render(
          strip`{{#foo-bar personTwo=model.personTwo as |values|}}
                {{#each values.people as |personName|}}
                  {{personName}},
                {{/each}}
              {{/foo-bar}}`,
          {
            model: { personTwo: 'Tom' },
          }
        );

        this.assertText('Chad,Tom,');

        this.assertStableRerender();

        this.runTask(() => {
          set(fooBarInstance, 'model.personOne', 'Godfrey');
          set(this.context, 'model.personTwo', 'Yehuda');
        });

        this.assertText('Godfrey,Yehuda,');

        this.runTask(() => {
          set(fooBarInstance, 'model', { personOne: 'Chad' });
          set(this.context, 'model', { personTwo: 'Tom' });
        });

        this.assertText('Chad,Tom,');
      }

      ['@test should render when passing as argument to a component invocation']() {
        let FooBarComponent = Component.extend({});

        this.registerComponent('foo-bar', {
          ComponentClass: FooBarComponent,
          template: strip`
          {{#each people as |personName|}}
            {{personName}},
          {{/each}}`,
        });

        this.render(strip`{{foo-bar people=(array "Tom" personTwo)}}`, { personTwo: 'Chad' });

        this.assertText('Tom,Chad,');

        this.assertStableRerender();

        this.runTask(() => set(this.context, 'personTwo', 'Godfrey'));

        this.assertText('Tom,Godfrey,');

        this.runTask(() => set(this.context, 'personTwo', 'Chad'));

        this.assertText('Tom,Chad,');
      }

      ['@test should return an entirely new array when any argument change']() {
        let fooBarInstance;
        let FooBarComponent = Component.extend({
          init() {
            this._super();
            fooBarInstance = this;
          },
        });

        this.registerComponent('foo-bar', {
          ComponentClass: FooBarComponent,
          template: strip`
          {{#each people as |personName|}}
            {{personName}},
          {{/each}}`,
        });

        this.render(strip`{{foo-bar people=(array "Tom" personTwo)}}`, { personTwo: 'Chad' });

        let firstArray = fooBarInstance.people;

        this.runTask(() => set(this.context, 'personTwo', 'Godfrey'));

        this.assert.ok(
          firstArray !== fooBarInstance.people,
          'should have created an entirely new array'
        );
      }

      ['@test capture array values in JS to assert deep equal']() {
        let captured;

        this.registerHelper('capture', function([array]) {
          captured = array;
          return 'captured';
        });

        this.render(`{{capture (array 'Tom' personTwo)}}`, { personTwo: 'Godfrey' });

        this.assert.deepEqual(captured, ['Tom', 'Godfrey']);

        this.runTask(() => set(this.context, 'personTwo', 'Robert'));

        this.assert.deepEqual(captured, ['Tom', 'Robert']);

        this.runTask(() => set(this.context, 'personTwo', 'Godfrey'));

        this.assert.deepEqual(captured, ['Tom', 'Godfrey']);
      }
    }
  );
}
