import EmberObject from '@ember/object';
import { tracked } from '@ember/-internals/metal';
import { computed, get, set } from '@ember/object';
import { moduleFor, RenderingTestCase, strip, runTask } from 'internal-test-helpers';
import GlimmerishComponent from '../../utils/glimmerish-component';
import { Component } from '../../utils/helpers';
import { TrackedArray } from 'tracked-built-ins';

moduleFor(
  'Component Tracked Properties',
  class extends RenderingTestCase {
    '@test simple test using classic component'() {
      let personId = 0;
      class Person {
        @tracked first;
        @tracked last;

        constructor(first, last) {
          this.id = personId++;
          this.first = first;
          this.last = last;
        }
      }

      class PersonComponent extends Component {
        @tracked first;
        @tracked last;

        get person() {
          return new Person(this.first, this.last);
        }
      }

      this.registerComponent('person-wrapper', {
        ComponentClass: PersonComponent,
        template: '{{@first}} {{@last}} | {{this.person.first}} {{this.person.last}}',
      });

      this.render('<PersonWrapper @first={{this.first}} @last={{this.last}} />', {
        first: 'robert',
        last: 'jackson',
      });

      this.assertText('robert jackson | robert jackson');

      runTask(() => this.context.set('first', 'max'));
      this.assertText('max jackson | max jackson');
    }

    '@test simple test using glimmerish component'() {
      let personId = 0;
      class Person {
        @tracked first;
        @tracked last;

        constructor(first, last) {
          this.id = personId++;
          this.first = first;
          this.last = last;
        }
      }

      class PersonComponent extends GlimmerishComponent {
        get person() {
          return new Person(this.args.first, this.args.last);
        }
      }

      this.registerComponent('person-wrapper', {
        ComponentClass: PersonComponent,
        template: '{{@first}} {{@last}} | {{this.person.first}} {{this.person.last}}',
      });

      this.render('<PersonWrapper @first={{this.first}} @last={{this.last}} />', {
        first: 'robert',
        last: 'jackson',
      });

      this.assertText('robert jackson | robert jackson');

      runTask(() => this.context.set('first', 'max'));
      this.assertText('max jackson | max jackson');
    }

    '@test tracked properties that are uninitialized do not throw an error'() {
      class CountComponent extends Component {
        @tracked count;

        increment = () => {
          if (!this.count) {
            this.count = 0;
          }
          this.count++;
        };
      }

      this.registerComponent('counter', {
        ComponentClass: CountComponent,
        template: '<button {{on "click" this.increment}}>{{this.count}}</button>',
      });

      this.render('<Counter />');

      this.assertText('');

      runTask(() => this.$('button').click());

      this.assertText('1');
    }

    '@test tracked properties rerender when updated'() {
      class CountComponent extends Component {
        @tracked count = 0;

        increment = () => {
          this.count++;
        };
      }

      this.registerComponent('counter', {
        ComponentClass: CountComponent,
        template: '<button {{on "click" this.increment}}>{{this.count}}</button>',
      });

      this.render('<Counter />');

      this.assertText('0');

      runTask(() => this.$('button').click());

      this.assertText('1');
    }

    '@test tracked properties rerender when updated outside of a runloop'(assert) {
      let done = assert.async();

      class CountComponent extends Component {
        @tracked count = 0;

        increment = () => {
          setTimeout(() => {
            this.count++;
          }, 100);
        };
      }

      this.registerComponent('counter', {
        ComponentClass: CountComponent,
        template: '<button {{on "click" this.increment}}>{{this.count}}</button>',
      });

      this.render('<Counter />');

      this.assertText('0');

      // intentionally outside of a runTask
      this.$('button').click();

      setTimeout(() => {
        this.assertText('1');
        done();
      }, 200);
    }

    '@test nested tracked properties rerender when updated'() {
      class Counter {
        @tracked count = 0;
      }

      class CountComponent extends Component {
        counter = new Counter();

        increment = () => this.counter.count++;
      }

      this.registerComponent('counter', {
        ComponentClass: CountComponent,
        template: '<button {{on "click" this.increment}}>{{this.counter.count}}</button>',
      });

      this.render('<Counter />');

      this.assertText('0');

      runTask(() => this.$('button').click());

      this.assertText('1');
    }

    '@test array properties rerender when updated'() {
      class NumListComponent extends Component {
        @tracked numbers = new TrackedArray([1, 2, 3]);

        addNumber = () => this.numbers.push(4);
      }

      this.registerComponent('num-list', {
        ComponentClass: NumListComponent,
        template: strip`
            <button {{on "click" this.addNumber}}>
              {{#each this.numbers as |num|}}{{num}}{{/each}}
            </button>
          `,
      });

      this.render('<NumList />');

      this.assertText('123');

      runTask(() => this.$('button').click());

      this.assertText('1234');
    }

    '@test getters update when dependent properties are invalidated'() {
      class CountComponent extends Component {
        @tracked count = 0;

        get countAlias() {
          return this.count;
        }

        increment = () => this.count++;
      }

      this.registerComponent('counter', {
        ComponentClass: CountComponent,
        template: '<button {{on "click" this.increment}}>{{this.countAlias}}</button>',
      });

      this.render('<Counter />');

      this.assertText('0');

      runTask(() => this.$('button').click());

      this.assertText('1');
    }

    '@test getters update when dependent computeds are invalidated'() {
      class CountComponent extends Component {
        @tracked _count = 0;

        @computed({
          get() {
            return this._count;
          },
          set(_key, value) {
            return (this._count = value);
          },
        })
        count;

        get countAlias() {
          return this.count;
        }
        increment = () => this.set('count', this.count + 1);
      }

      this.registerComponent('counter', {
        ComponentClass: CountComponent,
        template: '<button {{on "click" this.increment}}>{{this.countAlias}}</button>',
      });

      this.render('<Counter />');

      this.assertText('0');

      runTask(() => this.$('button').click());

      this.assertText('1');

      runTask(() => this.$('button').click());

      this.assertText('2');
    }

    '@test nested getters update when dependent properties are invalidated'() {
      class Counter {
        @tracked count = 0;

        get countAlias() {
          return this.count;
        }
      }

      class CountComponent extends Component {
        counter = new Counter();

        increment = () => this.counter.count++;
      }

      this.registerComponent('counter', {
        ComponentClass: CountComponent,
        template: '<button {{on "click" this.increment}}>{{this.counter.countAlias}}</button>',
      });

      this.render('<Counter />');

      this.assertText('0');

      runTask(() => this.$('button').click());

      this.assertText('1');
    }

    '@test tracked object passed down through components updates correctly'(assert) {
      class Person {
        @tracked first = 'Rob';
        @tracked last = 'Jackson';

        get full() {
          return `${this.first} ${this.last}`;
        }
      }

      class ParentComponent extends Component {
        person = new Person();
      }

      class ChildComponent extends Component {
        updatePerson = () => {
          this.person.first = 'Kris';
          this.person.last = 'Selden';
        };
      }

      this.registerComponent('parent', {
        ComponentClass: ParentComponent,
        template: strip`
            <div id="parent">{{this.person.full}}</div>
            <Child @person={{this.person}}/>
          `,
      });

      this.registerComponent('child', {
        ComponentClass: ChildComponent,
        template: strip`
            <div id="child">{{this.person.full}}</div>
            <button onclick={{this.updatePerson}}></button>
          `,
      });

      this.render('<Parent />');

      assert.equal(this.$('#parent').text(), 'Rob Jackson');
      assert.equal(this.$('#child').text(), 'Rob Jackson');

      runTask(() => this.$('button').click());

      assert.equal(this.$('#parent').text(), 'Kris Selden');
      assert.equal(this.$('#child').text(), 'Kris Selden');
    }

    '@test yielded getters update correctly'() {
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
            {{yield this.full this.updatePerson}}
          `,
      });

      this.render(strip`
          <Person as |name update|>
            <button onclick={{update}}>
              {{name}}
            </button>
          </Person>
        `);

      this.assertText('Rob Jackson');

      runTask(() => this.$('button').click());

      this.assertText('Kris Selden');
    }

    '@test yielded nested getters update correctly'() {
      class Person {
        @tracked first = 'Rob';
        @tracked last = 'Jackson';

        get full() {
          return `${this.first} ${this.last}`;
        }
      }
      class PersonComponent extends Component {
        person = new Person();

        updatePerson = () => {
          this.person.first = 'Kris';
          this.person.last = 'Selden';
        };
      }

      this.registerComponent('person', {
        ComponentClass: PersonComponent,
        template: strip`
            {{yield this.person this.updatePerson}}
          `,
      });

      this.render(strip`
          <Person as |p update|>
            <button onclick={{update}}>
              {{p.full}}
            </button>
          </Person>
        `);

      this.assertText('Rob Jackson');

      runTask(() => this.$('button').click());

      this.assertText('Kris Selden');
    }

    '@test does not setup mandatory setter for untracked values'() {
      let person;

      class Person {
        constructor(first, last) {
          person = this;
          this.first = first;
          this.last = last;
        }
      }

      class PersonComponent extends GlimmerishComponent {
        person = new Person(this.args.first, this.args.last);
      }

      this.registerComponent('person-wrapper', {
        ComponentClass: PersonComponent,
        template: '{{this.person.first}} {{this.person.last}}',
      });

      this.render('<PersonWrapper @first={{this.first}} @last={{this.last}} />', {
        first: 'robert',
        last: 'jackson',
      });

      this.assertText('robert jackson');

      // check to make sure we can still mutate the person
      person.first = 'max';
    }

    '@test works when EmberObject created during render'() {
      this.registerComponent('test', {
        ComponentClass: class extends GlimmerishComponent {},
        template: '{{@data.length}}',
      });

      let RecordMeta = new WeakMap();
      function getRecordMeta(record) {
        let meta = RecordMeta.get(record);
        if (meta === undefined) {
          meta = Object.create(null);
          RecordMeta.set(record, meta);
        }

        return meta;
      }

      // does not reproduce with native JS class only
      class Person extends EmberObject {
        get name() {
          let meta = getRecordMeta(this);
          let name = get(meta, 'name');
          return name;
        }
        set name(v) {
          let meta = getRecordMeta(this);
          set(meta, 'name', v);
        }
      }

      class List {
        get records() {
          let p = Person.create({ name: 'ye-haw' });
          return [p];
        }
      }

      this.render('<Test @data={{this.data.records}} />', {
        data: new List(),
      });

      this.assertText('1');
    }
  }
);

moduleFor(
  'Component Tracked Properties w/ Args Proxy',
  class extends RenderingTestCase {
    '@test downstream property changes do not invalidate upstream component getters/arguments'(
      assert
    ) {
      let outerRenderCount = 0;
      let innerRenderCount = 0;

      class OuterComponent extends GlimmerishComponent {
        get count() {
          outerRenderCount++;
          return this.args.count;
        }
      }

      class InnerComponent extends GlimmerishComponent {
        @tracked count = 0;

        get combinedCounts() {
          innerRenderCount++;
          return this.args.count + this.count;
        }

        updateInnerCount = () => {
          this.count++;
        };
      }

      this.registerComponent('outer', {
        ComponentClass: OuterComponent,
        template: '<Inner @count={{this.count}}/>',
      });

      this.registerComponent('inner', {
        ComponentClass: InnerComponent,
        template: '<button {{on "click" this.updateInnerCount}}>{{this.combinedCounts}}</button>',
      });

      this.render('<Outer @count={{this.count}}/>', {
        count: 0,
      });

      this.assertText('0');

      assert.equal(outerRenderCount, 1);
      assert.equal(innerRenderCount, 1);

      runTask(() => this.$('button').click());

      this.assertText('1');

      assert.equal(
        outerRenderCount,
        1,
        'updating inner component does not cause outer component to rerender'
      );
      assert.equal(
        innerRenderCount,
        2,
        'updating inner component causes inner component to rerender'
      );

      runTask(() => this.context.set('count', 1));

      this.assertText('2');

      assert.equal(outerRenderCount, 2, 'outer component updates based on context');
      assert.equal(innerRenderCount, 3, 'inner component updates based on outer component');
    }

    '@test computed properties can depend on args'() {
      class TestComponent extends GlimmerishComponent {
        @computed('args.text')
        get text() {
          return this.args.text;
        }
      }

      this.registerComponent('test', {
        ComponentClass: TestComponent,
        template: '<p>{{this.text}}</p>',
      });

      this.render('<Test @text={{this.text}}/>', {
        text: 'hello!',
      });

      this.assertText('hello!');

      runTask(() => this.context.set('text', 'hello world!'));
      this.assertText('hello world!');

      runTask(() => this.context.set('text', 'hello!'));
      this.assertText('hello!');
    }

    '@test computed properties can depend on nested args'() {
      let foo = EmberObject.create({
        text: 'hello!',
      });

      class TestComponent extends GlimmerishComponent {
        @computed('args.foo.text')
        get text() {
          return this.args.foo.text;
        }
      }

      this.registerComponent('test', {
        ComponentClass: TestComponent,
        template: '<p>{{this.text}}</p>',
      });

      this.render('<Test @foo={{this.foo}}/>', {
        foo: foo,
      });

      this.assertText('hello!');

      runTask(() => foo.set('text', 'hello world!'));
      this.assertText('hello world!');

      runTask(() => foo.set('text', 'hello!'));
      this.assertText('hello!');
    }

    '@test args can be accessed with get()'() {
      class TestComponent extends GlimmerishComponent {
        get text() {
          return get(this, 'args.text');
        }
      }

      this.registerComponent('test', {
        ComponentClass: TestComponent,
        template: '<p>{{this.text}}</p>',
      });

      this.render('<Test @text={{this.text}}/>', {
        text: 'hello!',
      });

      this.assertText('hello!');

      runTask(() => this.context.set('text', 'hello world!'));
      this.assertText('hello world!');

      runTask(() => this.context.set('text', 'hello!'));
      this.assertText('hello!');
    }

    '@test args can be accessed with get() if no value is passed'() {
      class TestComponent extends GlimmerishComponent {
        get text() {
          return get(this, 'args.text') || 'hello!';
        }
      }

      this.registerComponent('test', {
        ComponentClass: TestComponent,
        template: '<p>{{this.text}}</p>',
      });

      this.render('<Test/>', {
        text: 'hello!',
      });

      this.assertText('hello!');
    }

    '@test named args are enumerable'() {
      class TestComponent extends GlimmerishComponent {
        get objectKeys() {
          return Object.keys(this.args).join('');
        }

        get hasArg() {
          return 'text' in this.args;
        }
      }

      this.registerComponent('test', {
        ComponentClass: TestComponent,
        template: '<p>{{this.objectKeys}} {{this.hasArg}}</p>',
      });

      this.render('<Test @text={{this.text}}/>', {
        text: 'hello!',
      });

      this.assertText('text true');
    }

    '@test each-in works with args'() {
      this.registerComponent('test', {
        ComponentClass: class extends GlimmerishComponent {},
        template: '{{#each-in this.args as |key value|}}{{key}}:{{value}}{{/each-in}}',
      });

      this.render('<Test @text={{this.text}}/>', {
        text: 'hello!',
      });

      this.assertText('text:hello!');
    }
  }
);
