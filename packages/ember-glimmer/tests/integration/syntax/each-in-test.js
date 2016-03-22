import { set } from 'ember-metal/property_set';
import { strip } from '../../utils/abstract-test-case';
import { applyMixins } from '../../utils/abstract-test-case';
import { moduleFor } from '../../utils/test-case';
import {
  BasicConditionalsTest,
  SyntaxCondtionalTestHelpers,
  TruthyGenerator,
  FalsyGenerator,
  // ObjectTestCases
} from '../../utils/shared-conditional-tests';

class EachInTest extends BasicConditionalsTest {

  get truthyValue() { return { 'Not Empty': 1 }; }
  get falsyValue() { return {}; }

}

applyMixins(EachInTest,

  SyntaxCondtionalTestHelpers,

  new TruthyGenerator([
    // TODO: figure out what the rest of the cases are
    { foo: 1 }
  ]),

  new FalsyGenerator([
    // TODO: figure out what the rest of the cases are
    {},
    Object.create({ 'Not Empty': 1 }),
    undefined,
    null
  ])

  // TODO(mmun): Add support for object proxies and
  // include the ObjectTestCases mixin.
);

moduleFor('@htmlbars Syntax test: {{#each-in}}', class extends EachInTest {

  templateFor({ cond, truthy, falsy }) {
    return `{{#each-in ${cond}}}${truthy}{{else}}${falsy}{{/each-in}}`;
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

});
