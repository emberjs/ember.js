import { get } from 'ember-metal/property_get';
import { set } from 'ember-metal/property_set';
import { applyMixins, strip } from '../../utils/abstract-test-case';
import { moduleFor, RenderingTest } from '../../utils/test-case';
import { A as emberA } from 'ember-runtime/system/native_array';
import { removeAt } from 'ember-runtime/mixins/mutable_array';
import ArrayProxy from 'ember-runtime/system/array_proxy';

import {
  BasicConditionalsTest,
  SyntaxCondtionalTestHelpers,
  TruthyGenerator,
  FalsyGenerator,
  ArrayTestCases
} from '../../utils/shared-conditional-tests';

class EachTest extends BasicConditionalsTest {

  get truthyValue() { return ['non-empty']; }
  get falsyValue() { return []; }

}

applyMixins(EachTest,

  SyntaxCondtionalTestHelpers,

  new TruthyGenerator([
    // TODO: figure out what the rest of the cases are
    ['hello']
  ]),

  new FalsyGenerator([
    // TODO: figure out what the rest of the cases are
    [],
    undefined
  ]),

  ArrayTestCases

);

moduleFor('Syntax test: {{#each}}', class extends EachTest {

  templateFor({ cond, truthy, falsy }) {
    return `{{#each ${cond}}}${truthy}{{else}}${falsy}{{/each}}`;
  }

});

moduleFor('Syntax test: {{#each as}}', class extends EachTest {

  templateFor({ cond, truthy, falsy }) {
    return `{{#each ${cond} as |test|}}${truthy}{{else}}${falsy}{{/each}}`;
  }

  ['@test it repeats the given block for each item in the array']() {
    this.render(`{{#each list as |item|}}{{item.text}}{{else}}Empty{{/each}}`, {
      list: emberA([{ text: 'hello' }])
    });

    this.assertText('hello');

    this.runTask(() => this.rerender());

    this.assertText('hello');

    this.runTask(() => set(get(this.context, 'list').objectAt(0), 'text', 'Hello'));

    this.assertText('Hello');

    this.runTask(() => {
      let list = get(this.context, 'list');
      list.pushObject({ text: ' ' });
      list.pushObject({ text: 'World' });
    });

    this.assertText('Hello World');

    this.runTask(() => {
      let list = get(this.context, 'list');
      list.pushObject({ text: 'Earth' });
      removeAt(list, 1);
      list.insertAt(1, { text: 'Globe' });
    });

    this.assertText('HelloGlobeWorldEarth');

    this.runTask(() => {
      let list = get(this.context, 'list');
      list.pushObject({ text: 'Planet' });
      removeAt(list, 1);
      list.insertAt(1, { text: ' ' });
      list.pushObject({ text: ' ' });
      list.pushObject({ text: 'Earth' });
      removeAt(list, 3);
    });

    this.assertText('Hello WorldPlanet Earth');

    this.runTask(() => {
      let list = get(this.context, 'list');
      list.pushObject({ text: 'Globe' });
      removeAt(list, 1);
      list.insertAt(1, { text: ' ' });
      list.pushObject({ text: ' ' });
      list.pushObject({ text: 'World' });
      removeAt(list, 2);
    });

    this.assertText('Hello Planet EarthGlobe World');

    this.runTask(() => get(this.context, 'list').replace(2, 4, { text: 'my' }));

    this.assertText('Hello my World');

    this.runTask(() => get(this.context, 'list').clear());

    this.assertText('Empty');

    this.runTask(() => set(this.context, 'list', [{ text: 'hello' }]));

    this.assertText('hello');
  }

  ['@test it receives the index as the second parameter']() {
    this.render(`{{#each list as |item index|}}{{index}}. {{item.text}}{{/each}}`, {
      list: emberA([{ text: 'hello' }, { text: 'world' }])
    });

    this.assertText('0. hello1. world');

    this.assertStableRerender();

    this.runTask(() => get(this.context, 'list').insertAt(1, { text: 'my' }));

    this.assertText('0. hello1. my2. world');

    this.runTask(() => set(this.context, 'list', [{ text: 'hello' }, { text: 'world' }]));

    this.assertText('0. hello1. world');
  }

  ['@test it accepts a string key']() {
    this.render(`{{#each list key='text' as |item|}}{{item.text}}{{/each}}`, {
      list: emberA([{ text: 'hello' }, { text: 'world' }])
    });

    this.assertText('helloworld');

    this.assertStableRerender();

    this.runTask(() => get(this.context, 'list').pushObject({ text: 'again' }));

    this.assertText('helloworldagain');

    this.runTask(() => set(this.context, 'list', [{ text: 'hello' }, { text: 'world' }]));

    this.assertText('helloworld');
  }

  ['@test it accepts a numeric key']() {
    this.render(`{{#each list key='id' as |item|}}{{item.id}}{{/each}}`, {
      list: emberA([{ id: 1 }, { id: 2 }])
    });

    this.assertText('12');

    this.assertStableRerender();

    this.runTask(() => get(this.context, 'list').pushObject({ id: 3 }));

    this.assertText('123');

    this.runTask(() => set(this.context, 'list', [{ id: 1 }, { id: 2 }]));

    this.assertText('12');
  }

  ['@test it can specify @index as the key']() {
    this.render(`{{#each list key='@index' as |item|}}{{item.id}}{{/each}}`, {
      list: emberA([{ id: 1 }, { id: 2 }])
    });

    this.assertText('12');

    this.assertStableRerender();

    this.runTask(() => get(this.context, 'list').pushObject({ id: 3 }));

    this.assertText('123');

    this.runTask(() => set(this.context, 'list', [{ id: 1 }, { id: 2 }]));

    this.assertText('12');
  }

  ['@test it can specify @identity as the key for arrays of primitives']() {
    this.render(`{{#each list key='@identity' as |item|}}{{item}}{{/each}}`, {
      list: emberA([1, 2])
    });

    this.assertText('12');

    this.assertStableRerender();

    this.runTask(() => get(this.context, 'list').pushObject(3));

    this.assertText('123');

    this.runTask(() => set(this.context, 'list', [1, 2]));

    this.assertText('12');
  }

  ['@test it can specify @identity as the key for mixed arrays of objects and primitives']() {
    this.render(`{{#each list key='@identity' as |item|}}{{if item.id item.id item}}{{/each}}`, {
      list: emberA([1, { id: 2 }, 3])
    });

    this.assertText('123');

    this.assertStableRerender();

    this.runTask(() => get(this.context, 'list').insertAt(2, { id: 4 }));

    this.assertText('1243');

    this.runTask(() => set(this.context, 'list', [1, { id: 2 }, 3]));

    this.assertText('123');
  }

  ['@htmlbars it can render duplicate primitive items']() {
    this.render(`{{#each list as |item|}}{{item}}{{/each}}`, {
      list: emberA(['a', 'a', 'a'])
    });

    this.assertText('aaa');

    this.assertStableRerender();

    this.runTask(() => get(this.context, 'list').pushObject('a'));

    this.assertText('aaaa');

    this.runTask(() => get(this.context, 'list').pushObject('a'));

    this.assertText('aaaaa');

    this.runTask(() => set(this.context, 'list', ['a', 'a', 'a']));

    this.assertText('aaa');
  }

  ['@htmlbars it can render duplicate objects']() {
    let duplicateItem = { text: 'foo' };
    this.render(`{{#each list as |item|}}{{item.text}}{{/each}}`, {
      list: emberA([duplicateItem, duplicateItem, { text: 'bar' }, { text: 'baz' }])
    });

    this.assertText('foofoobarbaz');

    this.assertStableRerender();

    this.runTask(() => get(this.context, 'list').pushObject(duplicateItem));

    this.assertText('foofoobarbazfoo');

    this.runTask(() => get(this.context, 'list').pushObject(duplicateItem));

    this.assertText('foofoobarbazfoofoo');

    this.runTask(() => set(this.context, 'list', [duplicateItem, duplicateItem, { text: 'bar' }, { text: 'baz' }]));

    this.assertText('foofoobarbaz');
  }

  [`@test it maintains DOM stability when condition changes between objects with the same keys`]() {
    this.render(`{{#each list key="text" as |item|}}{{item.text}}{{/each}}`, {
      list: emberA([{ text: 'Hello' }, { text: ' ' }, { text: 'world' }])
    });

    this.assertText('Hello world');

    this.takeSnapshot();

    this.runTask(() => {
      let list = get(this.context, 'list');
      list.popObject();
      list.popObject();
      list.pushObject({ text: ' ' });
      list.pushObject({ text: 'world' });
    });

    this.assertText('Hello world');

    this.assertInvariants();

    this.runTask(() => set(this.context, 'list', [{ text: 'Hello' }, { text: ' ' }, { text: 'world' }]));

    this.assertText('Hello world');

    this.assertInvariants();
  }

  [`@test it maintains DOM stability for stable keys when list is updated`]() {
    this.render(`{{#each list key="text" as |item|}}{{item.text}}{{/each}}`, {
      list: emberA([{ text: 'Hello' }, { text: ' ' }, { text: 'world' }])
    });

    this.assertText('Hello world');

    this.assertStableRerender();

    let oldSnapshot = this.snapshot;

    this.runTask(() => {
      let list = get(this.context, 'list');
      list.unshiftObject({ text: ', ' });
      list.unshiftObject({ text: 'Hi' });
      list.pushObject({ text: '!' });
      list.pushObject({ text: 'earth' });
    });

    this.assertText('Hi, Hello world!earth');

    this.assertPartialInvariants(2, 5);

    this.runTask(() => set(this.context, 'list', [{ text: 'Hello' }, { text: ' ' }, { text: 'world' }]));

    this.assertText('Hello world');
    this.assertInvariants(oldSnapshot, this.takeSnapshot());
  }

  [`@test it renders all items with duplicate key values`]() {
    this.render(`{{#each list key="text" as |item|}}{{item.text}}{{/each}}`, {
      list: emberA([{ text: 'Hello' }, { text: 'Hello' }, { text: 'Hello' }])
    });

    this.assertText('HelloHelloHello');

    let list = get(this.context, 'list');

    this.runTask(() => {
      list.forEach(hash => set(hash, 'text', 'Goodbye'));
    });

    this.assertText('GoodbyeGoodbyeGoodbye');
  }

  [`@test it renders all items with duplicate key values - Ember array`]() {
    let list = ArrayProxy.create({
      content: [
        {
          text: 'Hello'
        },
        {
          text: 'Hello'
        },
        {
          text: 'Hello'
        }
      ]
    });

    this.render(`{{#each list key="text" as |item|}}{{item.text}}{{/each}}`, {
      list
    });

    this.assertText('HelloHelloHello');

    this.runTask(() => {
      list.forEach(hash => set(hash, 'text', 'Goodbye'));
    });

    this.assertText('GoodbyeGoodbyeGoodbye');
  }

  ['@test context is not changed to the inner scope inside an {{#each as}} block']() {
    this.render(`{{name}}-{{#each people as |person|}}{{name}}{{/each}}-{{name}}`, {
      name: 'Joel',
      people: emberA([{ name: 'Chad' }, { name: 'Zack' }, { name: 'Asa' }])
    });

    this.assertText('Joel-JoelJoelJoel-Joel');

    this.assertStableRerender();

    this.runTask(() => get(this.context, 'people').shiftObject());

    this.assertText('Joel-JoelJoel-Joel');

    this.runTask(() => set(this.context, 'name', 'Godfrey'));

    this.assertText('Godfrey-GodfreyGodfrey-Godfrey');

    this.runTask(() => {
      set(this.context, 'name', 'Joel');
      set(this.context, 'people', [{ name: 'Chad' }, { name: 'Zack' }, { name: 'Asa' }]);
    });

    this.assertText('Joel-JoelJoelJoel-Joel');
  }

  ['@test can access the item and the original scope']() {
    this.render(`{{#each people key="name" as |person|}}[{{title}}: {{person.name}}]{{/each}}`, {
      title: 'Señor Engineer',
      people: emberA([{ name: 'Tom Dale' }, { name: 'Yehuda Katz' }, { name: 'Godfrey Chan' }])
    });

    this.assertText('[Señor Engineer: Tom Dale][Señor Engineer: Yehuda Katz][Señor Engineer: Godfrey Chan]');

    this.runTask(() => this.rerender());

    this.assertText('[Señor Engineer: Tom Dale][Señor Engineer: Yehuda Katz][Señor Engineer: Godfrey Chan]');

    this.runTask(() => {
      let people = get(this.context, 'people');
      set(people.objectAt(1), 'name', 'Stefan Penner');
      removeAt(people, 0);
      people.pushObject({ name: 'Tom Dale' });
      people.insertAt(1, { name: 'Chad Hietala' });
      set(this.context, 'title', 'Principal Engineer');
    });

    this.assertText('[Principal Engineer: Stefan Penner][Principal Engineer: Chad Hietala][Principal Engineer: Godfrey Chan][Principal Engineer: Tom Dale]');

    this.runTask(() => {
      set(this.context, 'people', [{ name: 'Tom Dale' }, { name: 'Yehuda Katz' }, { name: 'Godfrey Chan' }]);
      set(this.context, 'title', 'Señor Engineer');
    });

    this.assertText('[Señor Engineer: Tom Dale][Señor Engineer: Yehuda Katz][Señor Engineer: Godfrey Chan]');
  }

  ['@test the scoped variable is not available outside the {{#each}} block.']() {
    this.render(`{{name}}-{{#each other as |name|}}{{name}}{{/each}}-{{name}}`, {
      name: 'Stef',
      other: emberA(['Yehuda'])
    });

    this.assertText('Stef-Yehuda-Stef');

    this.runTask(() => this.rerender());

    this.assertText('Stef-Yehuda-Stef');

    this.runTask(() => get(this.context, 'other').pushObjects([' ', 'Katz']));

    this.assertText('Stef-Yehuda Katz-Stef');

    this.runTask(() => set(this.context, 'name', 'Tom'));

    this.assertText('Tom-Yehuda Katz-Tom');

    this.runTask(() => {
      set(this.context, 'name', 'Stef');
      set(this.context, 'other', ['Yehuda']);
    });

    this.assertText('Stef-Yehuda-Stef');
  }

  ['@test inverse template is displayed with context']() {
    this.render(`{{#each falsyThing as |thing|}}Has Thing{{else}}No Thing {{otherThing}}{{/each}}`, {
      falsyThing: [],
      otherThing: 'bar'
    });

    this.assertText('No Thing bar');

    this.runTask(() => this.rerender());

    this.assertText('No Thing bar');

    this.runTask(() => set(this.context, 'otherThing', 'biz'));

    this.assertText('No Thing biz');

    this.runTask(() => set(this.context, 'falsyThing', ['non-empty']));

    this.assertText('Has Thing');

    this.runTask(() => set(this.context, 'otherThing', 'baz'));

    this.assertText('Has Thing');

    this.runTask(() => {
      set(this.context, 'otherThing', 'bar');
      set(this.context, 'falsyThing', null);
    });

    this.assertText('No Thing bar');
  }

});

moduleFor('Syntax test: Multiple {{#each as}} helpers', class extends RenderingTest {

  ['@test re-using the same variable with different {{#each}} blocks does not override each other']() {
    this.render(`Admin: {{#each admins key="name" as |person|}}[{{person.name}}]{{/each}} User: {{#each users key="name" as |person|}}[{{person.name}}]{{/each}}`, {
      admins: emberA([{ name: 'Tom Dale' }]),
      users: emberA([{ name: 'Yehuda Katz' }])
    });

    this.assertText('Admin: [Tom Dale] User: [Yehuda Katz]');

    this.runTask(() => this.rerender());

    this.assertText('Admin: [Tom Dale] User: [Yehuda Katz]');

    this.runTask(() => {
      get(this.context, 'admins').pushObject({ name: 'Godfrey Chan' });
      set(get(this.context, 'users').objectAt(0), 'name', 'Stefan Penner');
    });

    this.assertText('Admin: [Tom Dale][Godfrey Chan] User: [Stefan Penner]');

    this.runTask(() => {
      set(this.context, 'admins', [{ name: 'Tom Dale' }]);
      set(this.context, 'users', [{ name: 'Yehuda Katz' }]);
    });

    this.assertText('Admin: [Tom Dale] User: [Yehuda Katz]');
  }

  [`@test an outer {{#each}}'s scoped variable does not clobber an inner {{#each}}'s property if they share the same name - Issue #1315`]() {
    this.render(strip`
      {{#each content as |value|}}
        {{value}}-
        {{#each options as |option|}}
          {{option.value}}:{{option.label}}
        {{/each}}
      {{/each}}
      `, {
      content: emberA(['X', 'Y']),
      options: emberA([{ label: 'One', value: 1 }, { label: 'Two', value: 2 }])
    });

    this.assertText('X-1:One2:TwoY-1:One2:Two');

    this.assertStableRerender();

    this.runTask(() => {
      get(this.context, 'content').pushObject('Z');
      set(get(this.context, 'options').objectAt(0), 'value', 0);
    });

    this.assertText('X-0:One2:TwoY-0:One2:TwoZ-0:One2:Two');

    this.runTask(() => {
      set(this.context, 'content', ['X', 'Y']);
      set(this.context, 'options', [{ label: 'One', value: 1 }, { label: 'Two', value: 2 }]);
    });

    this.assertText('X-1:One2:TwoY-1:One2:Two');
  }

  ['@test the scoped variable is not available outside the {{#each}} block']() {
    this.render(`{{ring}}-{{#each first as |ring|}}{{ring}}-{{#each fifth as |ring|}}{{ring}}-{{#each ninth as |ring|}}{{ring}}-{{/each}}{{ring}}-{{/each}}{{ring}}-{{/each}}{{ring}}`, {
      ring: 'Greed',
      first: emberA(['Limbo']),
      fifth: emberA(['Wrath']),
      ninth: emberA(['Treachery'])
    });

    this.assertText('Greed-Limbo-Wrath-Treachery-Wrath-Limbo-Greed');

    this.runTask(() => this.rerender());

    this.assertText('Greed-Limbo-Wrath-Treachery-Wrath-Limbo-Greed');

    this.runTask(() => {
      set(this.context, 'ring', 'O');
      get(this.context, 'fifth').insertAt(0, 'D');
    });

    this.assertText('O-Limbo-D-Treachery-D-Wrath-Treachery-Wrath-Limbo-O');

    this.runTask(() => {
      get(this.context, 'first').pushObject('I');
      get(this.context, 'ninth').replace(0, 1, 'K');
    });

    this.assertText('O-Limbo-D-K-D-Wrath-K-Wrath-Limbo-I-D-K-D-Wrath-K-Wrath-I-O');

    this.runTask(() => {
      set(this.context, 'ring', 'Greed');
      set(this.context, 'first', ['Limbo']);
      set(this.context, 'fifth', ['Wrath']);
      set(this.context, 'ninth', ['Treachery']);
    });

    this.assertText('Greed-Limbo-Wrath-Treachery-Wrath-Limbo-Greed');
  }

  ['@test it should support {{#each name as |foo|}}, then {{#each foo as |bar|}}']() {
    this.render(`{{#each name key="@index" as |foo|}}{{#each foo as |bar|}}{{bar}}{{/each}}{{/each}}`, {
      name: emberA([emberA(['caterpillar'])])
    });

    this.assertText('caterpillar');

    this.runTask(() => this.rerender());

    this.assertText('caterpillar');

    this.runTask(() => {
      let name = get(this.context, 'name');
      name.objectAt(0).replace(0, 1, 'lady');
      name.pushObject(['bird']);
    });

    this.assertText('ladybird');

    this.runTask(() => set(this.context, 'name', [['caterpillar']]));

    this.assertText('caterpillar');
  }

});

moduleFor('Syntax test: {{#each as}} undefined path', class extends RenderingTest {
  ['@test keying off of `undefined` does not render'](assert) {
    this.render(strip`
      {{#each foo.bar.baz as |thing|}}
        {{thing}}
      {{/each}}`, { foo: {} });

    this.assertText('');

    this.runTask(() => this.rerender());

    this.assertText('');

    this.runTask(() => set(this.context, 'foo', { bar: { baz: ['Here!'] } }));

    this.assertText('Here!');

    this.runTask(() => set(this.context, 'foo', {}));

    this.assertText('');
  }
});
