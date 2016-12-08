import { get, set } from 'ember-metal';
import { A as emberA, ObjectProxy, removeAt } from 'ember-runtime';
import { moduleFor, RenderingTest } from '../../utils/test-case';
import { IfUnlessWithSyntaxTest } from '../../utils/shared-conditional-tests';
import { strip } from '../../utils/abstract-test-case';

moduleFor('Syntax test: {{#with}}', class extends IfUnlessWithSyntaxTest {

  templateFor({ cond, truthy, falsy }) {
    return `{{#with ${cond}}}${truthy}{{else}}${falsy}{{/with}}`;
  }

});

moduleFor('Syntax test: {{#with as}}', class extends IfUnlessWithSyntaxTest {

  templateFor({ cond, truthy, falsy }) {
    return `{{#with ${cond} as |test|}}${truthy}{{else}}${falsy}{{/with}}`;
  }

  ['@test keying off of `undefined` does not render'](assert) {
    this.render(strip`
      {{#with foo.bar.baz as |thing|}}
        {{thing}}
      {{/with}}`, { foo: {} });

    this.assertText('');

    this.runTask(() => this.rerender());

    this.assertText('');

    this.runTask(() => set(this.context, 'foo', { bar: { baz: 'Here!' } }));

    this.assertText('Here!');

    this.runTask(() => set(this.context, 'foo', {}));

    this.assertText('');
  }

  ['@test it renders and hides the given block based on the conditional']() {
    this.render(`{{#with cond1 as |cond|}}{{cond.greeting}}{{else}}False{{/with}}`, {
      cond1: { greeting: 'Hello' }
    });

    this.assertText('Hello');

    this.runTask(() => this.rerender());

    this.assertText('Hello');

    this.runTask(() => set(this.context, 'cond1.greeting', 'Hello world'));

    this.assertText('Hello world');

    this.runTask(() => set(this.context, 'cond1', false));

    this.assertText('False');

    this.runTask(() => set(this.context, 'cond1', { greeting: 'Hello' }));

    this.assertText('Hello');
  }

  ['@test can access alias and original scope']() {
    this.render(`{{#with person as |tom|}}{{title}}: {{tom.name}}{{/with}}`, {
      title: 'Señor Engineer',
      person: { name: 'Tom Dale' }
    });

    this.assertText('Señor Engineer: Tom Dale');

    this.runTask(() => this.rerender());

    this.assertText('Señor Engineer: Tom Dale');

    this.runTask(() => {
      set(this.context, 'person.name', 'Yehuda Katz');
      set(this.context, 'title', 'Principal Engineer');
    });

    this.assertText('Principal Engineer: Yehuda Katz');

    this.runTask(() => {
      set(this.context, 'person', { name: 'Tom Dale' });
      set(this.context, 'title', 'Señor Engineer');
    });

    this.assertText('Señor Engineer: Tom Dale');
  }

  ['@test the scoped variable is not available outside the {{#with}} block.']() {
    this.render(`{{name}}-{{#with other as |name|}}{{name}}{{/with}}-{{name}}`, {
      name: 'Stef',
      other: 'Yehuda'
    });

    this.assertText('Stef-Yehuda-Stef');

    this.runTask(() => this.rerender());

    this.assertText('Stef-Yehuda-Stef');

    this.runTask(() => set(this.context, 'other', 'Chad'));

    this.assertText('Stef-Chad-Stef');

    this.runTask(() => set(this.context, 'name', 'Tom'));

    this.assertText('Tom-Chad-Tom');

    this.runTask(() => {
      set(this.context, 'name', 'Stef');
      set(this.context, 'other', 'Yehuda');
    });

    this.assertText('Stef-Yehuda-Stef');
  }

  ['@test inverse template is displayed with context']() {
    this.render(`{{#with falsyThing as |thing|}}Has Thing{{else}}No Thing {{otherThing}}{{/with}}`, {
      falsyThing: null,
      otherThing: 'bar'
    });

    this.assertText('No Thing bar');

    this.runTask(() => this.rerender());

    this.assertText('No Thing bar');

    this.runTask(() => set(this.context, 'otherThing', 'biz'));

    this.assertText('No Thing biz');

    this.runTask(() => set(this.context, 'falsyThing', true));

    this.assertText('Has Thing');

    this.runTask(() => set(this.context, 'otherThing', 'baz'));

    this.assertText('Has Thing');

    this.runTask(() => {
      set(this.context, 'otherThing', 'bar');
      set(this.context, 'falsyThing', null);
    });

    this.assertText('No Thing bar');
  }

  ['@test can access alias of a proxy']() {
    this.render(`{{#with proxy as |person|}}{{person.name}}{{/with}}`, {
      proxy: ObjectProxy.create({ content: { name: 'Tom Dale' } })
    });

    this.assertText('Tom Dale');

    this.runTask(() => this.rerender());

    this.assertText('Tom Dale');

    this.runTask(() => set(this.context, 'proxy.name', 'Yehuda Katz'));

    this.assertText('Yehuda Katz');

    this.runTask(() => set(this.context, 'proxy.content', { name: 'Godfrey Chan' }));

    this.assertText('Godfrey Chan');

    this.runTask(() => set(this.context, 'proxy.content.name', 'Stefan Penner'));

    this.assertText('Stefan Penner');

    this.runTask(() => set(this.context, 'proxy.content', null));

    this.assertText('');

    this.runTask(() => set(this.context, 'proxy', ObjectProxy.create({ content: { name: 'Tom Dale' } })));

    this.assertText('Tom Dale');
  }

  ['@test can access alias of an array']() {
    this.render(`{{#with arrayThing as |words|}}{{#each words as |word|}}{{word}}{{/each}}{{/with}}`, {
      arrayThing: emberA(['Hello', ' ', 'world'])
    });

    this.assertText('Hello world');

    this.runTask(() => this.rerender());

    this.assertText('Hello world');

    this.runTask(() => {
      let array = get(this.context, 'arrayThing');
      array.replace(0, 1, 'Goodbye');
      removeAt(array, 1);
      array.insertAt(1, ', ');
      array.pushObject('!');
    });

    this.assertText('Goodbye, world!');

    this.runTask(() => set(this.context, 'arrayThing', ['Hello', ' ', 'world']));

    this.assertText('Hello world');
  }

});

moduleFor('Syntax test: Multiple {{#with as}} helpers', class extends RenderingTest {

  ['@test re-using the same variable with different {{#with}} blocks does not override each other']() {
    this.render(`Admin: {{#with admin as |person|}}{{person.name}}{{/with}} User: {{#with user as |person|}}{{person.name}}{{/with}}`, {
      admin: { name: 'Tom Dale' },
      user: { name: 'Yehuda Katz' }
    });

    this.assertText('Admin: Tom Dale User: Yehuda Katz');

    this.runTask(() => this.rerender());

    this.assertText('Admin: Tom Dale User: Yehuda Katz');

    this.runTask(() => {
      set(this.context, 'admin.name', 'Godfrey Chan');
      set(this.context, 'user.name', 'Stefan Penner');
    });

    this.assertText('Admin: Godfrey Chan User: Stefan Penner');

    this.runTask(() => {
      set(this.context, 'admin', { name: 'Tom Dale' });
      set(this.context, 'user', { name: 'Yehuda Katz' });
    });

    this.assertText('Admin: Tom Dale User: Yehuda Katz');
  }

  ['@test the scoped variable is not available outside the {{#with}} block']() {
    this.render(`{{ring}}-{{#with first as |ring|}}{{ring}}-{{#with fifth as |ring|}}{{ring}}-{{#with ninth as |ring|}}{{ring}}-{{/with}}{{ring}}-{{/with}}{{ring}}-{{/with}}{{ring}}`, {
      ring: 'Greed',
      first: 'Limbo',
      fifth: 'Wrath',
      ninth: 'Treachery'
    });

    this.assertText('Greed-Limbo-Wrath-Treachery-Wrath-Limbo-Greed');

    this.runTask(() => this.rerender());

    this.assertText('Greed-Limbo-Wrath-Treachery-Wrath-Limbo-Greed');

    this.runTask(() => {
      set(this.context, 'ring', 'O');
      set(this.context, 'fifth', 'D');
    });

    this.assertText('O-Limbo-D-Treachery-D-Limbo-O');

    this.runTask(() => {
      set(this.context, 'first', 'I');
      set(this.context, 'ninth', 'K');
    });

    this.assertText('O-I-D-K-D-I-O');

    this.runTask(() => {
      set(this.context, 'ring', 'Greed');
      set(this.context, 'first', 'Limbo');
      set(this.context, 'fifth', 'Wrath');
      set(this.context, 'ninth', 'Treachery');
    });

    this.assertText('Greed-Limbo-Wrath-Treachery-Wrath-Limbo-Greed');
  }

  ['@test it should support {{#with name as |foo|}}, then {{#with foo as |bar|}}']() {
    this.render(`{{#with name as |foo|}}{{#with foo as |bar|}}{{bar}}{{/with}}{{/with}}`, {
      name: 'caterpillar'
    });

    this.assertText('caterpillar');

    this.runTask(() => this.rerender());

    this.assertText('caterpillar');

    this.runTask(() => set(this.context, 'name', 'butterfly'));

    this.assertText('butterfly');

    this.runTask(() => set(this.context, 'name', 'caterpillar'));

    this.assertText('caterpillar');
  }

  ['@test updating the context should update the alias']() {
    this.render(`{{#with this as |person|}}{{person.name}}{{/with}}`, {
      name: 'Los Pivots'
    });

    this.assertText('Los Pivots');

    this.runTask(() => this.rerender());

    this.assertText('Los Pivots');

    this.runTask(() => set(this.context, 'name', 'l\'Pivots'));

    this.assertText('l\'Pivots');

    this.runTask(() => set(this.context, 'name', 'Los Pivots'));

    this.assertText('Los Pivots');
  }

  ['@test nested {{#with}} blocks should have access to root context']() {
    this.render(strip`
      {{name}}
      {{#with committer1.name as |name|}}
        [{{name}}
        {{#with committer2.name as |name|}}
          [{{name}}]
        {{/with}}
        {{name}}]
      {{/with}}
      {{name}}
      {{#with committer2.name as |name|}}
        [{{name}}
        {{#with committer1.name as |name|}}
          [{{name}}]
        {{/with}}
        {{name}}]
      {{/with}}
      {{name}}
    `, {
      name: 'ebryn',
      committer1: { name: 'trek' },
      committer2: { name: 'machty' }
    });

    this.assertText('ebryn[trek[machty]trek]ebryn[machty[trek]machty]ebryn');

    this.runTask(() => this.rerender());

    this.assertText('ebryn[trek[machty]trek]ebryn[machty[trek]machty]ebryn');

    this.runTask(() => set(this.context, 'name', 'chancancode'));

    this.assertText('chancancode[trek[machty]trek]chancancode[machty[trek]machty]chancancode');

    this.runTask(() => set(this.context, 'committer1', { name: 'krisselden' }));

    this.assertText('chancancode[krisselden[machty]krisselden]chancancode[machty[krisselden]machty]chancancode');

    this.runTask(() => {
      set(this.context, 'committer1.name', 'wycats');
      set(this.context, 'committer2', { name: 'rwjblue' });
    });

    this.assertText('chancancode[wycats[rwjblue]wycats]chancancode[rwjblue[wycats]rwjblue]chancancode');

    this.runTask(() => {
      set(this.context, 'name', 'ebryn');
      set(this.context, 'committer1', { name: 'trek' });
      set(this.context, 'committer2', { name: 'machty' });
    });

    this.assertText('ebryn[trek[machty]trek]ebryn[machty[trek]machty]ebryn');
  }

});
