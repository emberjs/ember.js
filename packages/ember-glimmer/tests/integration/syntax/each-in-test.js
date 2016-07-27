import { set } from 'ember-metal/property_set';
import { get } from 'ember-metal/property_get';
import { strip } from '../../utils/abstract-test-case';
import { applyMixins } from '../../utils/abstract-test-case';
import { moduleFor, RenderingTest } from '../../utils/test-case';
import ObjectProxy from 'ember-runtime/system/object_proxy';
import EmberObject from 'ember-runtime/system/object';

import {
  BasicConditionalsTest,
  SyntaxCondtionalTestHelpers,
  TruthyGenerator,
  FalsyGenerator
} from '../../utils/shared-conditional-tests';

class EachInTest extends BasicConditionalsTest {

  get truthyValue() {
    return { 'Not Empty': 1 };
  }

  get falsyValue() {
    return {};
  }

}

applyMixins(EachInTest,

  SyntaxCondtionalTestHelpers,

  new TruthyGenerator([
    // TODO: figure out what the rest of the cases are
    { foo: 1 },
    EmberObject.create({ 'Not Empty': 1 }),
    ObjectProxy.create({ content: { 'Not empty': 1 } }),
    ObjectProxy.create({ content: Object.create({}) }),
    ObjectProxy.create({ content: EmberObject.create() })
  ]),

  new FalsyGenerator([
    // TODO: figure out what the rest of the cases are
    {},
    Object.create({ 'Not Empty': 1 }),
    Object.create({}),
    EmberObject.create(),
    ObjectProxy.create({}),
    // TODO: These 2 should be falsy but are returning true
    //ObjectProxy.create({ content: null }),
    //ObjectProxy.create({ content: {} }),
    undefined,
    null
  ])
);

moduleFor('Syntax test: {{#each-in}}', class extends EachInTest {

  templateFor({ cond, truthy, falsy }) {
    return `{{#each-in ${cond} as |key|}}${truthy}{{else}}${falsy}{{/each-in}}`;
  }

  [`@test it repeats the given block for each item in the hash`]() {
    this.render(strip`
      <ul>
        {{#each-in categories as |category count|}}
          <li>{{category}}: {{count}}</li>
        {{/each-in}}
      </ul>
    `, {
      categories: {
        'Smartphones': 8203,
        'JavaScript Frameworks': Infinity
      }
    });

    this.assertHTML(strip`
      <ul>
        <li>Smartphones: 8203</li>
        <li>JavaScript Frameworks: Infinity</li>
      </ul>
    `);

    this.assertStableRerender();

    this.runTask(() => {
      set(this.context, 'categories.Smartphones', 100);
      set(this.context, 'categories.Tweets', 443115);

      // {{#each-in}} does not currently observe internal mutations to the hash
      // so we manually trigger a rerender. This behavior may change in the future.
      this.rerender();
    });

    this.assertHTML(strip`
      <ul>
        <li>Smartphones: 100</li>
        <li>JavaScript Frameworks: Infinity</li>
        <li>Tweets: 443115</li>
      </ul>
    `);

    this.runTask(() => set(this.context, 'categories', {
      'Smartphones': 8203,
      'JavaScript Frameworks': Infinity
    }));

    this.assertHTML(strip`
      <ul>
        <li>Smartphones: 8203</li>
        <li>JavaScript Frameworks: Infinity</li>
      </ul>
    `);
  }

  [`@test it repeats the given block when the hash is dynamic`]() {
    this.render(strip`
      <ul>
        {{#each-in (get collection type) as |category count|}}
          <li>{{category}}: {{count}}</li>
        {{/each-in}}
      </ul>
    `, {
      collection: {
        categories: {
          'Smartphones': 8203,
          'JavaScript Frameworks': Infinity
        },
        otherCategories: {
          'Emberinios': 533462,
          'Tweets': 7323
        }
      },
      type: 'categories'
    });

    this.assertHTML(strip`
      <ul>
        <li>Smartphones: 8203</li>
        <li>JavaScript Frameworks: Infinity</li>
      </ul>
    `);

    this.assertStableRerender();

    this.runTask(() => {
      set(this.context, 'type', 'otherCategories');
    });

    this.assertHTML(strip`
      <ul>
        <li>Emberinios: 533462</li>
        <li>Tweets: 7323</li>
      </ul>
    `);

    this.runTask(() => set(this.context, 'type', 'categories'));

    this.assertHTML(strip`
      <ul>
        <li>Smartphones: 8203</li>
        <li>JavaScript Frameworks: Infinity</li>
      </ul>
    `);
  }

  [`@test it only iterates over an object's own properties`]() {
    let protoCategories = {
      'Smartphones': 8203,
      'JavaScript Frameworks': Infinity
    };

    let categories = Object.create(protoCategories);
    categories['Televisions'] = 183;
    categories['Alarm Clocks'] = 999;

    this.render(strip`
      <ul>
        {{#each-in categories as |category count|}}
          <li>{{category}}: {{count}}</li>
        {{/each-in}}
      </ul>
    `, { categories });

    this.assertHTML(strip`
      <ul>
        <li>Televisions: 183</li>
        <li>Alarm Clocks: 999</li>
      </ul>
    `);

    this.assertStableRerender();

    this.runTask(() => {
      set(protoCategories, 'Robots', 666);
      set(categories, 'Tweets', 443115);

      // {{#each-in}} does not currently observe internal mutations to the hash
      // so we manually trigger a rerender. This behavior may change in the future.
      this.rerender();
    });

    this.assertHTML(strip`
      <ul>
        <li>Televisions: 183</li>
        <li>Alarm Clocks: 999</li>
        <li>Tweets: 443115</li>
      </ul>
    `);

    categories = Object.create(protoCategories);
    categories['Televisions'] = 183;
    categories['Alarm Clocks'] = 999;

    this.runTask(() => set(this.context, 'categories', categories));

    this.assertHTML(strip`
      <ul>
        <li>Televisions: 183</li>
        <li>Alarm Clocks: 999</li>
      </ul>
    `);
  }

  [`@test it does not observe property mutations on the object`]() {
    this.render(strip`
      <ul>
        {{#each-in categories as |category count|}}
          <li>{{category}}: {{count}}</li>
        {{/each-in}}
      </ul>
    `, {
      categories: {
        'Smartphones': 8203,
        'JavaScript Frameworks': Infinity
      }
    });

    this.assertHTML(strip`
      <ul>
        <li>Smartphones: 8203</li>
        <li>JavaScript Frameworks: Infinity</li>
      </ul>
    `);

    this.assertStableRerender();

    this.runTask(() => {
      let categories = get(this.context, 'categories');
      delete categories.Smartphones;
    });

    this.assertInvariants();

    this.runTask(() => {
      let categories = get(this.context, 'categories');
      categories['Emberinios'] = 123456;
    });

    this.assertInvariants();

    this.runTask(() => {
      set(this.context, 'categories', {
        Emberinios: 123456
      });
    });

    this.assertHTML(strip`
      <ul>
        <li>Emberinios: 123456</li>
      </ul>
    `);

    this.runTask(() => {
      set(this.context, 'categories', {
        'Smartphones': 8203,
        'JavaScript Frameworks': Infinity
      });
      this.rerender();
    });

    this.assertHTML(strip`
      <ul>
        <li>Smartphones: 8203</li>
        <li>JavaScript Frameworks: Infinity</li>
      </ul>
    `);
  }

});

moduleFor('Syntax test: {{#each-in}} undefined path', class extends RenderingTest {
  ['@test keying off of `undefined` does not render'](assert) {
    this.render(strip`
      {{#each-in foo.bar.baz as |thing|}}
        {{thing}}
      {{/each-in}}`, { foo: {} });

    this.assertText('');

    this.runTask(() => this.rerender());

    this.assertText('');

    this.runTask(() => set(this.context, 'foo', { bar: { baz: { 'Here!': 1 } } }));

    this.assertText('Here!');

    this.runTask(() => set(this.context, 'foo', {}));

    this.assertText('');
  }
});

moduleFor('Syntax test: {{#each-in}}  for array', class extends RenderingTest {
  ['@test it iterate over array with `in` instead of walking over elements'](assert) {
    let arr = [1, 2, 3];

    this.render(strip`
      {{#each-in arr as |key value|}}
        [{{key}}:{{value}}]
      {{/each-in}}`, { arr });

    this.assertText('[0:1][1:2][2:3]');

    this.runTask(() => this.rerender());

    this.assertText('[0:1][1:2][2:3]');

    this.runTask(() => {
      set(arr, 'someKey', 'someKeyValue');
      this.rerender();
    });

    this.assertText('[0:1][1:2][2:3][someKey:someKeyValue]');

    this.runTask(() => {
      delete arr.someKey;
      this.rerender();
    });

    this.assertText('[0:1][1:2][2:3]');

    this.runTask(() => set(this.context, 'arr', [1, 2, 3]));

    this.assertText('[0:1][1:2][2:3]');
  }
});
