import { set, get } from 'ember-metal';
import { strip } from '../../utils/abstract-test-case';
import { applyMixins } from '../../utils/abstract-test-case';
import { moduleFor } from '../../utils/test-case';
import { ObjectProxy, Object as EmberObject } from 'ember-runtime';

import {
  TogglingSyntaxConditionalsTest,
  TruthyGenerator,
  FalsyGenerator
} from '../../utils/shared-conditional-tests';

class EachInTest extends TogglingSyntaxConditionalsTest {

  templateFor({ cond, truthy, falsy }) {
    return `{{#each-in ${cond} as |key|}}${truthy}{{else}}${falsy}{{/each-in}}`;
  }

}

function EmptyFunction() {}

function NonEmptyFunction() {}
NonEmptyFunction.foo = 'bar';

class EmptyConstructor {}

class NonEmptyConstructor {}
NonEmptyConstructor.foo = 'bar';

class BasicEachInTest extends EachInTest {}

applyMixins(BasicEachInTest,

  new TruthyGenerator([
    { foo: 1 },
    EmberObject.create({ 'Not Empty': 1 }),
    [1],
    NonEmptyFunction,
    NonEmptyConstructor
  ]),

  new FalsyGenerator([
    null,
    undefined,
    false,
    '',
    0,
    [],
    EmptyFunction,
    EmptyConstructor,
    {},
    Object.create(null),
    Object.create({}),
    Object.create({ 'Not Empty': 1 }),
    EmberObject.create()
  ])
);

moduleFor('Syntax test: {{#each-in}}', class extends BasicEachInTest {

  get truthyValue() {
    return { 'Not Empty': 1 };
  }

  get falsyValue() {
    return {};
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

  [`@test it can render sub-paths of each item`]() {
    this.render(strip`
      <ul>
        {{#each-in categories as |category data|}}
          <li>{{category}}: {{data.reports.unitsSold}}</li>
        {{/each-in}}
      </ul>
    `, {
      categories: {
        'Smartphones': { reports: { unitsSold: 8203 } },
        'JavaScript Frameworks': { reports: { unitsSold: Infinity } }
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
      set(this.context, 'categories.Smartphones.reports.unitsSold', 100);
      set(this.context, 'categories.Tweets', { reports: { unitsSold: 443115 } });
    });

    this.assertHTML(strip`
      <ul>
        <li>Smartphones: 100</li>
        <li>JavaScript Frameworks: Infinity</li>
        <li>Tweets: 443115</li>
      </ul>
    `);

    this.runTask(() => set(this.context, 'categories', {
      'Smartphones': { reports: { unitsSold: 8203 } },
      'JavaScript Frameworks': { reports: { unitsSold: Infinity } }
    }));

    this.assertHTML(strip`
      <ul>
        <li>Smartphones: 8203</li>
        <li>JavaScript Frameworks: Infinity</li>
      </ul>
    `);
  }

  [`@test it can render duplicate items`]() {
    this.render(strip`
      <ul>
        {{#each-in categories key='@identity' as |category count|}}
          <li>{{category}}: {{count}}</li>
        {{/each-in}}
      </ul>
    `, {
      categories: {
        'Smartphones': 8203,
        'Tablets': 8203,
        'JavaScript Frameworks': Infinity,
        'Bugs': Infinity
      }
    });

    this.assertHTML(strip`
      <ul>
        <li>Smartphones: 8203</li>
        <li>Tablets: 8203</li>
        <li>JavaScript Frameworks: Infinity</li>
        <li>Bugs: Infinity</li>
      </ul>
    `);

    this.assertStableRerender();

    this.runTask(() => {
      set(this.context, 'categories.Smartphones', 100);
      set(this.context, 'categories.Tweets', 443115);
    });

    this.assertHTML(strip`
      <ul>
        <li>Smartphones: 100</li>
        <li>Tablets: 8203</li>
        <li>JavaScript Frameworks: Infinity</li>
        <li>Bugs: Infinity</li>
        <li>Tweets: 443115</li>
      </ul>
    `);

    this.runTask(() => set(this.context, 'categories', {
      'Smartphones': 8203,
      'Tablets': 8203,
      'JavaScript Frameworks': Infinity,
      'Bugs': Infinity
    }));

    this.assertHTML(strip`
      <ul>
        <li>Smartphones: 8203</li>
        <li>Tablets: 8203</li>
        <li>JavaScript Frameworks: Infinity</li>
        <li>Bugs: Infinity</li>
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

  [`@test it does not observe direct property mutations (not going through set) on the object`]() {
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
    });

    this.assertHTML(strip`
      <ul>
        <li>Smartphones: 8203</li>
        <li>JavaScript Frameworks: Infinity</li>
      </ul>
    `);
  }

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

  ['@test it iterate over array with `in` instead of walking over elements'](assert) {
    let arr = [1, 2, 3];
    arr.foo = 'bar';

    this.render(strip`
      {{#each-in arr as |key value|}}
        [{{key}}:{{value}}]
      {{/each-in}}`, { arr });

    this.assertText('[0:1][1:2][2:3][foo:bar]');

    this.runTask(() => this.rerender());

    this.assertText('[0:1][1:2][2:3][foo:bar]');

    this.runTask(() => {
      set(arr, 'zomg', 'lol');
    });

    this.assertText('[0:1][1:2][2:3][foo:bar][zomg:lol]');

    arr = [1, 2, 3];
    arr.foo = 'bar';

    this.runTask(() => set(this.context, 'arr', arr));

    this.assertText('[0:1][1:2][2:3][foo:bar]');
  }

});

class EachInEdgeCasesTest extends EachInTest {}

applyMixins(EachInEdgeCasesTest,

  new FalsyGenerator([
    true,
    1,
    'hello'
  ])

);

moduleFor('Syntax test: {{#each-in}} edge cases', class extends EachInEdgeCasesTest {

  get truthyValue() {
    return { 'Not Empty': 1 };
  }

  get falsyValue() {
    return {};
  }

});

class EachInProxyTest extends EachInTest {}

applyMixins(EachInProxyTest,

  new TruthyGenerator([
    ObjectProxy.create({ content: { 'Not empty': 1 } })
  ]),

  new FalsyGenerator([
    ObjectProxy.create(),
    ObjectProxy.create({ content: null }),
    ObjectProxy.create({ content: {} }),
    ObjectProxy.create({ content: Object.create(null) }),
    ObjectProxy.create({ content: Object.create({}) }),
    ObjectProxy.create({ content: Object.create({ 'Not Empty': 1 }) }),
    ObjectProxy.create({ content: EmberObject.create() })
  ])
);

moduleFor('Syntax test: {{#each-in}} with `ObjectProxy`', class extends EachInProxyTest {

  get truthyValue() {
    return ObjectProxy.create({ content: { 'Not Empty': 1 } });
  }

  get falsyValue() {
    return ObjectProxy.create({ content: null });
  }

  ['@test it iterates over the content, not the proxy']() {
    let content = {
      'Smartphones': 8203,
      'JavaScript Frameworks': Infinity
    };

    let proxy = ObjectProxy.create({
      content,
      foo: 'bar'
    });

    this.render(strip`
      <ul>
        {{#each-in categories as |category count|}}
          <li>{{category}}: {{count}}</li>
        {{/each-in}}
      </ul>
    `, { categories: proxy });

    this.assertHTML(strip`
      <ul>
        <li>Smartphones: 8203</li>
        <li>JavaScript Frameworks: Infinity</li>
      </ul>
    `);

    this.assertStableRerender();

    this.runTask(() => {
      set(proxy, 'content.Smartphones', 100);
      set(proxy, 'content.Tweets', 443115);
    });

    this.assertHTML(strip`
      <ul>
        <li>Smartphones: 100</li>
        <li>JavaScript Frameworks: Infinity</li>
        <li>Tweets: 443115</li>
      </ul>
    `);

    this.runTask(() => {
      set(proxy, 'content', {
        'Smartphones': 100,
        'Tablets': 20
      });
    });

    this.assertHTML(strip`
      <ul>
        <li>Smartphones: 100</li>
        <li>Tablets: 20</li>
      </ul>
    `);

    this.runTask(() => set(this.context, 'categories', ObjectProxy.create({
      content: {
        'Smartphones': 8203,
        'JavaScript Frameworks': Infinity
      }
    })));

    this.assertHTML(strip`
      <ul>
        <li>Smartphones: 8203</li>
        <li>JavaScript Frameworks: Infinity</li>
      </ul>
    `);
  }

});
