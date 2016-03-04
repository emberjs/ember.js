import { get } from 'ember-metal/property_get';
import { set } from 'ember-metal/property_set';
import { applyMixins } from '../../utils/abstract-test-case';
import { moduleFor, RenderingTest } from '../../utils/test-case';
import { A as emberA } from 'ember-runtime/system/native_array';
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

    this.runTask(() => set(this.context.get('list').objectAt(0), 'text', 'Hello'));

    this.assertText('Hello');

    this.runTask(() => {
      let list = this.context.get('list');
      list.pushObject({ text: ' ' });
      list.pushObject({ text: 'world' });
    });

    this.assertText('Hello world');

    this.runTask(() => this.context.get('list').clear());

    this.assertText('Empty');

    this.runTask(() => set(this.context, 'list', [{ text: 'hello' }]));

    this.assertText('hello');
  }

  [`@test it maintains DOM stability when condition changes between objects with the same keys`]() {
    this.render(`{{#each list key="text" as |item|}}{{item.text}}{{/each}}`, {
      list: emberA([{ text: 'Hello' }, { text: ' ' }, { text: 'world' }])
    });

    this.assertText('Hello world');

    this.takeSnapshot();

    this.runTask(() => {
      let list = this.context.get('list');
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
      people.removeAt(0);
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
