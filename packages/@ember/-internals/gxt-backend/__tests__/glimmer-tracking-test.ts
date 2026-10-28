/**
 * `@tracked` / `@cached` imported from `@glimmer/tracking` in the compat build
 * (GXT_MODE): the DOM after writes.
 *
 * A tracked write that reaches no reader renders stale DOM and throws nothing,
 * so every test here asserts the rendered output after each write (and after
 * writing a value back), not just that nothing threw. The settings: a classic
 * component, a Glimmer component, a template-only component reading an object's
 * tracked property, helpers reading tracked state, `{{#each}}` rows, a property
 * passed as an argument, a write during render (the backtracking assertion), a
 * write in an action / `next()` / a microtask, a `@cached` getter (over tracked
 * state and over a Glimmer component's argument), an inherited
 * tracked property and `@tracked` on objects that are not components. Each
 * property is written more than once: a gxt cell accessor defined over a
 * tracked accessor used to let only the first write render.
 *
 * The "port" modules are the classic `Component Tracked Properties`,
 * `Helper Tracked Properties`, helper-manager backtracking and `@cached`
 * tests with `tracked` / `cached` imported from `@glimmer/tracking` (the
 * classic files import metal's). Left out: the standalone `tracked(value)`
 * tests and the custom `MutableArray` test, red under GXT with metal's
 * `tracked` too (the compat baseline). The helper test `array properties
 * rerender when updated` is in the last module: it needs the array
 * consumption of metal's `tracked`.
 *
 * The test page loads this file only in GXT builds (`virtual:gxt-tests`).
 */
import {
  AbstractTestCase,
  moduleFor,
  RenderingTestCase,
  runTask,
  strip,
} from 'internal-test-helpers';
import ClassicComponent from '@ember/component';
import templateOnly from '@ember/component/template-only';
import Helper from '@ember/component/helper';
import EmberObject, { computed, get, set } from '@ember/object';
import { A } from '@ember/array';
import Service, { service } from '@ember/service';
import { next } from '@ember/runloop';
import { setOwner } from '@ember/-internals/owner';
import { peekMeta } from '@ember/-internals/meta';
import { TrackedDescriptor } from '@ember/-internals/metal';
import { renderSettled } from '@ember/renderer';
import { precompileTemplate } from '@ember/template-compilation';
import { helperCapabilities, setComponentTemplate, setHelperManager } from '@glimmer/manager';
import { registerDestructor } from '@glimmer/destroyable';
import GlimmerComponent from '@glimmer/component';
import { cached, tracked } from '@glimmer/tracking';
import { backtrackingMessageFor } from '../../glimmer/tests/utils/debug-stack';

declare const expectAssertion: (fn: () => unknown, expected?: RegExp | string) => void;

// The custom helper manager of the classic helper-manager tests
// (glimmer/tests/integration/helpers/helper-manager-test.js).
class TestHelperManager {
  capabilities = helperCapabilities('3.23', { hasValue: true, hasDestroyable: true });
  owner: unknown;

  constructor(owner: unknown) {
    this.owner = owner;
  }

  createHelper(HelperClass: any, args: unknown) {
    return new HelperClass(this.owner, args);
  }

  getValue(instance: any) {
    return instance.value();
  }

  getDestroyable(instance: object) {
    return instance;
  }

  getDebugName() {
    return 'TEST_HELPER';
  }
}

class TestHelper {
  args: any;

  constructor(owner: any, args: unknown) {
    setOwner(this, owner);
    this.args = args;
    registerDestructor(this, () => this.willDestroy());
  }

  willDestroy() {}

  value(): unknown {
    return undefined;
  }
}

setHelperManager((owner: unknown) => new TestHelperManager(owner), TestHelper);

moduleFor(
  'GXT @glimmer/tracking: DOM after writes',
  class extends RenderingTestCase {
    register(name: string, template: string, definition: object = templateOnly()) {
      this.owner.register(
        `component:${name}`,
        setComponentTemplate(precompileTemplate(template) as any, definition)
      );
    }

    '@test a classic component re-renders its own tracked property'() {
      let instance: any;
      class Counter extends ClassicComponent {
        @tracked count = 0;

        init(properties?: object) {
          super.init(properties);
          instance = this;
        }

        increment = () => {
          this.count++;
        };
      }
      this.register(
        'counter',
        '<button {{on "click" this.increment}}>{{this.count}}</button>',
        Counter
      );

      this.render('<Counter />');
      this.assertText('0');

      runTask(() => this.$('button').click());
      this.assertText('1');

      runTask(() => (instance.count = 5));
      this.assertText('5');

      runTask(() => set(instance, 'count', 6));
      this.assertText('6');

      runTask(() => (instance.count = 0));
      this.assertText('0');
    }

    '@test a Glimmer component re-renders its own tracked property and a getter over it'() {
      let instance: any;
      class Counter extends GlimmerComponent {
        @tracked count = 0;

        constructor(owner: any, args: any) {
          super(owner, args);
          instance = this;
        }

        get double() {
          return this.count * 2;
        }

        increment = () => {
          this.count++;
        };
      }
      this.register(
        'counter',
        '<button {{on "click" this.increment}}>{{this.count}}/{{this.double}}</button>',
        Counter
      );

      this.render('<Counter />');
      this.assertText('0/0');

      runTask(() => this.$('button').click());
      this.assertText('1/2');

      runTask(() => (instance.count = 5));
      this.assertText('5/10');

      runTask(() => (instance.count = 0));
      this.assertText('0/0');
    }

    '@test a template-only component re-renders a tracked property of an object argument'() {
      class Person {
        @tracked name = 'Rob';
      }
      const person = new Person();
      this.register('show-name', '[{{@person.name}}]');

      this.render('<ShowName @person={{this.person}} />{{this.person.name}}', { person });
      this.assertText('[Rob]Rob');

      runTask(() => (person.name = 'Kris'));
      this.assertText('[Kris]Kris');

      runTask(() => (person.name = 'Rob'));
      this.assertText('[Rob]Rob');
    }

    '@test helpers re-compute when tracked state they read changes'() {
      class Person {
        @tracked first = 'Rob';
        @tracked last = 'Jackson';
      }
      class Store {
        @tracked count = 0;
      }
      const person = new Person();
      const store = new Store();
      class CounterService extends Service {
        @tracked count = 10;
      }
      let counterService: any;
      this.owner.register('service:counter', CounterService);
      this.registerHelper('full-name', ([p]: any[]) => `${p.first} ${p.last}`);
      this.registerHelper('store-count', () => store.count);
      this.owner.register(
        'helper:service-count',
        class extends Helper {
          // @ts-expect-error -- decorator on a class expression (Babel accepts it, experimentalDecorators not)
          @service declare counter: any;

          compute() {
            counterService = this.counter;
            return this.counter.count;
          }
        }
      );

      this.render('[{{full-name this.person}}][{{store-count}}][{{service-count}}]', { person });
      this.assertText('[Rob Jackson][0][10]');

      runTask(() => (person.first = 'Kris'));
      this.assertText('[Kris Jackson][0][10]');

      runTask(() => (store.count = 1));
      this.assertText('[Kris Jackson][1][10]');

      runTask(() => (counterService.count = 11));
      this.assertText('[Kris Jackson][1][11]');

      runTask(() => {
        person.first = 'Rob';
        store.count = 0;
        counterService.count = 10;
      });
      this.assertText('[Rob Jackson][0][10]');
    }

    '@test {{#each}} rows re-render tracked properties of their items and the tracked list'() {
      class Item {
        @tracked name: string;

        constructor(name: string) {
          this.name = name;
        }
      }
      class List {
        @tracked items = [new Item('a'), new Item('b')];
      }
      const list = new List();

      this.render('{{#each this.list.items as |item|}}[{{item.name}}]{{/each}}', { list });
      this.assertText('[a][b]');

      runTask(() => (list.items[1]!.name = 'z'));
      this.assertText('[a][z]');

      runTask(() => (list.items[1]!.name = 'y'));
      this.assertText('[a][y]');

      runTask(() => (list.items = [...list.items, new Item('c')]));
      this.assertText('[a][y][c]');

      runTask(() => (list.items = list.items.slice(0, -1)));
      this.assertText('[a][y]');

      runTask(() => (list.items = list.items.slice(1)));
      this.assertText('[y]');

      runTask(() => (list.items[0]!.name = 'b'));
      this.assertText('[b]');
    }

    '@test {{#each}} component rows re-render their own and their item tracked state'() {
      class Item {
        @tracked name: string;

        constructor(name: string) {
          this.name = name;
        }
      }
      const items = [new Item('a'), new Item('b'), new Item('c')];
      class Row extends GlimmerComponent<any> {
        @tracked marked = false;

        toggle = () => {
          this.marked = !this.marked;
        };
      }
      this.register(
        'row',
        '<button {{on "click" this.toggle}}>{{@item.name}}{{if this.marked "*"}}</button>',
        Row
      );
      const click = (i: number) =>
        runTask(() => (this.element.querySelectorAll('button')[i] as HTMLElement).click());

      this.render('{{#each this.items as |item|}}<Row @item={{item}} />{{/each}}', { items });
      this.assertText('abc');

      runTask(() => (items[1]!.name = 'z'));
      this.assertText('azc');

      click(1);
      this.assertText('az*c');

      click(1);
      this.assertText('azc');

      click(0);
      this.assertText('a*zc');

      runTask(() => (items[0]!.name = 'y'));
      this.assertText('y*zc');

      runTask(() => (items[2]!.name = 'x'));
      this.assertText('y*zx');

      click(0);
      this.assertText('yzx');
    }

    '@test a tracked property passed as an argument re-renders the child'() {
      let parent: any;
      let child: any;
      class Parent extends GlimmerComponent {
        @tracked value = 1;
        @tracked other = 'p';

        constructor(owner: any, args: any) {
          super(owner, args);
          parent = this;
        }
      }
      class Child extends GlimmerComponent<any> {
        // Same name as an argument: `this.other` is the child's own state,
        // `@other` the parent's.
        @tracked other = 'c';

        constructor(owner: any, args: any) {
          super(owner, args);
          child = this;
        }

        get doubled() {
          return this.args['value'] * 2;
        }
      }
      this.register('parent', '<Child @value={{this.value}} @other={{this.other}} />', Parent);
      this.register('child', '{{@value}}:{{this.doubled}}|{{this.other}}/{{@other}}', Child);

      this.render('<Parent />');
      this.assertText('1:2|c/p');

      runTask(() => (parent.value = 2));
      this.assertText('2:4|c/p');

      runTask(() => (parent.other = 'p2'));
      this.assertText('2:4|c/p2');

      runTask(() => (child.other = 'c2'));
      this.assertText('2:4|c2/p2');

      runTask(() => {
        parent.value = 1;
        parent.other = 'p';
        child.other = 'c';
      });
      this.assertText('1:2|c/p');
    }

    '@test reading then writing a tracked property in a helper asserts with the classic message'() {
      class State {
        @tracked count = 0;
      }
      const state = new State();
      this.owner.register(
        'helper:bump',
        class extends TestHelper {
          value() {
            void state.count;
            state.count = state.count + 1;
            return '';
          }
        }
      );

      expectAssertion(
        () => {
          this.render('{{bump}}');
        },
        backtrackingMessageFor('count', 'State', {
          // @ts-expect-error -- debug-stack.js's inferred options type lacks renderTree
          renderTree: ['\\(result of a `TEST_HELPER` helper\\)'],
        })
      );
    }

    '@test a child writing a tracked property its Glimmer parent rendered asserts'() {
      let parent: any;
      class Parent extends GlimmerComponent {
        @tracked value = 'one';

        constructor(owner: any, args: any) {
          super(owner, args);
          parent = this;
        }
      }
      this.register('x-parent', '<p>{{this.value}}</p>{{yield}}', Parent);
      this.register(
        'x-child',
        'child',
        class extends GlimmerComponent {
          constructor(owner: any, args: any) {
            super(owner, args);
            parent.value = 'two';
          }
        }
      );

      expectAssertion(
        () => {
          this.render('<XParent><XChild /></XParent>');
        },
        backtrackingMessageFor('value', 'Parent')
      );
    }

    '@test a child setting a property of an object its Glimmer parent rendered asserts'() {
      class Wrapper {
        @tracked content = 'one';
      }
      this.register(
        'x-parent',
        '<p>{{this.wrapper.content}}</p><XChild @wrapper={{this.wrapper}} />',
        class extends GlimmerComponent {
          wrapper = new Wrapper();
        }
      );
      this.register(
        'x-child',
        'child',
        class extends GlimmerComponent<{ Args: { wrapper: object } }> {
          constructor(owner: any, args: any) {
            super(owner, args);
            set(this.args.wrapper, 'content', 'two');
          }
        }
      );

      expectAssertion(
        () => {
          this.render('<XParent />');
        },
        backtrackingMessageFor('content', 'Wrapper')
      );
    }

    '@test a child writing a tracked property its Glimmer parent did not render does not assert'() {
      let parent: any;
      class Parent extends GlimmerComponent {
        @tracked title = 'parent';
        @tracked registered: string | null = null;

        constructor(owner: any, args: any) {
          super(owner, args);
          parent = this;
        }
      }
      this.register('x-parent', '<p>{{this.title}}</p>{{yield}}', Parent);
      this.register(
        'x-child',
        'child',
        class extends GlimmerComponent {
          constructor(owner: any, args: any) {
            super(owner, args);
            parent.registered = 'child';
          }
        }
      );

      this.render('<XParent><XChild /></XParent>');
      this.assertText('parentchild');
      this.assert.strictEqual(parent.registered, 'child');
    }

    '@test a child setting a property its Glimmer parent did not render, of an object the parent rendered, does not assert'() {
      class Wrapper {
        @tracked content = 'one';
        @tracked other = 'a';
      }
      let wrapper = new Wrapper();
      this.register(
        'x-parent',
        '<p>{{this.wrapper.content}}</p><XChild @wrapper={{this.wrapper}} />',
        class extends GlimmerComponent {
          wrapper = wrapper;
        }
      );
      this.register(
        'x-child',
        'child',
        class extends GlimmerComponent<{ Args: { wrapper: object } }> {
          constructor(owner: any, args: any) {
            super(owner, args);
            set(this.args.wrapper, 'other', 'b');
          }
        }
      );

      this.render('<XParent />');
      this.assertText('onechild');
      this.assert.strictEqual(wrapper.other, 'b');
    }

    async '@test writes from an action, a next() run loop and a microtask re-render'() {
      class State {
        @tracked count = 0;
      }
      const state = new State();
      class Counter extends GlimmerComponent {
        state = state;

        increment = () => {
          this.state.count++;
        };
      }
      this.register(
        'counter',
        '<button {{on "click" this.increment}}>{{this.state.count}}</button>',
        Counter
      );

      this.render('<Counter />');
      this.assertText('0');

      runTask(() => this.$('button').click());
      this.assertText('1');

      await new Promise<void>((resolve) =>
        next(() => {
          state.count = 2;
          resolve();
        })
      );
      this.assertText('2');

      await Promise.resolve().then(() => {
        state.count = 3;
      });
      await renderSettled();
      this.assertText('3');

      // A click outside any run loop: the handler's write starts one.
      (this.element.querySelector('button') as HTMLElement).click();
      await renderSettled();
      this.assertText('4');
    }

    '@test a @cached getter re-computes once per dependency write'(assert: QUnit['assert']) {
      class Person {
        @tracked first = 'Jen';
        @tracked last = 'Weber';
        calls = 0;

        @cached
        get full() {
          this.calls++;
          return `${this.first} ${this.last}`;
        }
      }
      const person = new Person();
      let shout: any;
      class Shout extends GlimmerComponent {
        @tracked name = 'jen';

        constructor(owner: any, args: any) {
          super(owner, args);
          shout = this;
        }

        @cached
        get loud() {
          return this.name.toUpperCase();
        }
      }
      this.register('shout', '({{this.loud}})', Shout);

      this.render('{{this.person.full}}|{{this.person.full}}|<Shout />', { person });
      this.assertText('Jen Weber|Jen Weber|(JEN)');
      assert.strictEqual(person.calls, 1, 'computed once for two reads');

      runTask(() => (person.first = 'Kenneth'));
      this.assertText('Kenneth Weber|Kenneth Weber|(JEN)');
      assert.strictEqual(person.calls, 2, 're-computed once after a write');

      runTask(() => (person.last = 'Larsen'));
      this.assertText('Kenneth Larsen|Kenneth Larsen|(JEN)');
      assert.strictEqual(person.calls, 3, 're-computed once after the other write');

      runTask(() => (shout.name = 'kenneth'));
      this.assertText('Kenneth Larsen|Kenneth Larsen|(KENNETH)');
      assert.strictEqual(person.calls, 3, 'an unrelated write does not re-compute');

      runTask(() => (shout.name = 'jen'));
      this.assertText('Kenneth Larsen|Kenneth Larsen|(JEN)');

      runTask(() => this.rerender());
      this.assertText('Kenneth Larsen|Kenneth Larsen|(JEN)');
      assert.strictEqual(person.calls, 3, 'not re-computed without a write');
    }

    '@test a @cached getter over a Glimmer component argument re-computes when the argument changes'() {
      let parent: any;
      class Parent extends GlimmerComponent {
        @tracked value = 1;

        constructor(owner: any, args: any) {
          super(owner, args);
          parent = this;
        }
      }
      class Child extends GlimmerComponent<any> {
        @cached
        get doubled() {
          return this.args['value'] * 2;
        }
      }
      this.register('parent', '<Child @value={{this.value}} />', Parent);
      this.register('child', '{{@value}}:{{this.doubled}}', Child);

      this.render('<Parent />');
      this.assertText('1:2');

      runTask(() => (parent.value = 2));
      this.assertText('2:4');

      runTask(() => (parent.value = 3));
      this.assertText('3:6');

      runTask(() => (parent.value = 1));
      this.assertText('1:2');
    }

    '@test an inherited tracked property re-renders'() {
      class Base {
        @tracked count = 0;
      }
      class Sub extends Base {
        @tracked label = 'x';

        get text() {
          return `${this.label}${this.count}`;
        }
      }
      const sub = new Sub();
      class BaseCounter extends GlimmerComponent {
        @tracked count = 0;

        increment = () => {
          this.count++;
        };
      }
      class Counter extends BaseCounter {}
      this.register(
        'counter',
        '<button {{on "click" this.increment}}>{{this.count}}</button>',
        Counter
      );

      this.render('{{this.sub.count}}|{{this.sub.text}}|<Counter />', { sub });
      this.assertText('0|x0|0');

      runTask(() => (sub.count = 1));
      this.assertText('1|x1|0');

      runTask(() => (sub.label = 'y'));
      this.assertText('1|y1|0');

      runTask(() => this.$('button').click());
      this.assertText('1|y1|1');

      runTask(() => {
        sub.count = 0;
        sub.label = 'x';
      });
      this.assertText('0|x0|1');
    }

    '@test @tracked on objects that are not components'() {
      class Plain {
        @tracked value = 'plain';
      }
      class Model extends EmberObject {
        @tracked value = 'ember';
      }
      class Session extends Service {
        @tracked user = 'anon';
      }
      let session: any;
      this.owner.register('service:session', Session);
      class Header extends GlimmerComponent {
        @service declare session: any;

        constructor(owner: any, args: any) {
          super(owner, args);
          session = this.session;
        }
      }
      this.register('header', '{{this.session.user}}', Header);
      const plain = new Plain();
      const model = Model.create();

      this.render('{{this.plain.value}}|{{this.model.value}}|<Header />', { plain, model });
      this.assertText('plain|ember|anon');

      runTask(() => (plain.value = 'plain2'));
      this.assertText('plain2|ember|anon');

      runTask(() => set(model, 'value', 'ember2'));
      this.assertText('plain2|ember2|anon');

      runTask(() => (model.value = 'ember3'));
      this.assertText('plain2|ember3|anon');

      runTask(() => (session.user = 'rob'));
      this.assertText('plain2|ember3|rob');

      runTask(() => {
        plain.value = 'plain';
        model.value = 'ember';
        session.user = 'anon';
      });
      this.assertText('plain|ember|anon');
    }

    '@test a tracked property read by a classic computed property and an observer-free get()'() {
      class Person extends EmberObject {
        @tracked first = 'Rob';

        @computed('first')
        get greeting() {
          return `hi ${this.first}`;
        }
      }
      const person = Person.create();

      this.render('{{this.person.greeting}}|{{get this.person "first"}}', { person });
      this.assertText('hi Rob|Rob');

      runTask(() => (person.first = 'Kris'));
      this.assertText('hi Kris|Kris');

      runTask(() => set(person, 'first', 'Rob'));
      this.assertText('hi Rob|Rob');
      this.assert.strictEqual(get(person, 'greeting'), 'hi Rob');
    }
  }
);

moduleFor(
  'GXT @glimmer/tracking: Component Tracked Properties (port)',
  class extends RenderingTestCase {
    '@test simple test using glimmerish component'() {
      let personId = 0;
      class Person {
        @tracked first: any;
        @tracked last: any;
        id: number;

        constructor(first: any, last: any) {
          this.id = personId++;
          this.first = first;
          this.last = last;
        }
      }

      class PersonComponent extends GlimmerComponent<any> {
        get person() {
          return new Person(this.args['first'], this.args['last']);
        }
      }

      this.owner.register(
        'component:person-wrapper',
        setComponentTemplate(
          precompileTemplate('{{@first}} {{@last}} | {{this.person.first}} {{this.person.last}}'),
          PersonComponent
        )
      );

      this.render('<PersonWrapper @first={{this.first}} @last={{this.last}} />', {
        first: 'robert',
        last: 'jackson',
      });

      this.assertText('robert jackson | robert jackson');

      runTask(() => (this.context as any).set('first', 'max'));
      this.assertText('max jackson | max jackson');
    }

    '@test tracked properties that are uninitialized do not throw an error'() {
      class CountComponent extends GlimmerComponent {
        @tracked count: any;

        increment = () => {
          if (!this.count) {
            this.count = 0;
          }
          this.count++;
        };
      }

      this.owner.register(
        'component:counter',
        setComponentTemplate(
          precompileTemplate('<button {{on "click" this.increment}}>{{this.count}}</button>'),
          CountComponent
        )
      );

      this.render('<Counter />');

      this.assertText('');

      runTask(() => this.$('button').click());

      this.assertText('1');
    }

    '@test tracked properties rerender when updated'() {
      class CountComponent extends GlimmerComponent {
        @tracked count = 0;

        increment = () => {
          this.count++;
        };
      }

      this.owner.register(
        'component:counter',
        setComponentTemplate(
          precompileTemplate('<button {{on "click" this.increment}}>{{this.count}}</button>'),
          CountComponent
        )
      );

      this.render('<Counter />');

      this.assertText('0');

      runTask(() => this.$('button').click());

      this.assertText('1');
    }

    '@test tracked properties rerender when updated outside of a runloop'(assert: QUnit['assert']) {
      let done = assert.async();

      class CountComponent extends GlimmerComponent {
        @tracked count = 0;

        increment = () => {
          setTimeout(() => {
            this.count++;
          }, 100);
        };
      }

      this.owner.register(
        'component:counter',
        setComponentTemplate(
          precompileTemplate('<button {{on "click" this.increment}}>{{this.count}}</button>'),
          CountComponent
        )
      );

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

      class CountComponent extends GlimmerComponent {
        counter = new Counter();

        increment = () => this.counter.count++;
      }

      this.owner.register(
        'component:counter',
        setComponentTemplate(
          precompileTemplate(
            '<button {{on "click" this.increment}}>{{this.counter.count}}</button>'
          ),
          CountComponent
        )
      );

      this.render('<Counter />');

      this.assertText('0');

      runTask(() => this.$('button').click());

      this.assertText('1');
    }

    '@test array properties rerender when updated'() {
      class NumListComponent extends GlimmerComponent {
        @tracked numbers = A([1, 2, 3]);

        addNumber = () => this.numbers.pushObject(4);
      }

      this.owner.register(
        'component:num-list',
        setComponentTemplate(
          precompileTemplate(
            '<button {{on "click" this.addNumber}}>{{#each this.numbers as |num|}}{{num}}{{/each}}</button>'
          ),
          NumListComponent
        )
      );

      this.render('<NumList />');

      this.assertText('123');

      runTask(() => this.$('button').click());

      this.assertText('1234');
    }

    '@test getters update when dependent properties are invalidated'() {
      class CountComponent extends GlimmerComponent {
        @tracked count = 0;

        get countAlias() {
          return this.count;
        }

        increment = () => this.count++;
      }

      this.owner.register(
        'component:counter',
        setComponentTemplate(
          precompileTemplate('<button {{on "click" this.increment}}>{{this.countAlias}}</button>'),
          CountComponent
        )
      );

      this.render('<Counter />');

      this.assertText('0');

      runTask(() => this.$('button').click());

      this.assertText('1');
    }

    '@test getters update when dependent computeds are invalidated'() {
      class CountComponent extends GlimmerComponent {
        @tracked _count = 0;

        @computed({
          get(this: CountComponent) {
            return this._count;
          },
          set(this: CountComponent, _key: string, value: number) {
            return (this._count = value);
          },
        })
        declare count: number;

        get countAlias() {
          return this.count;
        }
        increment = () => set(this, 'count', this.count + 1);
      }

      this.owner.register(
        'component:counter',
        setComponentTemplate(
          precompileTemplate('<button {{on "click" this.increment}}>{{this.countAlias}}</button>'),
          CountComponent
        )
      );

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

      class CountComponent extends GlimmerComponent {
        counter = new Counter();

        increment = () => this.counter.count++;
      }

      this.owner.register(
        'component:counter',
        setComponentTemplate(
          precompileTemplate(
            '<button {{on "click" this.increment}}>{{this.counter.countAlias}}</button>'
          ),
          CountComponent
        )
      );

      this.render('<Counter />');

      this.assertText('0');

      runTask(() => this.$('button').click());

      this.assertText('1');
    }

    '@test tracked object passed down through components updates correctly'(
      assert: QUnit['assert']
    ) {
      class Person {
        @tracked first = 'Rob';
        @tracked last = 'Jackson';

        get full() {
          return `${this.first} ${this.last}`;
        }
      }

      class ParentComponent extends GlimmerComponent {
        person = new Person();
      }

      class ChildComponent extends GlimmerComponent<any> {
        updatePerson = () => {
          this.args['person'].first = 'Kris';
          this.args['person'].last = 'Selden';
        };
      }

      this.owner.register(
        'component:parent',
        setComponentTemplate(
          precompileTemplate(
            '<div id="parent">{{this.person.full}}</div><Child @person={{this.person}}/>'
          ),
          ParentComponent
        )
      );

      this.owner.register(
        'component:child',
        setComponentTemplate(
          precompileTemplate(
            '<div id="child">{{@person.full}}</div><button onclick={{this.updatePerson}}></button>'
          ),
          ChildComponent
        )
      );

      this.render('<Parent />');

      assert.equal(this.$('#parent').text(), 'Rob Jackson');
      assert.equal(this.$('#child').text(), 'Rob Jackson');

      runTask(() => this.$('button').click());

      assert.equal(this.$('#parent').text(), 'Kris Selden');
      assert.equal(this.$('#child').text(), 'Kris Selden');
    }

    '@test yielded getters update correctly'() {
      class PersonComponent extends GlimmerComponent {
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

      this.owner.register(
        'component:person',
        setComponentTemplate(
          precompileTemplate('{{yield this.full this.updatePerson}}'),
          PersonComponent
        )
      );

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
      class PersonComponent extends GlimmerComponent {
        person = new Person();

        updatePerson = () => {
          this.person.first = 'Kris';
          this.person.last = 'Selden';
        };
      }

      this.owner.register(
        'component:person',
        setComponentTemplate(
          precompileTemplate('{{yield this.person this.updatePerson}}'),
          PersonComponent
        )
      );

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

    '@test downstream property changes do not invalidate upstream component getters/arguments'(
      assert: QUnit['assert']
    ) {
      let outerRenderCount = 0;
      let innerRenderCount = 0;

      class OuterComponent extends GlimmerComponent<any> {
        get count() {
          outerRenderCount++;
          return this.args['count'];
        }
      }

      class InnerComponent extends GlimmerComponent<any> {
        @tracked count = 0;

        get combinedCounts() {
          innerRenderCount++;
          return this.args['count'] + this.count;
        }

        updateInnerCount = () => {
          this.count++;
        };
      }

      this.owner.register(
        'component:outer',
        setComponentTemplate(precompileTemplate('<Inner @count={{this.count}}/>'), OuterComponent)
      );

      this.owner.register(
        'component:inner',
        setComponentTemplate(
          precompileTemplate(
            '<button {{on "click" this.updateInnerCount}}>{{this.combinedCounts}}</button>'
          ),
          InnerComponent
        )
      );

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

      runTask(() => (this.context as any).set('count', 1));

      this.assertText('2');

      assert.equal(outerRenderCount, 2, 'outer component updates based on context');
      assert.equal(innerRenderCount, 3, 'inner component updates based on outer component');
    }
  }
);

moduleFor(
  'GXT @glimmer/tracking: Helper Tracked Properties (port)',
  class extends RenderingTestCase {
    '@test tracked properties rerender when updated'(assert: QUnit['assert']) {
      let computeCount = 0;

      class PersonComponent extends GlimmerComponent {
        @tracked name = 'bob';
        updateName = () => {
          this.name = 'sal';
        };
      }

      this.owner.register(
        'component:person',
        setComponentTemplate(
          precompileTemplate(
            '<button onclick={{this.updateName}}>{{hello-world this.name}}</button>'
          ),
          PersonComponent
        )
      );

      this.registerHelper('hello-world', ([value]: any[]) => {
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

    '@test nested tracked properties rerender when updated'(assert: QUnit['assert']) {
      let computeCount = 0;

      class Person extends EmberObject {
        @tracked
        name = 'bob';
      }

      this.registerHelper('hello-world', ([value]: any[]) => {
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

      runTask(() => ((this.context as any).model.name = 'sal'));

      this.assertText('sal-value');

      assert.strictEqual(computeCount, 2, 'compute is called exactly 2 times');
    }

    '@test getters update when dependent properties are invalidated'(assert: QUnit['assert']) {
      let computeCount = 0;

      class PersonComponent extends GlimmerComponent {
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

      this.owner.register(
        'component:person',
        setComponentTemplate(
          precompileTemplate(
            '<button onclick={{this.updatePerson}}>{{hello-world this.full}}</button>'
          ),
          PersonComponent
        )
      );

      this.registerHelper('hello-world', ([value]: any[]) => {
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

    '@test nested getters update when dependent properties are invalidated'(
      assert: QUnit['assert']
    ) {
      let computeCount = 0;

      class Person extends EmberObject {
        @tracked
        first = 'Rob';
        @tracked
        last = 'Jackson';

        get full() {
          return `${this.first} ${this.last}`;
        }
      }

      this.registerHelper('hello-world', ([value]: any[]) => {
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
        (this.context as any).model.first = 'Kris';
        (this.context as any).model.last = 'Selden';
      });

      this.assertText('Kris Selden');

      assert.strictEqual(computeCount, 2, 'compute is called exactly 2 times');
    }

    '@test functional helpers autotrack based on non-argument tracked props that are accessed'(
      assert: QUnit['assert']
    ) {
      let computeCount = 0;

      let currentUserService: any;
      this.registerService(
        'current-user',
        class extends Service {
          // @ts-expect-error -- decorator on a class expression (Babel accepts it, experimentalDecorators not)
          @tracked
          name = 'bob';

          init(properties?: object) {
            super.init(properties);
            currentUserService = this;
          }
        }
      );

      this.owner.register(
        'component:person',
        setComponentTemplate(
          precompileTemplate('{{hello-world this.currentUser}}'),
          class extends GlimmerComponent {
            // @ts-expect-error -- decorator on a class expression (Babel accepts it, experimentalDecorators not)
            @service('current-user')
            declare currentUser: any;
          }
        )
      );

      this.registerHelper('hello-world', ([service]: any[]) => {
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

    '@test class based helpers are autotracked'(assert: QUnit['assert']) {
      let computeCount = 0;

      class TrackedClass extends EmberObject {
        @tracked
        value = 'bob';
      }

      let trackedInstance = TrackedClass.create();

      this.owner.register(
        'component:person',
        setComponentTemplate(
          precompileTemplate(`{{hello-world}}`),
          class extends GlimmerComponent {}
        )
      );

      this.registerHelper('hello-world', {
        compute() {
          computeCount++;
          return `${trackedInstance.value}-value`;
        },
      } as any);

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

    '@test custom helpers give a helpful assertion when reading then mutating a tracked value within constructor'() {
      this.owner.register(
        'helper:hello',
        class extends TestHelper {
          // @ts-expect-error -- decorator on a class expression (Babel accepts it, experimentalDecorators not)
          @tracked foo = 123;

          constructor(owner: any, args: unknown) {
            super(owner, args);

            // first read the tracked property
            void this.foo;

            // then attempt to update the tracked property
            this.foo = 456;
          }

          value() {
            return this.foo;
          }
        }
      );

      expectAssertion(() => {
        this.render('{{hello}}');
      }, backtrackingMessageFor('foo'));
    }

    '@test custom helpers give a helpful assertion when reading then mutating a tracked value within value'() {
      this.owner.register(
        'helper:hello',
        class extends TestHelper {
          // @ts-expect-error -- decorator on a class expression (Babel accepts it, experimentalDecorators not)
          @tracked foo = 123;

          value() {
            // first read the tracked property
            void this.foo;

            // then attempt to update the tracked property
            this.foo = 456;
          }
        }
      );

      expectAssertion(
        () => {
          this.render('{{hello}}');
        },
        backtrackingMessageFor('foo', '.*', {
          // @ts-expect-error -- debug-stack.js's inferred options type lacks renderTree
          renderTree: ['\\(result of a `TEST_HELPER` helper\\)'],
        })
      );
    }
  }
);

moduleFor(
  'GXT @glimmer/tracking: @cached (port)',
  class extends AbstractTestCase {
    '@test it works'() {
      let assert = this.assert;

      class Person {
        @tracked firstName = 'Jen';
        @tracked lastName = 'Weber';

        @cached
        get fullName() {
          let fullName = `${this.firstName} ${this.lastName}`;

          assert.step(fullName);
          return fullName;
        }
      }

      let person = new Person();

      assert.verifySteps([], 'getter is not called after class initialization');

      assert.strictEqual(person.fullName, 'Jen Weber');
      assert.verifySteps(['Jen Weber'], 'getter was called after property access');

      assert.strictEqual(person.fullName, 'Jen Weber');
      assert.verifySteps([], 'getter was not called again after repeated property access');

      person.firstName = 'Kenneth';
      assert.verifySteps([], 'changing a property does not trigger an eager re-computation');

      assert.strictEqual(person.fullName, 'Kenneth Weber');
      assert.verifySteps(['Kenneth Weber'], 'accessing the property triggers a re-computation');

      assert.strictEqual(person.fullName, 'Kenneth Weber');
      assert.verifySteps([], 'getter was not called again after repeated property access');

      person.lastName = 'Larsen';
      assert.verifySteps([], 'changing a property does not trigger an eager re-computation');

      assert.strictEqual(person.fullName, 'Kenneth Larsen');
      assert.verifySteps(['Kenneth Larsen'], 'accessing the property triggers a re-computation');
    }

    '@test it has a separate cache per class instance'() {
      let assert = this.assert;

      class Person {
        @tracked firstName: string;
        @tracked lastName: string;

        constructor(firstName: string, lastName: string) {
          this.firstName = firstName;
          this.lastName = lastName;
        }

        @cached
        get fullName() {
          let fullName = `${this.firstName} ${this.lastName}`;
          assert.step(fullName);
          return fullName;
        }
      }

      let jen = new Person('Jen', 'Weber');
      let chris = new Person('Chris', 'Garrett');

      assert.verifySteps([], 'getter is not called after class initialization');

      assert.strictEqual(jen.fullName, 'Jen Weber');
      assert.verifySteps(['Jen Weber'], 'getter was called after property access');

      assert.strictEqual(jen.fullName, 'Jen Weber');
      assert.verifySteps([], 'getter was not called again after repeated property access');

      assert.strictEqual(chris.fullName, 'Chris Garrett', 'other instance has a different value');
      assert.verifySteps(['Chris Garrett'], 'getter was called after property access');

      assert.strictEqual(chris.fullName, 'Chris Garrett');
      assert.verifySteps([], 'getter was not called again after repeated property access');

      chris.lastName = 'Manson';
      assert.verifySteps([], 'changing a property does not trigger an eager re-computation');

      assert.strictEqual(jen.fullName, 'Jen Weber', 'other instance is unaffected');
      assert.verifySteps([], 'getter was not called again after repeated property access');

      assert.strictEqual(chris.fullName, 'Chris Manson');
      assert.verifySteps(['Chris Manson'], 'getter was called after property access');

      assert.strictEqual(jen.fullName, 'Jen Weber', 'other instance is unaffected');
      assert.verifySteps([], 'getter was not called again after repeated property access');
    }
  }
);

// What `@glimmer/tracking` gives as metal's `tracked` / `cached` (upstream's
// `@glimmer/tracking` re-exports them) and gxt-backend's former copy did not:
// the meta descriptor that `get` / `set` / the component manager see, a field
// initializer that reads `this`, the `equals` option, the classic-class field
// form, and the array consumption of a tracked array value. (The standalone
// `tracked(value)` does not re-render under GXT yet, with either copy: the
// compat baseline's `Component Tracked Properties` standalone tests.)
moduleFor(
  'GXT @glimmer/tracking: the forms of metal tracked',
  class extends RenderingTestCase {
    '@test @glimmer/tracking is metal tracked'(assert: QUnit['assert']) {
      class Person {
        @tracked name = 'Rob';
      }
      const person = new Person();
      const desc = (peekMeta(Person.prototype) as any)?.peekDescriptors?.('name');
      assert.ok(desc instanceof TrackedDescriptor, 'the decorator records a TrackedDescriptor');
      assert.strictEqual(person.name, 'Rob');
    }

    '@test a field initializer can read this'() {
      class Counter extends GlimmerComponent<any> {
        @tracked count = this.args['start'] * 10;

        increment = () => {
          this.count++;
        };
      }
      this.owner.register(
        'component:counter',
        setComponentTemplate(
          precompileTemplate('<button {{on "click" this.increment}}>{{this.count}}</button>'),
          Counter
        )
      );

      this.render('<Counter @start={{2}} />');
      this.assertText('20');

      runTask(() => this.$('button').click());
      this.assertText('21');
    }

    '@test the equals option skips a write of an equal value'(assert: QUnit['assert']) {
      let computeCount = 0;
      class State {
        @tracked({ equals: (a: any, b: any) => a.id === b.id }) item = { id: 1, label: 'a' };
      }
      const state = new State();
      this.registerHelper('label', ([item]: any[]) => {
        computeCount++;
        return item.label;
      });

      this.render('{{label this.state.item}}', { state });
      this.assertText('a');
      assert.strictEqual(computeCount, 1);

      runTask(() => (state.item = { id: 1, label: 'b' }));
      this.assertText('a');
      assert.strictEqual(computeCount, 1, 'an equal value does not notify');

      runTask(() => (state.item = { id: 2, label: 'c' }));
      this.assertText('c');
      assert.strictEqual(computeCount, 2);
    }

    '@test tracked() on a classic class'() {
      const Person = EmberObject.extend({
        name: tracked({ value: 'Zoey' }),
        songs: tracked({ initializer: () => ['a'] }),
      });
      const person: any = Person.create();

      this.render('{{this.person.name}}:{{#each this.person.songs as |s|}}{{s}}{{/each}}', {
        person,
      });
      this.assertText('Zoey:a');

      runTask(() => (person.name = 'Tomster'));
      this.assertText('Tomster:a');

      runTask(() => set(person, 'songs', ['a', 'b']));
      this.assertText('Tomster:ab');
    }

    '@test array properties rerender when updated (Helper Tracked Properties)'() {
      class NumListComponent extends GlimmerComponent {
        @tracked numbers = A([1, 2, 3]);

        addNumber = () => {
          this.numbers.pushObject(4);
        };
      }

      this.owner.register(
        'component:num-list',
        setComponentTemplate(
          precompileTemplate(
            '<button {{on "click" this.addNumber}}>{{join this.numbers}}</button>'
          ),
          NumListComponent
        )
      );

      this.registerHelper('join', ([value]: any[]) => {
        return value.join(', ');
      });

      this.render('<NumList />');

      this.assertText('1, 2, 3');

      runTask(() => this.$('button').click());

      this.assertText('1, 2, 3, 4');
    }

    '@test a tracked array property consumes the array'() {
      class List {
        @tracked items = A(['a']);
      }
      const list = new List();
      this.registerHelper('join', ([items]: any[]) => items.join(','));

      this.render('{{join this.list.items}}', { list });
      this.assertText('a');

      runTask(() => list.items.pushObject('b'));
      this.assertText('a,b');
    }
  }
);
