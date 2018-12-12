import { moduleFor, RenderingTestCase, strip, applyMixins } from 'internal-test-helpers';

import { get, set } from '@ember/-internals/metal';
import { Object as EmberObject, ObjectProxy } from '@ember/-internals/runtime';
import { HAS_NATIVE_SYMBOL } from '@ember/-internals/utils';

import {
  TogglingSyntaxConditionalsTest,
  TruthyGenerator,
  FalsyGenerator,
} from '../../utils/shared-conditional-tests';

function EmptyFunction() {}
function NonEmptyFunction() {}
NonEmptyFunction.foo = 'bar';
class EmptyConstructor {}
class NonEmptyConstructor {}
NonEmptyConstructor.foo = 'bar';

class TogglingEachInTest extends TogglingSyntaxConditionalsTest {
  templateFor({ cond, truthy, falsy }) {
    return `{{#each-in ${cond} as |key|}}${truthy}{{else}}${falsy}{{/each-in}}`;
  }
}
class BasicEachInTest extends TogglingEachInTest {}

class BasicSyntaxTest extends BasicEachInTest {
  get truthyValue() {
    return { 'Not Empty': 1 };
  }

  get falsyValue() {
    return {};
  }
}

class EachInProxyTest extends TogglingEachInTest {}

applyMixins(
  BasicEachInTest,
  new TruthyGenerator([
    { foo: 1 },
    EmberObject.create({ 'Not Empty': 1 }),
    [1],
    NonEmptyFunction,
    NonEmptyConstructor,
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
    EmberObject.create(),
  ])
);

applyMixins(
  EachInProxyTest,

  new TruthyGenerator([ObjectProxy.create({ content: { 'Not empty': 1 } })]),

  new FalsyGenerator([
    ObjectProxy.create(),
    ObjectProxy.create({ content: null }),
    ObjectProxy.create({ content: {} }),
    ObjectProxy.create({ content: Object.create(null) }),
    ObjectProxy.create({ content: Object.create({}) }),
    ObjectProxy.create({ content: Object.create({ 'Not Empty': 1 }) }),
    ObjectProxy.create({ content: EmberObject.create() }),
  ])
);

// Truthy/Falsy tests
moduleFor(
  'Syntax test: {{#each-in}} with `ObjectProxy`',
  class extends EachInProxyTest {
    get truthyValue() {
      return ObjectProxy.create({ content: { 'Not Empty': 1 } });
    }

    get falsyValue() {
      return ObjectProxy.create({ content: null });
    }
  }
);

moduleFor('Syntax test: {{#each-in}}', BasicSyntaxTest);

// Rendering tests
class AbstractEachInTest extends RenderingTestCase {
  createHash(/* hash */) {
    throw new Error('Not implemented: `createHash`');
  }

  makeHash(obj) {
    let { hash, delegate } = this.createHash(obj);

    this.hash = hash;
    this.delegate = delegate;
    return hash;
  }

  replaceHash(hash) {
    this.runTask(() => set(this.context, 'hash', this.createHash(hash).hash));
  }

  clear() {
    return this.runTask(() => set(this.context, 'hash', this.createHash({}).hash));
  }

  setProp(key, value) {
    return this.runTask(() => this.delegate.setProp(this.context, key, value));
  }

  updateNestedValue(key, innerKey, value) {
    return this.runTask(() => this.delegate.updateNestedValue(this.context, key, innerKey, value));
  }

  render(template, context = {}) {
    if (this.hash !== undefined) {
      context.hash = this.hash;
    }
    if (this.type !== undefined) {
      context.type = this.type;
    }
    context.secretKey = 'asd';

    return super.render(template, context);
  }
}

class EachInTest extends AbstractEachInTest {
  [`@test it repeats the given block for each item in the hash`]() {
    this.makeHash({ Smartphones: 8203, 'JavaScript Frameworks': Infinity });

    this.render(
      `<ul>{{#each-in hash as |category count|}}<li>{{category}}: {{count}}</li>{{else}}Empty!{{/each-in}}</ul>`
    );

    this.assertText('Smartphones: 8203JavaScript Frameworks: Infinity');

    this.assertStableRerender();

    if (this.allowsSetProp) {
      // Not al backing data structures allow kvo tracking. Maps and Iterables don't
      this.setProp('Tweets', 100);

      this.assertText('Smartphones: 8203JavaScript Frameworks: InfinityTweets: 100');
    }

    this.clear();

    this.assertText('Empty!');
  }

  [`@test it can render sub-paths of each item`](assert) {
    this.makeHash({
      Smartphones: { reports: { unitsSold: 8203 } },
      'JavaScript Frameworks': { reports: { unitsSold: Infinity } },
    });

    this.render(
      `<ul>{{#each-in hash as |category data|}}<li>{{category}}: {{data.reports.unitsSold}}</li>{{else}}Empty!{{/each-in}}</ul>`
    );

    this.assertText('Smartphones: 8203JavaScript Frameworks: Infinity');

    this.assertStableRerender();

    if (this.allowsSetProp) {
      this.setProp('Tweets', { reports: { unitsSold: 100 } });

      this.assertText('Smartphones: 8203JavaScript Frameworks: InfinityTweets: 100');
    }

    this.runTask(() => this.updateNestedValue('Smartphones', 'reports.unitsSold', 8204));

    assert.ok(this.textValue().indexOf('Smartphones: 8204') > -1);

    this.clear();

    this.assertText('Empty!');
  }

  [`@test it can render duplicate items`]() {
    this.makeHash({
      Smartphones: 8203,
      Tablets: 8203,
      'JavaScript Frameworks': Infinity,
      Bugs: Infinity,
    });

    this.render(
      `<ul>{{#each-in hash key='@identity' as |category count|}}<li>{{category}}: {{count}}</li>{{/each-in}}</ul>`
    );

    this.assertText('Smartphones: 8203Tablets: 8203JavaScript Frameworks: InfinityBugs: Infinity');

    this.assertStableRerender();

    if (this.allowsSetProp) {
      this.setProp('Smartphones', 100);
      this.setProp('Tweets', 443115);
      this.assertText(
        'Smartphones: 100Tablets: 8203JavaScript Frameworks: InfinityBugs: InfinityTweets: 443115'
      );
    }

    this.clear();

    this.assertText('');
  }

  [`@test it repeats the given block when the hash is dynamic`]() {
    let { hash: categories } = this.createHash({
      Smartphones: 8203,
      'JavaScript Frameworks': Infinity,
    });
    let { hash: otherCategories } = this.createHash({
      Emberinios: 533462,
      Tweets: 7323,
    });
    let context = {
      hashes: {
        categories,
        otherCategories,
        type: 'categories',
      },
    };
    this.render(
      `<ul>{{#each-in (get hashes hashes.type) as |category count|}}<li>{{category}}: {{count}}</li>{{else}}Empty!{{/each-in}}</ul>`,
      context
    );

    this.assertText('Smartphones: 8203JavaScript Frameworks: Infinity');

    this.assertStableRerender();

    this.runTask(() => set(context, 'hashes.type', 'otherCategories'));

    this.assertText('Emberinios: 533462Tweets: 7323');

    this.runTask(() => set(context, 'hashes.type', 'categories'));

    this.assertText('Smartphones: 8203JavaScript Frameworks: Infinity');

    this.runTask(() => set(context, 'hashes.type', 'nonExistent'));

    this.clear();

    this.assertText('Empty!');

    this.runTask(() => set(context, 'hashes.type', 'categories'));

    this.assertText('Smartphones: 8203JavaScript Frameworks: Infinity');
  }

  ['@test keying off of `undefined` does not render']() {
    this.makeHash({});

    this.render(`{{#each-in hash as |key value|}}{{key}}: {{value.baz}}{{else}}Empty!{{/each-in}}`);

    this.assertText('Empty!');

    this.assertStableRerender();

    this.replaceHash({ bar: { baz: 'Here!' } });

    this.assertText('bar: Here!');

    this.clear();

    this.assertText('Empty!');
  }

  [`@test it can render items with a key of empty string`]() {
    this.makeHash({ '': 'empty-string', a: 'a' });

    this.render(
      `<ul>{{#each-in hash as |key value|}}<li>{{key}}: {{value}}</li>{{else}}Empty!{{/each-in}}</ul>`
    );

    this.assertText(': empty-stringa: a');

    this.assertStableRerender();

    this.clear();

    this.assertText('Empty!');
  }
}

moduleFor(
  'Syntax test: {{#each-in}} with POJOs',
  class extends EachInTest {
    constructor() {
      super(...arguments);
      this.allowsSetProp = true;
    }

    createHash(pojo) {
      return {
        hash: pojo,
        delegate: {
          setProp(context, key, value) {
            set(context.hash, key, value);
          },
          updateNestedValue(context, key, innerKey, value) {
            let target = context.hash[key];
            set(target, innerKey, value);
          },
        },
      };
    }

    [`@test it only iterates over an object's own properties`]() {
      let protoCategories = {
        Smartphones: 8203,
        'JavaScript Frameworks': Infinity,
      };

      let categories = Object.create(protoCategories);
      categories['Televisions'] = 183;
      categories['Alarm Clocks'] = 999;

      this.render(
        `<ul>{{#each-in categories as |category count|}}<li>{{category}}: {{count}}</li>{{else}}Empty!{{/each-in}}</ul>`,
        { categories }
      );

      this.assertText('Televisions: 183Alarm Clocks: 999');

      this.assertStableRerender();

      this.runTask(() => {
        set(protoCategories, 'Robots', 666);
        set(categories, 'Tweets', 443115);
      });

      this.assertText('Televisions: 183Alarm Clocks: 999Tweets: 443115');

      categories = Object.create(protoCategories);
      categories['Televisions'] = 183;
      categories['Alarm Clocks'] = 999;
    }

    [`@test it does not observe direct property mutations (not going through set) on the object`]() {
      this.render(
        strip`
      <ul>
        {{#each-in categories as |category count|}}
          <li>{{category}}: {{count}}</li>
        {{/each-in}}
      </ul>
    `,
        {
          categories: {
            Smartphones: 8203,
            'JavaScript Frameworks': Infinity,
          },
        }
      );

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
          Emberinios: 123456,
        });
      });

      this.assertHTML(strip`
      <ul>
        <li>Emberinios: 123456</li>
      </ul>
    `);

      this.runTask(() => {
        set(this.context, 'categories', {
          Smartphones: 8203,
          'JavaScript Frameworks': Infinity,
        });
      });

      this.assertHTML(strip`
      <ul>
        <li>Smartphones: 8203</li>
        <li>JavaScript Frameworks: Infinity</li>
      </ul>
    `);
    }

    ['@test it skips holes in sparse arrays']() {
      let arr = [];
      arr[5] = 'foo';
      arr[6] = 'bar';

      this.render(
        strip`
      {{#each-in arr as |key value|}}
        [{{key}}:{{value}}]
      {{/each-in}}`,
        { arr }
      );

      this.assertText('[5:foo][6:bar]');

      this.assertStableRerender();
    }

    ['@test it iterate over array with `in` instead of walking over elements']() {
      let arr = [1, 2, 3];
      arr.foo = 'bar';

      this.render(
        strip`
      {{#each-in arr as |key value|}}
        [{{key}}:{{value}}]
      {{/each-in}}`,
        { arr }
      );

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
  }
);

moduleFor(
  'Syntax test: {{#each-in}} with EmberObjects',
  class extends EachInTest {
    constructor() {
      super(...arguments);
      this.allowsSetProp = true;
    }
    createHash(pojo) {
      let hash = EmberObject.create(pojo);
      return {
        hash,
        delegate: {
          setProp(context, key, value) {
            set(context, `hash.${key}`, value);
          },
          updateNestedValue(context, key, innerKey, value) {
            let target = get(context.hash, key);
            set(target, innerKey, value);
          },
        },
      };
    }
  }
);

moduleFor(
  'Syntax test: {{#each-in}} with object proxies',
  class extends EachInTest {
    constructor() {
      super(...arguments);
      this.allowsSetProp = true;
    }
    createHash(pojo) {
      let hash = ObjectProxy.create({ content: pojo });
      return {
        hash,
        delegate: {
          setProp(context, key, value) {
            set(context, `hash.${key}`, value);
          },
          updateNestedValue(context, key, innerKey, value) {
            let target = get(context.hash, key);
            set(target, innerKey, value);
          },
        },
      };
    }

    ['@test it iterates over the content, not the proxy']() {
      let content = {
        Smartphones: 8203,
        'JavaScript Frameworks': Infinity,
      };

      let proxy = ObjectProxy.create({
        content,
        foo: 'bar',
      });

      this.render(
        strip`
      <ul>
        {{#each-in categories as |category count|}}
          <li>{{category}}: {{count}}</li>
        {{/each-in}}
      </ul>
    `,
        { categories: proxy }
      );

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
          Smartphones: 100,
          Tablets: 20,
        });
      });

      this.assertHTML(strip`
      <ul>
        <li>Smartphones: 100</li>
        <li>Tablets: 20</li>
      </ul>
    `);

      this.runTask(() =>
        set(
          this.context,
          'categories',
          ObjectProxy.create({
            content: {
              Smartphones: 8203,
              'JavaScript Frameworks': Infinity,
            },
          })
        )
      );

      this.assertHTML(strip`
      <ul>
        <li>Smartphones: 8203</li>
        <li>JavaScript Frameworks: Infinity</li>
      </ul>
    `);
    }
  }
);

moduleFor(
  'Syntax test: {{#each-in}} with ES6 Maps',
  class extends EachInTest {
    createHash(pojo) {
      let map = new Map();
      Object.keys(pojo).forEach(key => {
        map.set(key, pojo[key]);
      });
      return {
        hash: map,
        delegate: {
          updateNestedValue(context, key, innerKey, value) {
            let target = context.hash.get(key);
            set(target, innerKey, value);
          },
        },
      };
    }

    [`@test it supports having objects as keys on ES6 Maps`]() {
      let map = new Map();
      map.set({ name: 'one' }, 'foo');
      map.set({ name: 'two' }, 'bar');

      this.render(
        strip`
      <ul>
        {{#each-in map key="@identity" as |key value|}}
          <li>{{key.name}}: {{value}}</li>
        {{/each-in}}
      </ul>`,
        { map }
      );

      this.assertHTML(strip`
      <ul>
        <li>one: foo</li>
        <li>two: bar</li>
      </ul>
    `);

      this.assertStableRerender();

      this.runTask(() => {
        let map = new Map();
        map.set({ name: 'three' }, 'qux');
        set(this.context, 'map', map);
      });

      this.assertHTML(strip`
      <ul>
        <li>three: qux</li>
      </ul>
    `);
    }
  }
);

if (HAS_NATIVE_SYMBOL) {
  moduleFor(
    'Syntax test: {{#each-in}} with custom iterables',
    class extends EachInTest {
      createHash(pojo) {
        let ary = Object.keys(pojo).reduce((accum, key) => {
          return accum.concat([[key, pojo[key]]]);
        }, []);
        let iterable = {
          [Symbol.iterator]: () => makeIterator(ary),
        };
        return {
          hash: iterable,
          delegate: {
            updateNestedValue(context, key, innerKey, value) {
              let ary = Array.from(context.hash);
              let target = ary.find(([k]) => k === key)[1];
              set(target, innerKey, value);
            },
          },
        };
      }
    }
  );
}

// Utils
function makeIterator(ary) {
  var index = 0;

  return {
    next() {
      return index < ary.length ? { value: ary[index++], done: false } : { done: true };
    },
  };
}
