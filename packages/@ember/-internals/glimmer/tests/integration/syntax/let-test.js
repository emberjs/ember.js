import { moduleFor, RenderingTestCase, strip, runTask } from 'internal-test-helpers';

import { get, set } from '@ember/object';
import { A as emberA, removeAt } from '@ember/array';
import ObjectProxy from '@ember/object/proxy';

moduleFor(
  'Syntax test: {{#let as}}',
  class extends RenderingTestCase {
    templateFor({ cond, truthy, falsy }) {
      return `{{#let ${cond} as |test|}}${truthy}{{else}}${falsy}{{/let}}`;
    }

    ['@test it renders the block if `undefined` is passed as an argument']() {
      this.render(
        strip`
        {{#let this.foo.bar.baz as |thing|}}
          value: "{{thing}}"
        {{/let}}`,
        { foo: {} }
      );

      this.assertText('value: ""');

      runTask(() => this.rerender());

      this.assertText('value: ""');

      runTask(() => set(this.context, 'foo', { bar: { baz: 'Here!' } }));

      this.assertText('value: "Here!"');

      runTask(() => set(this.context, 'foo', {}));

      this.assertText('value: ""');
    }

    ['@test it renders the block if arguments are falsey']() {
      this.render(`{{#let this.cond1 this.cond2 as |cond|}}value: "{{this.cond1}}"{{/let}}`, {
        cond1: false,
      });

      this.assertText('value: "false"');

      runTask(() => this.rerender());

      this.assertText('value: "false"');

      runTask(() => set(this.context, 'cond1', ''));

      this.assertText('value: ""');

      runTask(() => set(this.context, 'cond1', 0));

      this.assertText('value: "0"');
    }

    ['@test it yields multiple arguments in order']() {
      this.render(`{{#let this.foo this.bar this.baz.name as |a b c|}}{{a}} {{b}} {{c}}{{/let}}`, {
        foo: 'Señor Engineer',
        bar: '',
        baz: { name: 'Dale' },
      });

      this.assertText('Señor Engineer  Dale');

      runTask(() => set(this.context, 'bar', 'Tom'));

      this.assertText('Señor Engineer Tom Dale');
    }

    ['@test can access alias and original scope']() {
      this.render(`{{#let this.person as |tom|}}{{this.title}}: {{tom.name}}{{/let}}`, {
        title: 'Señor Engineer',
        person: { name: 'Tom Dale' },
      });

      this.assertText('Señor Engineer: Tom Dale');

      runTask(() => this.rerender());

      this.assertText('Señor Engineer: Tom Dale');

      runTask(() => {
        set(this.context, 'person.name', 'Yehuda Katz');
        set(this.context, 'title', 'Principal Engineer');
      });

      this.assertText('Principal Engineer: Yehuda Katz');

      runTask(() => {
        set(this.context, 'person', { name: 'Tom Dale' });
        set(this.context, 'title', 'Señor Engineer');
      });

      this.assertText('Señor Engineer: Tom Dale');
    }

    ['@test the scoped variable is not available outside the {{#let}} block.']() {
      this.render(`{{name}}-{{#let this.other as |name|}}{{name}}{{/let}}-{{name}}`, {
        other: 'Yehuda',
      });

      this.assertText('-Yehuda-');

      runTask(() => this.rerender());

      this.assertText('-Yehuda-');

      runTask(() => set(this.context, 'other', 'Chad'));

      this.assertText('-Chad-');

      runTask(() => set(this.context, 'name', 'Tom'));

      this.assertText('-Chad-');

      runTask(() => {
        set(this.context, 'other', 'Yehuda');
      });

      this.assertText('-Yehuda-');
    }

    ['@test can access alias of a proxy']() {
      this.render(`{{#let this.proxy as |person|}}{{person.name}}{{/let}}`, {
        proxy: ObjectProxy.create({ content: { name: 'Tom Dale' } }),
      });

      this.assertText('Tom Dale');

      runTask(() => this.rerender());

      this.assertText('Tom Dale');

      runTask(() => set(this.context, 'proxy.name', 'Yehuda Katz'));

      this.assertText('Yehuda Katz');

      runTask(() => set(this.context, 'proxy.content', { name: 'Godfrey Chan' }));

      this.assertText('Godfrey Chan');

      runTask(() => set(this.context, 'proxy.content.name', 'Stefan Penner'));

      this.assertText('Stefan Penner');

      runTask(() => set(this.context, 'proxy.content', null));

      this.assertText('');

      runTask(() =>
        set(this.context, 'proxy', ObjectProxy.create({ content: { name: 'Tom Dale' } }))
      );

      this.assertText('Tom Dale');
    }

    ['@test can access alias of an array']() {
      this.render(
        `{{#let this.arrayThing as |words|}}{{#each words as |word|}}{{word}}{{/each}}{{/let}}`,
        {
          arrayThing: emberA(['Hello', ' ', 'world']),
        }
      );

      this.assertText('Hello world');

      runTask(() => this.rerender());

      this.assertText('Hello world');

      runTask(() => {
        let array = get(this.context, 'arrayThing');
        array.replace(0, 1, ['Goodbye']);
        removeAt(array, 1);
        array.insertAt(1, ', ');
        array.pushObject('!');
      });

      this.assertText('Goodbye, world!');

      runTask(() => set(this.context, 'arrayThing', ['Hello', ' ', 'world']));

      this.assertText('Hello world');
    }

    ['@test `attrs` can be used as a block param [GH#14678]']() {
      this.render('{{#let this.hash as |attrs|}}[{{this.hash.foo}}-{{attrs.foo}}]{{/let}}', {
        hash: { foo: 'foo' },
      });

      this.assertText('[foo-foo]');

      runTask(() => this.rerender());

      this.assertText('[foo-foo]');

      runTask(() => this.context.set('hash.foo', 'FOO'));

      this.assertText('[FOO-FOO]');

      runTask(() => this.context.set('hash.foo', 'foo'));

      this.assertText('[foo-foo]');
    }
  }
);

moduleFor(
  'Syntax test: Multiple {{#let as}} helpers',
  class extends RenderingTestCase {
    ['@test re-using the same variable with different {{#let}} blocks does not override each other']() {
      this.render(
        `Admin: {{#let this.admin as |person|}}{{person.name}}{{/let}} User: {{#let this.user as |person|}}{{person.name}}{{/let}}`,
        {
          admin: { name: 'Tom Dale' },
          user: { name: 'Yehuda Katz' },
        }
      );

      this.assertText('Admin: Tom Dale User: Yehuda Katz');

      runTask(() => this.rerender());

      this.assertText('Admin: Tom Dale User: Yehuda Katz');

      runTask(() => {
        set(this.context, 'admin.name', 'Godfrey Chan');
        set(this.context, 'user.name', 'Stefan Penner');
      });

      this.assertText('Admin: Godfrey Chan User: Stefan Penner');

      runTask(() => {
        set(this.context, 'admin', { name: 'Tom Dale' });
        set(this.context, 'user', { name: 'Yehuda Katz' });
      });

      this.assertText('Admin: Tom Dale User: Yehuda Katz');
    }

    ['@test the scoped variable is not available outside the {{#let}} block']() {
      this.render(
        `{{ring}}-{{#let this.first as |ring|}}{{ring}}-{{#let this.fifth as |ring|}}{{ring}}-{{#let this.ninth as |ring|}}{{ring}}-{{/let}}{{ring}}-{{/let}}{{ring}}-{{/let}}{{ring}}`,
        {
          first: 'Limbo',
          fifth: 'Wrath',
          ninth: 'Treachery',
        }
      );

      this.assertText('-Limbo-Wrath-Treachery-Wrath-Limbo-');

      runTask(() => this.rerender());

      this.assertText('-Limbo-Wrath-Treachery-Wrath-Limbo-');

      runTask(() => {
        set(this.context, 'fifth', 'D');
      });

      this.assertText('-Limbo-D-Treachery-D-Limbo-');

      runTask(() => {
        set(this.context, 'first', 'I');
        set(this.context, 'ninth', 'K');
      });

      this.assertText('-I-D-K-D-I-');

      runTask(() => {
        set(this.context, 'first', 'Limbo');
        set(this.context, 'fifth', 'Wrath');
        set(this.context, 'ninth', 'Treachery');
      });

      this.assertText('-Limbo-Wrath-Treachery-Wrath-Limbo-');
    }

    ['@test it should support {{#let name as |foo|}}, then {{#let foo as |bar|}}']() {
      this.render(`{{#let this.name as |foo|}}{{#let foo as |bar|}}{{bar}}{{/let}}{{/let}}`, {
        name: 'caterpillar',
      });

      this.assertText('caterpillar');

      runTask(() => this.rerender());

      this.assertText('caterpillar');

      runTask(() => set(this.context, 'name', 'butterfly'));

      this.assertText('butterfly');

      runTask(() => set(this.context, 'name', 'caterpillar'));

      this.assertText('caterpillar');
    }

    ['@test updating the context should update the alias']() {
      this.render(`{{#let this as |person|}}{{person.name}}{{/let}}`, {
        name: 'Los Pivots',
      });

      this.assertText('Los Pivots');

      runTask(() => this.rerender());

      this.assertText('Los Pivots');

      runTask(() => set(this.context, 'name', "l'Pivots"));

      this.assertText("l'Pivots");

      runTask(() => set(this.context, 'name', 'Los Pivots'));

      this.assertText('Los Pivots');
    }

    ['@test nested {{#let}} blocks should have access to root context']() {
      this.render(
        strip`
        {{name}}
        {{#let this.committer1.name as |name|}}
          [{{name}}
          {{#let this.committer2.name as |name|}}
            [{{name}}]
          {{/let}}
          {{name}}]
        {{/let}}
        {{name}}
        {{#let this.committer2.name as |name|}}
          [{{name}}
          {{#let this.committer1.name as |name|}}
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

      this.assertText('[trek[machty]trek][machty[trek]machty]');

      runTask(() => this.rerender());

      this.assertText('[trek[machty]trek][machty[trek]machty]');

      runTask(() => set(this.context, 'name', 'chancancode'));

      this.assertText('[trek[machty]trek][machty[trek]machty]');

      runTask(() => set(this.context, 'committer1', { name: 'krisselden' }));

      this.assertText('[krisselden[machty]krisselden][machty[krisselden]machty]');

      runTask(() => {
        set(this.context, 'committer1.name', 'wycats');
        set(this.context, 'committer2', { name: 'rwjblue' });
      });

      this.assertText('[wycats[rwjblue]wycats][rwjblue[wycats]rwjblue]');

      runTask(() => {
        set(this.context, 'name', 'ebryn');
        set(this.context, 'committer1', { name: 'trek' });
        set(this.context, 'committer2', { name: 'machty' });
      });

      this.assertText('[trek[machty]trek][machty[trek]machty]');
    }
  }
);
