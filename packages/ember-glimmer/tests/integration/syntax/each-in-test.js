import { set, get } from 'ember-metal';
import { strip } from '../../utils/abstract-test-case';
import { applyMixins } from '../../utils/abstract-test-case';
import { moduleFor } from '../../utils/test-case';
import { ObjectProxy, Object as EmberObject } from 'ember-runtime';
import { HAS_NATIVE_SYMBOL } from 'ember-utils';

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

function makeIterator(ary){
  var index = 0;

  return {
    next() {
      return index < ary.length ? { value: ary[index++], done: false } : { done: true };
    }
  };
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

class BasicSyntaxTest extends BasicEachInTest {
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

  ['@test keying off of `undefined` does not render']() {
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

  ['@test it iterate over array with `in` instead of walking over elements']() {
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

  ['@test it skips holes in sparse arrays']() {
    let arr = [];
    arr[5] = 'foo';
    arr[6] = 'bar';

    this.render(strip`
      {{#each-in arr as |key value|}}
        [{{key}}:{{value}}]
      {{/each-in}}`, { arr });

    this.assertText('[5:foo][6:bar]');

    this.assertStableRerender();
  }

  ['@test it repeats the given block for each item in the ES6 map']() {
    let map = new window.Map();
    map.set('one', 'foo');
    map.set('two', 'bar');

    this.render(strip`
      <ul>
        {{#each-in map as |key value|}}
          <li>{{key}}: {{value}}</li>
        {{/each-in}}
      </ul>`, { map });

    this.assertHTML(strip`
      <ul>
        <li>one: foo</li>
        <li>two: bar</li>
      </ul>
    `);

    this.assertStableRerender();

    this.runTask(() => {
      let map = new window.Map();
      map.set('three', 'qux');
      set(this.context, 'map', map);
    });

    this.assertHTML(strip`
      <ul>
        <li>three: qux</li>
      </ul>
    `);
  }

  ['@test it can render sub-paths of each item on ES6 Maps']() {
    let map = new window.Map();
    map.set('one', { name: 'foo' });
    map.set('two', { name: 'bar' });

    this.render(strip`
      <ul>
        {{#each-in map as |key value|}}
          <li>{{key}}: {{value.name}}</li>
        {{/each-in}}
      </ul>`, { map });

    this.assertHTML(strip`
      <ul>
        <li>one: foo</li>
        <li>two: bar</li>
      </ul>
    `);

    this.assertStableRerender();

    this.runTask(() => {
      let map = new window.Map();
      map.set('three', { name: 'qux' });
      set(this.context, 'map', map);
    });

    this.assertHTML(strip`
      <ul>
        <li>three: qux</li>
      </ul>
    `);
  }

  ['@test it renders the else block on empty ES6 Maps']() {
    let map = new window.Map();

    this.render(strip`
      <ul>
        {{#each-in map as |key value|}}
          <li>{{key}}: {{value.name}}</li>
        {{else}}
          NADA
        {{/each-in}}
      </ul>`, { map });

    this.assertHTML(strip`
      <ul>
        NADA
      </ul>
    `);

    this.assertStableRerender();

    this.runTask(() => {
      let map = new window.Map();
      map.set('three', { name: 'qux' });
      set(this.context, 'map', map);
    });

    this.assertHTML(strip`
      <ul>
        <li>three: qux</li>
      </ul>
    `);
  }

  [`@test it can render duplicate items on ES6 Maps`]() {
    let map = new window.Map();
    map.set('Smartphones', 8203);
    map.set('Tablets', 8203);
    map.set('JavaScript Frameworks', Infinity);
    map.set('Bugs', Infinity);

    this.render(strip`
      <ul>
        {{#each-in categories key='@identity' as |category count|}}
          <li>{{category}}: {{count}}</li>
        {{/each-in}}
      </ul>
    `, {
      categories: map
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
      let map = new window.Map();
      map.set('Smartphones', 100);
      map.set('Tweets', 443115);
      set(this.context, 'categories', map);
    });

    this.assertHTML(strip`
      <ul>
        <li>Smartphones: 100</li>
        <li>Tweets: 443115</li>
      </ul>
    `);
  }

  [`@test it supports having objects as keys on the ES6 Maps`]() {
    let map = new window.Map();
    map.set({ name: 'one' }, 'foo');
    map.set({ name: 'two' }, 'bar');

    this.render(strip`
      <ul>
        {{#each-in map key="@identity" as |key value|}}
          <li>{{key.name}}: {{value}}</li>
        {{/each-in}}
      </ul>`, { map });

    this.assertHTML(strip`
      <ul>
        <li>one: foo</li>
        <li>two: bar</li>
      </ul>
    `);

    this.assertStableRerender();

    this.runTask(() => {
      let map = new window.Map();
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


if (HAS_NATIVE_SYMBOL) {
  BasicSyntaxTest.prototype['@test it repeats the given block for each pair of entry in the iterable'] = function() {
    let iterable = {
      [Symbol.iterator]: () => makeIterator([['one', 'foo'], ['two', 'bar']])
    };

    this.render(strip`
    <ul>
      {{#each-in iterable as |key value|}}
        <li>{{key}}: {{value}}</li>
      {{/each-in}}
    </ul>`, { iterable });

    this.assertHTML(strip`
      <ul>
        <li>one: foo</li>
        <li>two: bar</li>
      </ul>
    `);

    this.assertStableRerender();

    this.runTask(() => {
      let iterable = {
        [Symbol.iterator]: () => makeIterator([['three', 'qux']])
      };
      set(this.context, 'iterable', iterable);
    });

    this.assertHTML(strip`
      <ul>
        <li>three: qux</li>
      </ul>
    `);
  };

  BasicSyntaxTest.prototype['@test it can render sub-paths of each item on an iterable'] = function() {
    let iterable = {
      [Symbol.iterator]: () => makeIterator([['one', { name: 'foo' }], ['two', { name: 'bar' }]])
    };

    this.render(strip`
      <ul>
        {{#each-in iterable as |key value|}}
          <li>{{key}}: {{value.name}}</li>
        {{/each-in}}
      </ul>`, { iterable });

    this.assertHTML(strip`
      <ul>
        <li>one: foo</li>
        <li>two: bar</li>
      </ul>
    `);

    this.assertStableRerender();

    this.runTask(() => {
      let iterable = {
        [Symbol.iterator]: () => makeIterator([['three', { name: 'qux' }]])
      };
      set(this.context, 'iterable', iterable);
    });

    this.assertHTML(strip`
      <ul>
        <li>three: qux</li>
      </ul>
    `);
  };

  BasicSyntaxTest.prototype['@test it renders the else block on empty an iterable'] = function() {
    let iterable = {
      [Symbol.iterator]: () => makeIterator([])
    };

    this.render(strip`
      <ul>
        {{#each-in iterable as |key value|}}
          <li>{{key}}: {{value.name}}</li>
        {{else}}
          NADA
        {{/each-in}}
      </ul>`, { iterable });

    this.assertHTML(strip`
      <ul>
        NADA
      </ul>
    `);

    this.assertStableRerender();

    this.runTask(() => {
      let iterable = {
        [Symbol.iterator]: () => makeIterator([['three', { name: 'qux' }]])
      };
      set(this.context, 'iterable', iterable);
    });

    this.assertHTML(strip`
      <ul>
        <li>three: qux</li>
      </ul>
    `);
  };

  BasicSyntaxTest.prototype[`@test it can render duplicate items on an iterable`] = function() {
    let iterable = {
      [Symbol.iterator]: () => makeIterator([
        ['Smartphones', '8203'],
        ['Tablets', '8203'],
        ['JavaScript Frameworks', Infinity],
        ['Bugs', Infinity]
      ])
    };

    this.render(strip`
      <ul>
        {{#each-in categories key='@identity' as |category count|}}
          <li>{{category}}: {{count}}</li>
        {{/each-in}}
      </ul>
    `, {
      categories: iterable
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
      let iterable = {
        [Symbol.iterator]: () => makeIterator([
          ['Smartphones', 100],
          ['Tweets', 443115]
        ])
      };
      set(this.context, 'categories', iterable);
    });

    this.assertHTML(strip`
      <ul>
        <li>Smartphones: 100</li>
        <li>Tweets: 443115</li>
      </ul>
    `);
  };
}

moduleFor('Syntax test: {{#each-in}}', BasicSyntaxTest);

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
