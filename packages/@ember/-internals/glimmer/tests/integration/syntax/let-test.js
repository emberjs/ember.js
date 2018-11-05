import { get, set } from '@ember/-internals/metal';
import { A as emberA, ObjectProxy, removeAt } from '@ember/-internals/runtime';
import { moduleFor, RenderingTest } from '../../utils/test-case';
import { strip } from '../../utils/abstract-test-case';

moduleFor(
  'Syntax test: {{#let as}}',
  class extends RenderingTest {
    templateFor({ cond, truthy, falsy }) {
      return `{{#let ${cond} as |test|}}${truthy}{{else}}${falsy}{{/let}}`;
    }

    ['@test it renders the block if `undefined` is passed as an argument']() {
      this.render(
        strip`
        {{#let foo.bar.baz as |thing|}}
          value: "{{thing}}"
        {{/let}}`,
        { foo: {} }
      );

      this.assertText('value: ""');

      this.runTask(() => this.rerender());

      this.assertText('value: ""');

      this.runTask(() => set(this.context, 'foo', { bar: { baz: 'Here!' } }));

      this.assertText('value: "Here!"');

      this.runTask(() => set(this.context, 'foo', {}));

      this.assertText('value: ""');
    }

    ['@test it renders the block if arguments are falsey']() {
      this.render(`{{#let cond1 cond2 as |cond|}}value: "{{cond1}}"{{/let}}`, {
        cond1: false,
      });

      this.assertText('value: "false"');

      this.runTask(() => this.rerender());

      this.assertText('value: "false"');

      this.runTask(() => set(this.context, 'cond1', ''));

      this.assertText('value: ""');

      this.runTask(() => set(this.context, 'cond1', 0));

      this.assertText('value: "0"');
    }

    ['@test it yields multiple arguments in order']() {
      this.render(`{{#let foo bar baz.name as |a b c|}}{{a}} {{b}} {{c}}{{/let}}`, {
        foo: 'Señor Engineer',
        bar: '',
        baz: { name: 'Dale' },
      });

      this.assertText('Señor Engineer  Dale');

      this.runTask(() => set(this.context, 'bar', 'Tom'));

      this.assertText('Señor Engineer Tom Dale');
    }

    ['@test can access alias and original scope']() {
      this.render(`{{#let person as |tom|}}{{title}}: {{tom.name}}{{/let}}`, {
        title: 'Señor Engineer',
        person: { name: 'Tom Dale' },
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

    ['@test the scoped variable is not available outside the {{#let}} block.']() {
      this.render(`{{name}}-{{#let other as |name|}}{{name}}{{/let}}-{{name}}`, {
        name: 'Stef',
        other: 'Yehuda',
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

    ['@test can access alias of a proxy']() {
      this.render(`{{#let proxy as |person|}}{{person.name}}{{/let}}`, {
        proxy: ObjectProxy.create({ content: { name: 'Tom Dale' } }),
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

      this.runTask(() =>
        set(this.context, 'proxy', ObjectProxy.create({ content: { name: 'Tom Dale' } }))
      );

      this.assertText('Tom Dale');
    }

    ['@test can access alias of an array']() {
      this.render(
        `{{#let arrayThing as |words|}}{{#each words as |word|}}{{word}}{{/each}}{{/let}}`,
        {
          arrayThing: emberA(['Hello', ' ', 'world']),
        }
      );

      this.assertText('Hello world');

      this.runTask(() => this.rerender());

      this.assertText('Hello world');

      this.runTask(() => {
        let array = get(this.context, 'arrayThing');
        array.replace(0, 1, ['Goodbye']);
        removeAt(array, 1);
        array.insertAt(1, ', ');
        array.pushObject('!');
      });

      this.assertText('Goodbye, world!');

      this.runTask(() => set(this.context, 'arrayThing', ['Hello', ' ', 'world']));

      this.assertText('Hello world');
    }

    ['@test `attrs` can be used as a block param [GH#14678]']() {
      this.render('{{#let hash as |attrs|}}[{{hash.foo}}-{{attrs.foo}}]{{/let}}', {
        hash: { foo: 'foo' },
      });

      this.assertText('[foo-foo]');

      this.runTask(() => this.rerender());

      this.assertText('[foo-foo]');

      this.runTask(() => this.context.set('hash.foo', 'FOO'));

      this.assertText('[FOO-FOO]');

      this.runTask(() => this.context.set('hash.foo', 'foo'));

      this.assertText('[foo-foo]');
    }
  }
);

moduleFor(
  'Syntax test: Multiple {{#let as}} helpers',
  class extends RenderingTest {
    ['@test re-using the same variable with different {{#let}} blocks does not override each other']() {
      this.render(
        `Admin: {{#let admin as |person|}}{{person.name}}{{/let}} User: {{#let user as |person|}}{{person.name}}{{/let}}`,
        {
          admin: { name: 'Tom Dale' },
          user: { name: 'Yehuda Katz' },
        }
      );

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

    ['@test the scoped variable is not available outside the {{#let}} block']() {
      this.render(
        `{{ring}}-{{#let first as |ring|}}{{ring}}-{{#let fifth as |ring|}}{{ring}}-{{#let ninth as |ring|}}{{ring}}-{{/let}}{{ring}}-{{/let}}{{ring}}-{{/let}}{{ring}}`,
        {
          ring: 'Greed',
          first: 'Limbo',
          fifth: 'Wrath',
          ninth: 'Treachery',
        }
      );

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

    ['@test it should support {{#let name as |foo|}}, then {{#let foo as |bar|}}']() {
      this.render(`{{#let name as |foo|}}{{#let foo as |bar|}}{{bar}}{{/let}}{{/let}}`, {
        name: 'caterpillar',
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
      this.render(`{{#let this as |person|}}{{person.name}}{{/let}}`, {
        name: 'Los Pivots',
      });

      this.assertText('Los Pivots');

      this.runTask(() => this.rerender());

      this.assertText('Los Pivots');

      this.runTask(() => set(this.context, 'name', "l'Pivots"));

      this.assertText("l'Pivots");

      this.runTask(() => set(this.context, 'name', 'Los Pivots'));

      this.assertText('Los Pivots');
    }

    ['@test nested {{#let}} blocks should have access to root context']() {
      this.render(
        strip`
        {{name}}
        {{#let committer1.name as |name|}}
          [{{name}}
          {{#let committer2.name as |name|}}
            [{{name}}]
          {{/let}}
          {{name}}]
        {{/let}}
        {{name}}
        {{#let committer2.name as |name|}}
          [{{name}}
          {{#let committer1.name as |name|}}
            [{{name}}]
          {{/let}}
          {{name}}]
        {{/let}}
        {{name}}
      `,
        {
          name: 'ebryn',
          committer1: { name: 'trek' },
          committer2: { name: 'machty' },
        }
      );

      this.assertText('ebryn[trek[machty]trek]ebryn[machty[trek]machty]ebryn');

      this.runTask(() => this.rerender());

      this.assertText('ebryn[trek[machty]trek]ebryn[machty[trek]machty]ebryn');

      this.runTask(() => set(this.context, 'name', 'chancancode'));

      this.assertText('chancancode[trek[machty]trek]chancancode[machty[trek]machty]chancancode');

      this.runTask(() => set(this.context, 'committer1', { name: 'krisselden' }));

      this.assertText(
        'chancancode[krisselden[machty]krisselden]chancancode[machty[krisselden]machty]chancancode'
      );

      this.runTask(() => {
        set(this.context, 'committer1.name', 'wycats');
        set(this.context, 'committer2', { name: 'rwjblue' });
      });

      this.assertText(
        'chancancode[wycats[rwjblue]wycats]chancancode[rwjblue[wycats]rwjblue]chancancode'
      );

      this.runTask(() => {
        set(this.context, 'name', 'ebryn');
        set(this.context, 'committer1', { name: 'trek' });
        set(this.context, 'committer2', { name: 'machty' });
      });

      this.assertText('ebryn[trek[machty]trek]ebryn[machty[trek]machty]ebryn');
    }
  }
);
