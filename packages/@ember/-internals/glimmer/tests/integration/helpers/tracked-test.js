import EmberObject from '@ember/object';
import { A } from '@ember/array';
import MutableArray from '@ember/array/mutable';
import {
  tracked,
  nativeDescDecorator as descriptor,
  notifyPropertyChange,
} from '@ember/-internals/metal';
import Service, { service } from '@ember/service';
import { moduleFor, RenderingTestCase, strip, runTask } from 'internal-test-helpers';

import { Component } from '../../utils/helpers';

moduleFor(
  'Helper Tracked Properties',
  class extends RenderingTestCase {
    '@test tracked properties rerender when updated'(assert) {
      let computeCount = 0;

      class PersonComponent extends Component {
        @tracked name = 'bob';
        updateName = () => {
          this.name = 'sal';
        };
      }

      this.registerComponent('person', {
        ComponentClass: PersonComponent,
        template: strip`
            <button onclick={{this.updateName}}>
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

      let Person = class extends EmberObject {
        @tracked
        name = 'bob';
      };

      this.registerHelper('hello-world', ([value]) => {
        computeCount++;
        return `${value}-value`;
      });

      this.render('{{hello-world this.model.name}}', {
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

      class PersonComponent extends Component {
        @tracked first = 'Rob';
        @tracked last = 'Jackson';
        get full() {
          return `${this.first} ${this.last}`;
        }

        updatePerson = () => {
          this.first = 'Kris';
          this.last = 'Selden';
        };
      }

      this.registerComponent('person', {
        ComponentClass: PersonComponent,
        template: strip`
            <button onclick={{this.updatePerson}}>
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
      class NumListComponent extends Component {
        @tracked numbers = A([1, 2, 3]);

        addNumber = () => {
          this.numbers.pushObject(4);
        };
      }

      this.registerComponent('num-list', {
        ComponentClass: NumListComponent,
        template: strip`
            <button {{on "click" this.addNumber}}>
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

    '@test custom ember array properties rerender when updated'() {
      let CustomArray = class extends EmberObject.extend(MutableArray) {
        init() {
          super.init(...arguments);
          this._vals = [1, 2, 3];
        }

        objectAt(index) {
          return this._vals[index];
        }

        replace(start, deleteCount, items = []) {
          this._vals.splice(start, deleteCount, ...items);
          notifyPropertyChange(this, '[]');
        }

        join() {
          return this._vals.join(...arguments);
        }

        get length() {
          return this._vals.length;
        }
      };

      class NumListComponent extends Component {
        @tracked numbers = CustomArray.create();

        addNumber = () => {
          this.numbers.pushObject(4);
        };
      }

      this.registerComponent('num-list', {
        ComponentClass: NumListComponent,
        template: strip`
            <button {{on "click" this.addNumber}}>
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

      let Person = class extends EmberObject {
        @tracked
        first = 'Rob';
        @tracked
        last = 'Jackson';

        @descriptor
        get full() {
          return `${this.first} ${this.last}`;
        }
      };

      this.registerHelper('hello-world', ([value]) => {
        computeCount++;
        return value;
      });

      this.render('{{hello-world this.model.full}}', {
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

    '@test functional helpers autotrack based on non-argument tracked props that are accessed'(
      assert
    ) {
      let computeCount = 0;

      let currentUserService;
      this.registerService(
        'current-user',
        class extends Service {
          @tracked
          name = 'bob';

          init() {
            super.init(...arguments);
            currentUserService = this;
          }
        }
      );

      this.registerComponent('person', {
        ComponentClass: class extends Component {
          @service('current-user')
          currentUser;
        },

        template: strip`
            {{hello-world this.currentUser}}
          `,
      });

      this.registerHelper('hello-world', ([service]) => {
        computeCount++;
        return `${service.name}-value`;
      });

      this.render('<Person/>');

      this.assertText('bob-value');

      assert.strictEqual(computeCount, 1, 'compute is called exactly 1 time');

      runTask(() => this.rerender());

      this.assertText('bob-value');

      assert.strictEqual(computeCount, 1, 'compute is called exactly 1 time');

      runTask(() => (currentUserService.name = 'sal'));

      this.assertText('sal-value');

      assert.strictEqual(computeCount, 2, 'compute is called exactly 2 times');
    }

    '@test class based helpers are autotracked'(assert) {
      let computeCount = 0;

      let TrackedClass = class extends EmberObject {
        @tracked
        value = 'bob';
      };

      let trackedInstance = TrackedClass.create();

      this.registerComponent('person', {
        ComponentClass: class extends Component {},
        template: strip`{{hello-world}}`,
      });

      this.registerHelper('hello-world', {
        compute() {
          computeCount++;
          return `${trackedInstance.value}-value`;
        },
      });

      this.render('<Person/>');

      this.assertText('bob-value');

      assert.strictEqual(computeCount, 1, 'compute is called exactly 1 time');

      runTask(() => this.rerender());

      this.assertText('bob-value');

      assert.strictEqual(computeCount, 1, 'compute is called exactly 1 time');

      runTask(() => (trackedInstance.value = 'sal'));

      this.assertText('sal-value');

      assert.strictEqual(computeCount, 2, 'compute is called exactly 2 times');
    }

    '@test each-in autotracks non-tracked values correctly'() {
      let obj = EmberObject.create({ value: 'bob' });

      this.registerComponent('person', {
        ComponentClass: class extends Component {
          obj = obj;
        },
        template: strip`
            {{#each-in this.obj as |key value|}}
              {{value}}-{{key}}
            {{/each-in}}
          `,
      });

      this.render('<Person/>');

      this.assertText('bob-value');

      runTask(() => obj.set('value', 'sal'));

      this.assertText('sal-value');
    }

    '@test each-in autotracks arrays acorrectly'() {
      let obj = EmberObject.create({ arr: A([1]) });

      this.registerComponent('person', {
        ComponentClass: class extends Component {
          obj = obj;
        },
        template: strip`
            {{#each-in this.obj as |key arr|}}
              {{#each arr as |v|}}{{v}}{{/each}}
            {{/each-in}}
          `,
      });

      this.render('<Person/>');

      this.assertText('1');

      runTask(() => obj.arr.pushObject(2));

      this.assertText('12');
    }
  }
);
