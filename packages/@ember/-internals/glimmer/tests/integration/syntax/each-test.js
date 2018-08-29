import { get, set, notifyPropertyChange } from '@ember/-internals/metal';
import { applyMixins, strip } from '../../utils/abstract-test-case';
import { moduleFor, RenderingTest } from '../../utils/test-case';
import { A as emberA, ArrayProxy, RSVP } from '@ember/-internals/runtime';
import { Component } from '../../utils/helpers';
import { HAS_NATIVE_SYMBOL } from '@ember/-internals/utils';

import {
  TogglingSyntaxConditionalsTest,
  TruthyGenerator,
  FalsyGenerator,
  ArrayTestCases,
} from '../../utils/shared-conditional-tests';

class ArrayDelegate {
  constructor(content, target) {
    this._array = content;
    this._target = target || this;
  }

  // The following methods are APIs used by the tests

  toArray() {
    return this._array.slice();
  }

  objectAt(idx) {
    return this._array[idx];
  }

  clear() {
    this._array.length = 0;
    this.arrayContentDidChange();
  }

  replace(idx, del, ins) {
    this._array.splice(idx, del, ...ins);
    this.arrayContentDidChange();
  }

  unshiftObject(obj) {
    this._array.unshift(obj);
    this.arrayContentDidChange();
  }

  unshiftObjects(arr) {
    this._array.unshift(...arr);
    this.arrayContentDidChange();
  }

  pushObject(obj) {
    this._array.push(obj);
    this.arrayContentDidChange();
  }

  pushObjects(arr) {
    this._array.push(...arr);
    this.arrayContentDidChange();
  }

  shiftObject() {
    let obj = this._array.shift();
    this.arrayContentDidChange();
    return obj;
  }

  popObject() {
    let obj = this._array.pop();
    this.arrayContentDidChange();
    return obj;
  }

  insertAt(idx, obj) {
    this._array.splice(idx, 0, obj);
    this.arrayContentDidChange();
  }

  removeAt(idx, len = 1) {
    this._array.splice(idx, len);
    this.arrayContentDidChange();
  }

  arrayContentDidChange() {
    notifyPropertyChange(this._target, '[]');
    notifyPropertyChange(this._target, 'length');
  }

  toString() {
    return `#<${this.constructor.name || 'UnknownArrayDelegate'}>`;
  }

  toJSON() {
    return this.toString();
  }
}

const makeSet = (() => {
  // IE11 does not support `new Set(items);`
  let set = new Set([1, 2, 3]);

  if (set.size === 3) {
    return items => new Set(items);
  } else {
    return items => {
      let s = new Set();
      items.forEach(value => s.add(value));
      return s;
    };
  }
})();

class SetDelegate extends ArrayDelegate {
  constructor(set) {
    let array = [];
    set.forEach(value => array.push(value));
    super(array, set);
    this._set = set;
  }

  arrayContentDidChange() {
    this._set.clear();
    this._array.forEach(value => this._set.add(value));
    super.arrayContentDidChange();
  }
}

class ForEachable extends ArrayDelegate {
  get length() {
    return this._array.length;
  }

  forEach(callback) {
    this._array.forEach(callback);
  }
}

let ArrayIterable;

if (HAS_NATIVE_SYMBOL) {
  ArrayIterable = class extends ArrayDelegate {
    [Symbol.iterator]() {
      return this._array[Symbol.iterator]();
    }
  };
}

class TogglingEachTest extends TogglingSyntaxConditionalsTest {
  get truthyValue() {
    return ['non-empty'];
  }
  get falsyValue() {
    return [];
  }
}

class BasicEachTest extends TogglingEachTest {}

const TRUTHY_CASES = [
  ['hello'],
  emberA(['hello']),
  makeSet(['hello']),
  new ForEachable(['hello']),
  ArrayProxy.create({ content: ['hello'] }),
  ArrayProxy.create({ content: emberA(['hello']) }),
];

const FALSY_CASES = [
  null,
  undefined,
  false,
  '',
  0,
  [],
  emberA([]),
  makeSet([]),
  new ForEachable([]),
  ArrayProxy.create({ content: [] }),
  ArrayProxy.create({ content: emberA([]) }),
];

if (HAS_NATIVE_SYMBOL) {
  TRUTHY_CASES.push(new ArrayIterable(['hello']));
  FALSY_CASES.push(new ArrayIterable([]));
}

applyMixins(
  BasicEachTest,
  new TruthyGenerator(TRUTHY_CASES),
  new FalsyGenerator(FALSY_CASES),
  ArrayTestCases
);

moduleFor(
  'Syntax test: toggling {{#each}}',
  class extends BasicEachTest {
    templateFor({ cond, truthy, falsy }) {
      return `{{#each ${cond}}}${truthy}{{else}}${falsy}{{/each}}`;
    }
  }
);

moduleFor(
  'Syntax test: toggling {{#each as}}',
  class extends BasicEachTest {
    templateFor({ cond, truthy, falsy }) {
      return `{{#each ${cond} as |test|}}${truthy}{{else}}${falsy}{{/each}}`;
    }
  }
);

class EachEdgeCasesTest extends TogglingEachTest {}

applyMixins(
  EachEdgeCasesTest,

  new FalsyGenerator([
    true,
    'hello',
    1,
    Object,
    function() {},
    {},
    { foo: 'bar' },
    Object.create(null),
    Object.create({}),
    Object.create({ foo: 'bar' }),
  ])
);

moduleFor(
  'Syntax test: toggling {{#each}}',
  class extends EachEdgeCasesTest {
    templateFor({ cond, truthy, falsy }) {
      return `{{#each ${cond}}}${truthy}{{else}}${falsy}{{/each}}`;
    }
  }
);

moduleFor(
  'Syntax test: toggling {{#each as}}',
  class extends EachEdgeCasesTest {
    templateFor({ cond, truthy, falsy }) {
      return `{{#each ${cond} as |test|}}${truthy}{{else}}${falsy}{{/each}}`;
    }
  }
);

class AbstractEachTest extends RenderingTest {
  /* abstract */
  createList(/* items */) {
    throw new Error('Not implemented: `createList`');
  }

  makeList(items) {
    let { list, delegate } = this.createList(items);

    this.list = list;
    this.delegate = delegate;
  }

  replaceList(list) {
    this.runTask(() => set(this.context, 'list', this.createList(list).list));
  }

  forEach(callback) {
    return this.delegate.toArray().forEach(callback);
  }

  objectAt(idx) {
    return this.delegate.objectAt(idx);
  }

  clear() {
    return this.delegate.clear();
  }

  replace(idx, del, ins) {
    return this.delegate.replace(idx, del, ins);
  }

  unshiftObject(obj) {
    return this.delegate.unshiftObject(obj);
  }

  unshiftObjects(arr) {
    return this.delegate.unshiftObjects(arr);
  }

  pushObject(obj) {
    return this.delegate.pushObject(obj);
  }

  pushObjects(arr) {
    return this.delegate.pushObjects(arr);
  }

  shiftObject() {
    return this.delegate.shiftObject();
  }

  popObject() {
    return this.delegate.popObject();
  }

  insertAt(idx, obj) {
    return this.delegate.insertAt(idx, obj);
  }

  removeAt(idx, len) {
    return this.delegate.removeAt(idx, len);
  }

  render(template, context = {}) {
    if (this.list !== undefined) {
      context.list = this.list;
    }

    return super.render(template, context);
  }
}

class EachTest extends AbstractEachTest {
  /* single each */

  ['@test it repeats the given block for each item in the array']() {
    this.makeList([{ text: 'hello' }]);

    this.render(`{{#each list as |item|}}{{item.text}}{{else}}Empty{{/each}}`);

    this.assertText('hello');

    this.runTask(() => this.rerender());

    this.assertText('hello');

    this.runTask(() => set(this.objectAt(0), 'text', 'Hello'));

    this.assertText('Hello');

    this.runTask(() => {
      this.pushObject({ text: ' ' });
      this.pushObject({ text: 'World' });
    });

    this.assertText('Hello World');

    this.runTask(() => {
      this.pushObject({ text: 'Earth' });
      this.removeAt(1);
      this.insertAt(1, { text: 'Globe' });
    });

    this.assertText('HelloGlobeWorldEarth');

    this.runTask(() => {
      this.pushObject({ text: 'Planet' });
      this.removeAt(1);
      this.insertAt(1, { text: ' ' });
      this.pushObject({ text: ' ' });
      this.pushObject({ text: 'Earth' });
      this.removeAt(3);
    });

    this.assertText('Hello WorldPlanet Earth');

    this.runTask(() => {
      this.pushObject({ text: 'Globe' });
      this.removeAt(1);
      this.insertAt(1, { text: ' ' });
      this.pushObject({ text: ' ' });
      this.pushObject({ text: 'World' });
      this.removeAt(2);
    });

    this.assertText('Hello Planet EarthGlobe World');

    this.runTask(() => this.replace(2, 4, [{ text: 'my' }]));

    this.assertText('Hello my World');

    this.runTask(() => this.clear());

    this.assertText('Empty');

    this.replaceList([{ text: 'hello' }]);

    this.assertText('hello');
  }

  ['@test it receives the index as the second parameter']() {
    this.makeList([{ text: 'hello' }, { text: 'world' }]);

    this.render(`{{#each list as |item index|}}[{{index}}. {{item.text}}]{{/each}}`);

    this.assertText('[0. hello][1. world]');

    this.assertStableRerender();

    this.runTask(() => this.insertAt(1, { text: 'my' }));

    this.assertText('[0. hello][1. my][2. world]');

    this.replaceList([{ text: 'hello' }, { text: 'world' }]);

    this.assertText('[0. hello][1. world]');
  }

  ['@test it accepts a string key']() {
    this.makeList([{ text: 'hello' }, { text: 'world' }]);

    this.render(`{{#each list key='text' as |item|}}{{item.text}}{{/each}}`);

    this.assertText('helloworld');

    this.assertStableRerender();

    this.runTask(() => this.pushObject({ text: 'again' }));

    this.assertText('helloworldagain');

    this.replaceList([{ text: 'hello' }, { text: 'world' }]);

    this.assertText('helloworld');
  }

  ['@test it accepts a numeric key']() {
    this.makeList([{ id: 1 }, { id: 2 }]);

    this.render(`{{#each list key='id' as |item|}}{{item.id}}{{/each}}`);

    this.assertText('12');

    this.assertStableRerender();

    this.runTask(() => this.pushObject({ id: 3 }));

    this.assertText('123');

    this.replaceList([{ id: 1 }, { id: 2 }]);

    this.assertText('12');
  }

  ['@test it can specify @index as the key']() {
    this.makeList([{ id: 1 }, { id: 2 }]);

    this.render(`{{#each list key='@index' as |item|}}{{item.id}}{{/each}}`);

    this.assertText('12');

    this.assertStableRerender();

    this.runTask(() => this.pushObject({ id: 3 }));

    this.assertText('123');

    this.replaceList([{ id: 1 }, { id: 2 }]);

    this.assertText('12');
  }

  ['@test it can specify @identity as the key for arrays of primitives']() {
    this.makeList([1, 2]);

    this.render(`{{#each list key='@identity' as |item|}}{{item}}{{/each}}`);

    this.assertText('12');

    this.assertStableRerender();

    this.runTask(() => this.pushObject(3));

    this.assertText('123');

    this.replaceList([1, 2]);

    this.assertText('12');
  }

  ['@test it can specify @identity as the key for mixed arrays of objects and primitives']() {
    this.makeList([1, { id: 2 }, 3]);

    this.render(`{{#each list key='@identity' as |item|}}{{if item.id item.id item}}{{/each}}`);

    this.assertText('123');

    this.assertStableRerender();

    this.runTask(() => this.insertAt(2, { id: 4 }));

    this.assertText('1243');

    this.replaceList([1, { id: 2 }, 3]);

    this.assertText('123');
  }

  ['@test it can render duplicate primitive items']() {
    this.makeList(['a', 'a', 'a']);

    this.render(`{{#each list as |item|}}{{item}}{{/each}}`);

    this.assertText('aaa');

    this.assertStableRerender();

    this.runTask(() => this.pushObject('a'));

    this.assertText('aaaa');

    this.runTask(() => this.pushObject('a'));

    this.assertText('aaaaa');

    this.replaceList(['a', 'a', 'a']);

    this.assertText('aaa');
  }

  [`@test updating and setting within #each`]() {
    this.makeList([{ value: 1 }, { value: 2 }, { value: 3 }]);

    let FooBarComponent = Component.extend({
      init() {
        this._super(...arguments);
        this.isEven = true;
        this.tagName = 'li';
      },

      _isEven() {
        this.set('isEven', this.get('item.value') % 2 === 0);
      },

      didUpdate() {
        this._isEven();
      },
    });

    this.registerComponent('foo-bar', {
      ComponentClass: FooBarComponent,
      template: '{{#if isEven}}{{item.value}}{{/if}}',
    });

    this.render(strip`
      {{#each list as |item|}}
        <li>Prev</li>
        {{foo-bar item=item}}
        <li>Next</li>
      {{/each}}
    `);

    this.assertText('Prev1NextPrev2NextPrev3Next');

    this.assertStableRerender();

    this.runTask(() => set(this.objectAt(0), 'value', 3));

    this.assertText('PrevNextPrev2NextPrev3Next');

    this.replaceList([{ value: 1 }, { value: 2 }, { value: 3 }]);

    this.assertText('Prev1NextPrev2NextPrev3Next');
  }

  ['@test it can render duplicate objects']() {
    let duplicateItem = { text: 'foo' };

    this.makeList([duplicateItem, duplicateItem, { text: 'bar' }, { text: 'baz' }]);

    this.render(`{{#each list as |item|}}{{item.text}}{{/each}}`);

    this.assertText('foofoobarbaz');

    this.assertStableRerender();

    this.runTask(() => this.pushObject(duplicateItem));

    this.assertText('foofoobarbazfoo');

    this.runTask(() => this.pushObject(duplicateItem));

    this.assertText('foofoobarbazfoofoo');

    this.replaceList([duplicateItem, duplicateItem, { text: 'bar' }, { text: 'baz' }]);

    this.assertText('foofoobarbaz');
  }

  [`@test it maintains DOM stability when condition changes between objects with the same keys`]() {
    this.makeList([{ text: 'Hello' }, { text: ' ' }, { text: 'world' }]);

    this.render(`{{#each list key="text" as |item|}}{{item.text}}{{/each}}`);

    this.assertText('Hello world');

    this.takeSnapshot();

    this.runTask(() => {
      this.popObject();
      this.popObject();
      this.pushObject({ text: ' ' });
      this.pushObject({ text: 'world' });
    });

    this.assertText('Hello world');

    this.assertInvariants();

    this.replaceList([{ text: 'Hello' }, { text: ' ' }, { text: 'world' }]);

    this.assertText('Hello world');

    this.assertInvariants();
  }

  [`@test it maintains DOM stability for stable keys when list is updated`]() {
    this.makeList([{ text: 'Hello' }, { text: ' ' }, { text: 'world' }]);

    this.render(`{{#each list key="text" as |item|}}{{item.text}}{{/each}}`);

    this.assertText('Hello world');

    this.assertStableRerender();

    let oldSnapshot = this.takeSnapshot();

    this.runTask(() => {
      this.unshiftObject({ text: ', ' });
      this.unshiftObject({ text: 'Hi' });
      this.pushObject({ text: '!' });
      this.pushObject({ text: 'earth' });
    });

    this.assertText('Hi, Hello world!earth');

    this.assertPartialInvariants(2, 5);

    this.replaceList([{ text: 'Hello' }, { text: ' ' }, { text: 'world' }]);

    this.assertText('Hello world');

    this.assertInvariants(oldSnapshot, this.takeSnapshot());
  }

  [`@test it renders all items with duplicate key values`]() {
    this.makeList([{ text: 'Hello' }, { text: 'Hello' }, { text: 'Hello' }]);

    this.render(`{{#each list key="text" as |item|}}{{item.text}}{{/each}}`);

    this.assertText('HelloHelloHello');

    this.runTask(() => {
      this.forEach(hash => set(hash, 'text', 'Goodbye'));
    });

    this.assertText('GoodbyeGoodbyeGoodbye');

    this.replaceList([{ text: 'Hello' }, { text: 'Hello' }, { text: 'Hello' }]);

    this.assertText('HelloHelloHello');
  }

  ['@test context is not changed to the inner scope inside an {{#each as}} block']() {
    this.makeList([{ name: 'Chad' }, { name: 'Zack' }, { name: 'Asa' }]);

    this.render(`{{name}}-{{#each list as |person|}}{{name}}{{/each}}-{{name}}`, {
      name: 'Joel',
    });

    this.assertText('Joel-JoelJoelJoel-Joel');

    this.assertStableRerender();

    this.runTask(() => this.shiftObject());

    this.assertText('Joel-JoelJoel-Joel');

    this.runTask(() => set(this.context, 'name', 'Godfrey'));

    this.assertText('Godfrey-GodfreyGodfrey-Godfrey');

    this.runTask(() => set(this.context, 'name', 'Joel'));
    this.replaceList([{ name: 'Chad' }, { name: 'Zack' }, { name: 'Asa' }]);

    this.assertText('Joel-JoelJoelJoel-Joel');
  }

  ['@test can access the item and the original scope']() {
    this.makeList([{ name: 'Tom Dale' }, { name: 'Yehuda Katz' }, { name: 'Godfrey Chan' }]);

    this.render(`{{#each list key="name" as |person|}}[{{title}}: {{person.name}}]{{/each}}`, {
      title: 'Señor Engineer',
    });

    this.assertText(
      '[Señor Engineer: Tom Dale][Señor Engineer: Yehuda Katz][Señor Engineer: Godfrey Chan]'
    );

    this.runTask(() => this.rerender());

    this.assertText(
      '[Señor Engineer: Tom Dale][Señor Engineer: Yehuda Katz][Señor Engineer: Godfrey Chan]'
    );

    this.runTask(() => {
      set(this.objectAt(1), 'name', 'Stefan Penner');
      this.removeAt(0);
      this.pushObject({ name: 'Tom Dale' });
      this.insertAt(1, { name: 'Chad Hietala' });
      set(this.context, 'title', 'Principal Engineer');
    });

    this.assertText(
      '[Principal Engineer: Stefan Penner][Principal Engineer: Chad Hietala][Principal Engineer: Godfrey Chan][Principal Engineer: Tom Dale]'
    );

    this.runTask(() => set(this.context, 'title', 'Señor Engineer'));
    this.replaceList([{ name: 'Tom Dale' }, { name: 'Yehuda Katz' }, { name: 'Godfrey Chan' }]);

    this.assertText(
      '[Señor Engineer: Tom Dale][Señor Engineer: Yehuda Katz][Señor Engineer: Godfrey Chan]'
    );
  }

  ['@test the scoped variable is not available outside the {{#each}} block.']() {
    this.makeList(['Yehuda']);

    this.render(`{{name}}-{{#each list as |name|}}{{name}}{{/each}}-{{name}}`, {
      name: 'Stef',
    });

    this.assertText('Stef-Yehuda-Stef');

    this.runTask(() => this.rerender());

    this.assertText('Stef-Yehuda-Stef');

    this.runTask(() => this.pushObjects([' ', 'Katz']));

    this.assertText('Stef-Yehuda Katz-Stef');

    this.runTask(() => set(this.context, 'name', 'Tom'));

    this.assertText('Tom-Yehuda Katz-Tom');

    this.runTask(() => set(this.context, 'name', 'Stef'));
    this.replaceList(['Yehuda']);

    this.assertText('Stef-Yehuda-Stef');
  }

  ['@test inverse template is displayed with context']() {
    this.makeList([]);

    this.render(`{{#each list as |thing|}}Has Thing{{else}}No Thing {{otherThing}}{{/each}}`, {
      otherThing: 'bar',
    });

    this.assertText('No Thing bar');

    this.runTask(() => this.rerender());

    this.assertText('No Thing bar');

    this.runTask(() => set(this.context, 'otherThing', 'biz'));

    this.assertText('No Thing biz');

    this.runTask(() => this.pushObject('non-empty'));

    this.assertText('Has Thing');

    this.runTask(() => set(this.context, 'otherThing', 'baz'));

    this.assertText('Has Thing');

    this.runTask(() => set(this.context, 'otherThing', 'bar'));
    this.replaceList([]);

    this.assertText('No Thing bar');
  }

  ['@test content that are not initially present updates correctly GH#13983']() {
    // The root cause of this bug is that Glimmer did not call `didInitializeChildren`
    // on the inserted `TryOpcode`, causing that `TryOpcode` to have an uninitialized
    // tag. Currently the only way to observe this the "JUMP-IF-NOT-MODIFIED", i.e. by
    // wrapping it in an component.

    this.registerComponent('x-wrapper', { template: '{{yield}}' });

    this.makeList([]);

    this.render(`{{#x-wrapper}}{{#each list as |obj|}}[{{obj.text}}]{{/each}}{{/x-wrapper}}`);

    this.assertText('');

    this.runTask(() => this.rerender());

    this.assertText('');

    this.runTask(() => this.pushObject({ text: 'foo' }));

    this.assertText('[foo]');

    this.runTask(() => set(this.objectAt(0), 'text', 'FOO'));

    this.assertText('[FOO]');

    this.runTask(() => this.pushObject({ text: 'bar' }));

    this.assertText('[FOO][bar]');

    this.runTask(() => set(this.objectAt(1), 'text', 'BAR'));

    this.assertText('[FOO][BAR]');

    this.runTask(() => set(this.objectAt(1), 'text', 'baz'));

    this.assertText('[FOO][baz]');

    this.runTask(() => this.replace(1, 1, [{ text: 'BAZ' }]));

    this.assertText('[FOO][BAZ]');

    this.replaceList([]);

    this.assertText('');
  }

  /* multi each */

  ['@test re-using the same variable with different {{#each}} blocks does not override each other']() {
    let admins = this.createList([{ name: 'Tom Dale' }]);
    let users = this.createList([{ name: 'Yehuda Katz' }]);

    this.render(
      `Admin: {{#each admins key="name" as |person|}}[{{person.name}}]{{/each}} User: {{#each users key="name" as |person|}}[{{person.name}}]{{/each}}`,
      {
        admins: admins.list,
        users: users.list,
      }
    );

    this.assertText('Admin: [Tom Dale] User: [Yehuda Katz]');

    this.runTask(() => this.rerender());

    this.assertText('Admin: [Tom Dale] User: [Yehuda Katz]');

    this.runTask(() => {
      admins.delegate.pushObject({ name: 'Godfrey Chan' });
      set(users.delegate.objectAt(0), 'name', 'Stefan Penner');
    });

    this.assertText('Admin: [Tom Dale][Godfrey Chan] User: [Stefan Penner]');

    this.runTask(() => {
      set(this.context, 'admins', this.createList([{ name: 'Tom Dale' }]).list);
      set(this.context, 'users', this.createList([{ name: 'Yehuda Katz' }]).list);
    });

    this.assertText('Admin: [Tom Dale] User: [Yehuda Katz]');
  }

  [`@test an outer {{#each}}'s scoped variable does not clobber an inner {{#each}}'s property if they share the same name - Issue #1315`]() {
    let content = this.createList(['X', 'Y']);
    let options = this.createList([{ label: 'One', value: 1 }, { label: 'Two', value: 2 }]);

    this.render(
      strip`
      {{#each content as |value|}}
        {{value}}-
        {{#each options as |option|}}
          {{option.value}}:{{option.label}}
        {{/each}}
      {{/each}}
      `,
      {
        content: content.list,
        options: options.list,
      }
    );

    this.assertText('X-1:One2:TwoY-1:One2:Two');

    this.assertStableRerender();

    this.runTask(() => {
      content.delegate.pushObject('Z');
      set(options.delegate.objectAt(0), 'value', 0);
    });

    this.assertText('X-0:One2:TwoY-0:One2:TwoZ-0:One2:Two');

    this.runTask(() => {
      set(this.context, 'content', this.createList(['X', 'Y']).list);
      set(
        this.context,
        'options',
        this.createList([{ label: 'One', value: 1 }, { label: 'Two', value: 2 }]).list
      );
    });

    this.assertText('X-1:One2:TwoY-1:One2:Two');
  }

  ['@test the scoped variable is not available outside the {{#each}} block']() {
    let first = this.createList(['Limbo']);
    let fifth = this.createList(['Wrath']);
    let ninth = this.createList(['Treachery']);

    this.render(
      `{{ring}}-{{#each first as |ring|}}{{ring}}-{{#each fifth as |ring|}}{{ring}}-{{#each ninth as |ring|}}{{ring}}-{{/each}}{{ring}}-{{/each}}{{ring}}-{{/each}}{{ring}}`,
      {
        ring: 'Greed',
        first: first.list,
        fifth: fifth.list,
        ninth: ninth.list,
      }
    );

    this.assertText('Greed-Limbo-Wrath-Treachery-Wrath-Limbo-Greed');

    this.runTask(() => this.rerender());

    this.assertText('Greed-Limbo-Wrath-Treachery-Wrath-Limbo-Greed');

    this.runTask(() => {
      set(this.context, 'ring', 'O');
      fifth.delegate.insertAt(0, 'D');
    });

    this.assertText('O-Limbo-D-Treachery-D-Wrath-Treachery-Wrath-Limbo-O');

    this.runTask(() => {
      first.delegate.pushObject('I');
      ninth.delegate.replace(0, 1, ['K']);
    });

    this.assertText('O-Limbo-D-K-D-Wrath-K-Wrath-Limbo-I-D-K-D-Wrath-K-Wrath-I-O');

    this.runTask(() => {
      set(this.context, 'ring', 'Greed');
      set(this.context, 'first', this.createList(['Limbo']).list);
      set(this.context, 'fifth', this.createList(['Wrath']).list);
      set(this.context, 'ninth', this.createList(['Treachery']).list);
    });

    this.assertText('Greed-Limbo-Wrath-Treachery-Wrath-Limbo-Greed');
  }

  ['@test it should support {{#each name as |foo|}}, then {{#each foo as |bar|}}']() {
    let inner = this.createList(['caterpillar']);
    let outer = this.createList([inner.list]);

    this.render(
      `{{#each name key="@index" as |foo|}}{{#each foo as |bar|}}{{bar}}{{/each}}{{/each}}`,
      {
        name: outer.list,
      }
    );

    this.assertText('caterpillar');

    this.runTask(() => this.rerender());

    this.assertText('caterpillar');

    this.runTask(() => {
      inner.delegate.replace(0, 1, ['lady']);
      outer.delegate.pushObject(this.createList(['bird']).list);
    });

    this.assertText('ladybird');

    this.runTask(() =>
      set(this.context, 'name', this.createList([this.createList(['caterpillar']).list]).list)
    );

    this.assertText('caterpillar');
  }
}

moduleFor(
  'Syntax test: {{#each}} with native arrays',
  class extends EachTest {
    createList(items) {
      return { list: items, delegate: new ArrayDelegate(items, items) };
    }
  }
);

moduleFor(
  'Syntax test: {{#each}} with emberA-wrapped arrays',
  class extends EachTest {
    createList(items) {
      let wrapped = emberA(items);
      return { list: wrapped, delegate: wrapped };
    }
  }
);

moduleFor(
  'Syntax test: {{#each}} with native Set',
  class extends EachTest {
    createList(items) {
      let set = makeSet(items);
      return { list: set, delegate: new SetDelegate(set) };
    }

    ['@test it can render duplicate primitive items'](assert) {
      assert.ok(true, 'not supported by Set');
    }

    ['@test it can render duplicate objects'](assert) {
      assert.ok(true, 'not supported by Set');
    }
  }
);

moduleFor(
  'Syntax test: {{#each}} with array-like objects implementing forEach',
  class extends EachTest {
    createList(items) {
      let forEachable = new ForEachable(items);
      return { list: forEachable, delegate: forEachable };
    }
  }
);

if (HAS_NATIVE_SYMBOL) {
  moduleFor(
    'Syntax test: {{#each}} with array-like objects implementing Symbol.iterator',
    class extends EachTest {
      createList(items) {
        let iterable = new ArrayIterable(items);
        return { list: iterable, delegate: iterable };
      }
    }
  );
}

moduleFor(
  'Syntax test: {{#each}} with array proxies, modifying itself',
  class extends EachTest {
    createList(items) {
      let proxty = ArrayProxy.create({ content: emberA(items) });
      return { list: proxty, delegate: proxty };
    }
  }
);

moduleFor(
  'Syntax test: {{#each}} with array proxies, replacing its content',
  class extends EachTest {
    createList(items) {
      let wrapped = emberA(items);
      return {
        list: wrapped,
        delegate: ArrayProxy.create({ content: wrapped }),
      };
    }
  }
);

moduleFor(
  'Syntax test: {{#each as}} undefined path',
  class extends RenderingTest {
    ['@test keying off of `undefined` does not render']() {
      this.render(
        strip`
      {{#each foo.bar.baz as |thing|}}
        {{thing}}
      {{/each}}`,
        { foo: {} }
      );

      this.assertText('');

      this.runTask(() => this.rerender());

      this.assertText('');

      this.runTask(() => set(this.context, 'foo', { bar: { baz: ['Here!'] } }));

      this.assertText('Here!');

      this.runTask(() => set(this.context, 'foo', {}));

      this.assertText('');
    }
  }
);

moduleFor(
  'Syntax test: {{#each}} with sparse arrays',
  class extends RenderingTest {
    ['@test it should itterate over holes']() {
      let sparseArray = [];
      sparseArray[3] = 'foo';
      sparseArray[4] = 'bar';

      this.render(
        strip`
      {{#each list as |value key|}}
        [{{key}}:{{value}}]
      {{/each}}`,
        { list: emberA(sparseArray) }
      );

      this.assertText('[0:][1:][2:][3:foo][4:bar]');

      this.assertStableRerender();

      this.runTask(() => {
        let list = get(this.context, 'list');
        list.pushObject('baz');
      });

      this.assertText('[0:][1:][2:][3:foo][4:bar][5:baz]');
    }
  }
);

/* globals MutationObserver: false */
if (typeof MutationObserver === 'function') {
  moduleFor(
    'Syntax test: {{#each as}} DOM mutation test',
    class extends RenderingTest {
      constructor() {
        super(...arguments);
        this.observer = null;
      }

      observe(element) {
        let observer = (this.observer = new MutationObserver(function() {}));
        observer.observe(element, { childList: true, characterData: true });
      }

      teardown() {
        if (this.observer) {
          this.observer.disconnect();
        }

        super.teardown();
      }

      assertNoMutation() {
        this.assert.deepEqual(this.observer.takeRecords(), [], 'Expected no mutations');
      }

      expectMutations() {
        this.assert.ok(this.observer.takeRecords().length > 0, 'Expected some mutations');
      }

      ['@test {{#each}} should not mutate a subtree when the array has not changed [GH #14332]']() {
        let page = { title: 'Blog Posts' };

        let model = [{ title: 'Rails is omakase' }, { title: 'Ember is omakase' }];

        this.render(
          strip`
        <h1>{{page.title}}</h1>

        <ul id="posts">
          {{#each model as |post|}}
            <li>{{post.title}}</li>
          {{/each}}
        </ul>
      `,
          { page, model }
        );

        this.assertHTML(strip`
        <h1>Blog Posts</h1>

        <ul id="posts">
          <li>Rails is omakase</li>
          <li>Ember is omakase</li>
        </ul>
      `);

        this.observe(this.$('#posts')[0]);

        // MutationObserver is async
        return RSVP.Promise.resolve(() => {
          this.assertStableRerender();
        })
          .then(() => {
            this.assertNoMutation();

            this.runTask(() => set(this.context, 'page', { title: 'Essays' }));

            this.assertHTML(strip`
          <h1>Essays</h1>

          <ul id="posts">
            <li>Rails is omakase</li>
            <li>Ember is omakase</li>
          </ul>
        `);
          })
          .then(() => {
            this.assertNoMutation();

            this.runTask(() => set(this.context.page, 'title', 'Think Pieces™'));

            this.assertHTML(strip`
          <h1>Think Pieces™</h1>

          <ul id="posts">
            <li>Rails is omakase</li>
            <li>Ember is omakase</li>
          </ul>
        `);
          })
          .then(() => {
            // The last set is localized to the `page` object, so we do not expect Glimmer
            // to re-iterate the list
            this.assertNoMutation();
          });
      }
    }
  );
}
