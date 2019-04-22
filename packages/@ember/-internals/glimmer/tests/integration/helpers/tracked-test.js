import { EMBER_METAL_TRACKED_PROPERTIES } from '@ember/canary-features';
import { Object as EmberObject, A } from '@ember/-internals/runtime';
import { tracked, nativeDescDecorator as descriptor } from '@ember/-internals/metal';
import { moduleFor, RenderingTestCase, strip, runTask } from 'internal-test-helpers';

import { Component } from '../../utils/helpers';

if (EMBER_METAL_TRACKED_PROPERTIES) {
  moduleFor(
    'Helper Tracked Properties',
    class extends RenderingTestCase {
      '@test tracked properties rerender when updated'(assert) {
        let computeCount = 0;

        let PersonComponent = Component.extend({
          name: tracked({ value: 'bob' }),

          updateName() {
            this.name = 'sal';
          },
        });

        this.registerComponent('person', {
          ComponentClass: PersonComponent,
          template: strip`
            <button onclick={{action this.updateName}}>
              {{hello-world this.name}}
            </button>
          `,
        });

        this.registerHelper('hello-world', ([value]) => {
          computeCount++;
          return `${value}-value`;
        });

        this.render('<Person/>');

        this.assertText('bob-value');

        assert.strictEqual(computeCount, 1, 'compute is called exactly 1 time');

        runTask(() => this.rerender());

        this.assertText('bob-value');

        assert.strictEqual(computeCount, 1, 'compute is called exactly 1 time');

        runTask(() => this.$('button').click());

        this.assertText('sal-value');

        assert.strictEqual(computeCount, 2, 'compute is called exactly 2 times');
      }

      '@test nested tracked properties rerender when updated'(assert) {
        let computeCount = 0;

        let Person = EmberObject.extend({
          name: tracked({ value: 'bob' }),
        });

        this.registerHelper('hello-world', ([value]) => {
          computeCount++;
          return `${value}-value`;
        });

        this.render('{{hello-world model.name}}', {
          model: Person.create(),
        });

        this.assertText('bob-value');

        assert.strictEqual(computeCount, 1, 'compute is called exactly 1 time');

        runTask(() => this.rerender());

        this.assertText('bob-value');

        assert.strictEqual(computeCount, 1, 'compute is called exactly 1 time');

        runTask(() => (this.context.model.name = 'sal'));

        this.assertText('sal-value');

        assert.strictEqual(computeCount, 2, 'compute is called exactly 2 times');
      }

      '@test getters update when dependent properties are invalidated'(assert) {
        let computeCount = 0;

        let PersonComponent = Component.extend({
          first: tracked({ value: 'Rob' }),
          last: tracked({ value: 'Jackson' }),

          full: descriptor({
            get() {
              return `${this.first} ${this.last}`;
            },
          }),

          updatePerson() {
            this.first = 'Kris';
            this.last = 'Selden';
          },
        });

        this.registerComponent('person', {
          ComponentClass: PersonComponent,
          template: strip`
            <button onclick={{action this.updatePerson}}>
              {{hello-world this.full}}
            </button>
          `,
        });

        this.registerHelper('hello-world', ([value]) => {
          computeCount++;
          return value;
        });

        this.render('<Person/>');

        this.assertText('Rob Jackson');

        assert.strictEqual(computeCount, 1, 'compute is called exactly 1 time');

        runTask(() => this.rerender());

        this.assertText('Rob Jackson');

        assert.strictEqual(computeCount, 1, 'compute is called exactly 1 time');

        runTask(() => this.$('button').click());

        this.assertText('Kris Selden');

        assert.strictEqual(computeCount, 2, 'compute is called exactly 2 times');
      }

      '@test array properties rerender when updated'() {
        let NumListComponent = Component.extend({
          numbers: tracked({ initializer: () => A([1, 2, 3]) }),

          addNumber() {
            this.numbers.pushObject(4);
          },
        });

        this.registerComponent('num-list', {
          ComponentClass: NumListComponent,
          template: strip`
            <button {{action this.addNumber}}>
              {{join this.numbers}}
            </button>
          `,
        });

        this.registerHelper('join', ([value]) => {
          return value.join(', ');
        });

        this.render('<NumList />');

        this.assertText('1, 2, 3');

        runTask(() => this.$('button').click());

        this.assertText('1, 2, 3, 4');
      }

      '@test nested getters update when dependent properties are invalidated'(assert) {
        let computeCount = 0;

        let Person = EmberObject.extend({
          first: tracked({ value: 'Rob' }),
          last: tracked({ value: 'Jackson' }),

          full: descriptor({
            get() {
              return `${this.first} ${this.last}`;
            },
          }),
        });

        this.registerHelper('hello-world', ([value]) => {
          computeCount++;
          return value;
        });

        this.render('{{hello-world model.full}}', {
          model: Person.create(),
        });

        this.assertText('Rob Jackson');

        assert.strictEqual(computeCount, 1, 'compute is called exactly 1 time');

        runTask(() => this.rerender());

        this.assertText('Rob Jackson');

        assert.strictEqual(computeCount, 1, 'compute is called exactly 1 time');

        runTask(() => {
          this.context.model.first = 'Kris';
          this.context.model.last = 'Selden';
        });

        this.assertText('Kris Selden');

        assert.strictEqual(computeCount, 2, 'compute is called exactly 2 times');
      }
    }
  );
}
