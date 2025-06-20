/* eslint-disable no-new-wrappers */

import { RenderingTestCase, applyMixins, runTask } from 'internal-test-helpers';

import { htmlSafe } from '@ember/-internals/glimmer';
import { get, set } from '@ember/object';
import EmberObject from '@ember/object';
import { removeAt } from '@ember/array';

import { Component } from './helpers';
import { tracked } from 'tracked-built-ins';

class AbstractConditionalsTest extends RenderingTestCase {
  get truthyValue() {
    return true;
  }

  get falsyValue() {
    return false;
  }

  wrapperFor(templates) {
    return templates.join('');
  }

  wrappedTemplateFor(options) {
    return this.wrapperFor([this.templateFor(options)]);
  }

  /* abstract */
  templateFor(/* { cond, truthy, falsy } */) {
    // e.g. `{{#if ${cond}}}${truthy}{{else}}${falsy}{{/if}}`
    throw new Error('Not implemented: `templateFor`');
  }

  /* abstract */
  renderValues(/* ...values */) {
    throw new Error('Not implemented: `renderValues`');
  }
}

class AbstractGenerator {
  constructor(cases) {
    this.cases = cases;
  }

  /* abstract */
  generate(/* value, idx */) {
    throw new Error('Not implemented: `generate`');
  }
}

/*
  The test cases in this file generally follow the following pattern:

  1. Render with [ truthy, ...(other truthy variations), falsy, ...(other falsy variations) ]
  2. No-op rerender
  3. Make all of them falsy (through interior mutation)
  4. Make all of them truthy (through interior mutation, sometimes with some slight variations)
  5. Reset them to their original values (through replacement)
*/

export class TruthyGenerator extends AbstractGenerator {
  generate(value, idx) {
    return {
      [`@test it should consider ${JSON.stringify(value)} truthy [${idx}]`]() {
        this.renderValues(value);

        this.assertText('T1');

        runTask(() => this.rerender());

        this.assertText('T1');

        runTask(() => set(this.context, 'cond1', this.falsyValue));

        this.assertText('F1');

        runTask(() => set(this.context, 'cond1', value));

        this.assertText('T1');
      },
    };
  }
}

export class FalsyGenerator extends AbstractGenerator {
  generate(value, idx) {
    return {
      [`@test it should consider ${JSON.stringify(value)} falsy [${idx}]`]() {
        this.renderValues(value);

        this.assertText('F1');

        runTask(() => this.rerender());

        this.assertText('F1');

        runTask(() => set(this.context, 'cond1', this.truthyValue));

        this.assertText('T1');

        runTask(() => set(this.context, 'cond1', value));

        this.assertText('F1');
      },
    };
  }
}

export class StableTruthyGenerator extends TruthyGenerator {
  generate(value, idx) {
    return Object.assign(super.generate(value, idx), {
      [`@test it maintains DOM stability when condition changes from ${value} to another truthy value and back [${idx}]`]() {
        this.renderValues(value);

        this.assertText('T1');

        this.takeSnapshot();

        runTask(() => set(this.context, 'cond1', this.truthyValue));

        this.assertText('T1');

        this.assertInvariants();

        runTask(() => set(this.context, 'cond1', value));

        this.assertText('T1');

        this.assertInvariants();
      },
    });
  }
}

export class StableFalsyGenerator extends FalsyGenerator {
  generate(value, idx) {
    return Object.assign(super.generate(value), {
      [`@test it maintains DOM stability when condition changes from ${value} to another falsy value and back [${idx}]`]() {
        this.renderValues(value);

        this.assertText('F1');

        this.takeSnapshot();

        runTask(() => set(this.context, 'cond1', this.falsyValue));

        this.assertText('F1');

        this.assertInvariants();

        runTask(() => set(this.context, 'cond1', value));

        this.assertText('F1');

        this.assertInvariants();
      },
    });
  }
}

// Testing behaviors shared across all conditionals, i.e. {{#if}}, {{#unless}},
// {{#each}}, {{#each-in}}, (if) and (unless)
export class BasicConditionalsTest extends AbstractConditionalsTest {
  ['@test it renders the corresponding block based on the conditional']() {
    this.renderValues(this.truthyValue, this.falsyValue);

    this.assertText('T1F2');

    runTask(() => this.rerender());

    this.assertText('T1F2');

    runTask(() => set(this.context, 'cond1', this.falsyValue));

    this.assertText('F1F2');

    runTask(() => {
      set(this.context, 'cond1', this.truthyValue);
      set(this.context, 'cond2', this.truthyValue);
    });

    this.assertText('T1T2');

    runTask(() => {
      set(this.context, 'cond1', this.truthyValue);
      set(this.context, 'cond2', this.falsyValue);
    });

    this.assertText('T1F2');
  }
}

// Testing behaviors related to arrays and array proxies
export const ArrayTestCases = {
  ['@test it considers empty arrays falsy']() {
    this.renderValues(tracked(['hello']), tracked([]));

    this.assertText('T1F2');

    runTask(() => this.rerender());

    this.assertText('T1F2');

    runTask(() => removeAt(get(this.context, 'cond1'), 0));

    this.assertText('F1F2');

    runTask(() => {
      get(this.context, 'cond1').push('hello');
      get(this.context, 'cond2').push(1);
    });

    this.assertText('T1T2');

    runTask(() => {
      set(this.context, 'cond1', ['hello']);
      set(this.context, 'cond2', []);
    });

    this.assertText('T1F2');
  },
};

const IfUnlessWithTestCases = [
  new StableTruthyGenerator([
    true,
    ' ',
    'hello',
    'false',
    'null',
    'undefined',
    1,
    ['hello'],
    {},
    { foo: 'bar' },
    EmberObject.create(),
    EmberObject.create({ foo: 'bar' }),
    Object,
    function () {},
    async function () {},
    new String('hello'),
    new String(''),
    new Boolean(true),
    new Boolean(false),
    new Date(),
    htmlSafe(' '),
  ]),

  new StableFalsyGenerator([false, null, undefined, '', 0, [], htmlSafe('')]),

  ArrayTestCases,
];

// Testing behaviors shared across the "toggling" conditionals, i.e. {{#if}},
// {{#unless}}, {{#each}}, {{#each-in}}, (if) and (unless)
export class TogglingConditionalsTest extends BasicConditionalsTest {}

// Testing behaviors shared across the (if) and (unless) helpers
export class TogglingHelperConditionalsTest extends TogglingConditionalsTest {
  renderValues(...values) {
    let templates = [];
    let context = {};

    for (let i = 1; i <= values.length; i++) {
      templates.push(
        this.templateFor({ cond: `this.cond${i}`, truthy: `this.t${i}`, falsy: `this.f${i}` })
      );
      context[`t${i}`] = `T${i}`;
      context[`f${i}`] = `F${i}`;
      context[`cond${i}`] = values[i - 1];
    }

    let wrappedTemplate = this.wrapperFor(templates);
    this.render(wrappedTemplate, context);
  }

  ['@test it has access to the outer scope from both templates']() {
    let template = this.wrapperFor([
      this.templateFor({ cond: 'this.cond1', truthy: 'this.truthy', falsy: 'this.falsy' }),
      this.templateFor({ cond: 'this.cond2', truthy: 'this.truthy', falsy: 'this.falsy' }),
    ]);

    this.render(template, {
      cond1: this.truthyValue,
      cond2: this.falsyValue,
      truthy: 'YES',
      falsy: 'NO',
    });

    this.assertText('YESNO');

    runTask(() => this.rerender());

    this.assertText('YESNO');

    runTask(() => {
      set(this.context, 'truthy', 'YASS');
      set(this.context, 'falsy', 'NOPE');
    });

    this.assertText('YASSNOPE');

    runTask(() => {
      set(this.context, 'cond1', this.falsyValue);
      set(this.context, 'cond2', this.truthyValue);
    });

    this.assertText('NOPEYASS');

    runTask(() => {
      set(this.context, 'truthy', 'YES');
      set(this.context, 'falsy', 'NO');
      set(this.context, 'cond1', this.truthyValue);
      set(this.context, 'cond2', this.falsyValue);
    });

    this.assertText('YESNO');
  }

  ['@test it does not update when the unbound helper is used']() {
    let template = this.wrapperFor([
      this.templateFor({
        cond: '(unbound this.cond1)',
        truthy: '"T1"',
        falsy: '"F1"',
      }),
      this.templateFor({
        cond: '(unbound this.cond2)',
        truthy: '"T2"',
        falsy: '"F2"',
      }),
    ]);

    this.render(template, { cond1: this.truthyValue, cond2: this.falsyValue });

    this.assertText('T1F2');

    runTask(() => this.rerender());

    this.assertText('T1F2');

    runTask(() => set(this.context, 'cond1', this.falsyValue));

    this.assertText('T1F2');

    runTask(() => {
      set(this.context, 'cond1', this.truthyValue);
      set(this.context, 'cond2', this.truthyValue);
    });

    this.assertText('T1F2');

    runTask(() => {
      set(this.context, 'cond1', this.truthyValue);
      set(this.context, 'cond2', this.falsyValue);
    });

    this.assertText('T1F2');
  }

  ['@test evaluation should be lazy'](assert) {
    let truthyEvaluated;
    let falsyEvaluated;

    let withoutEvaluatingTruthy = (callback) => {
      truthyEvaluated = false;
      callback();
      assert.ok(!truthyEvaluated, 'x-truthy is not evaluated');
    };

    let withoutEvaluatingFalsy = (callback) => {
      falsyEvaluated = false;
      callback();
      assert.ok(!falsyEvaluated, 'x-falsy is not evaluated');
    };

    this.registerHelper('x-truthy', {
      compute() {
        truthyEvaluated = true;
        return 'T';
      },
    });

    this.registerHelper('x-falsy', {
      compute() {
        falsyEvaluated = true;
        return 'F';
      },
    });

    let template = this.wrappedTemplateFor({
      cond: 'this.cond',

      // pass values so the helpers don't eagerly compute
      truthy: '(x-truthy this.foo)',
      falsy: '(x-falsy this.foo)',
    });

    withoutEvaluatingFalsy(() => this.render(template, { cond: this.truthyValue }));

    this.assertText('T');

    withoutEvaluatingFalsy(() => runTask(() => this.rerender()));

    this.assertText('T');

    withoutEvaluatingTruthy(() => runTask(() => set(this.context, 'cond', this.falsyValue)));

    this.assertText('F');

    withoutEvaluatingTruthy(() => runTask(() => this.rerender()));

    this.assertText('F');

    withoutEvaluatingFalsy(() => runTask(() => set(this.context, 'cond', this.truthyValue)));

    this.assertText('T');
  }
}

export class IfUnlessHelperTest extends TogglingHelperConditionalsTest {}

applyMixins(IfUnlessHelperTest, ...IfUnlessWithTestCases);

// Testing behaviors shared across the "toggling" syntatical constructs,
// i.e. {{#if}}, {{#unless}}, {{#each}} and {{#each-in}}
export class TogglingSyntaxConditionalsTest extends TogglingConditionalsTest {
  renderValues(...values) {
    let templates = [];
    let context = {};

    for (let i = 1; i <= values.length; i++) {
      templates.push(
        this.templateFor({
          cond: `this.cond${i}`,
          truthy: `{{this.t}}${i}`,
          falsy: `{{this.f}}${i}`,
        })
      );
      context[`cond${i}`] = values[i - 1];
    }

    let wrappedTemplate = this.wrapperFor(templates);
    this.render(wrappedTemplate, Object.assign({ t: 'T', f: 'F' }, context));
  }

  ['@test it does not update when the unbound helper is used']() {
    let template = `${this.templateFor({
      cond: '(unbound this.cond1)',
      truthy: 'T1',
      falsy: 'F1',
    })}${this.templateFor({
      cond: '(unbound this.cond2)',
      truthy: 'T2',
      falsy: 'F2',
    })}`;

    this.render(template, { cond1: this.truthyValue, cond2: this.falsyValue });

    this.assertText('T1F2');

    runTask(() => this.rerender());

    this.assertText('T1F2');

    runTask(() => set(this.context, 'cond1', this.falsyValue));

    this.assertText('T1F2');

    runTask(() => {
      set(this.context, 'cond1', this.truthyValue);
      set(this.context, 'cond2', this.truthyValue);
    });

    this.assertText('T1F2');

    runTask(() => {
      set(this.context, 'cond1', this.truthyValue);
      set(this.context, 'cond2', this.falsyValue);
    });

    this.assertText('T1F2');
  }

  ['@test it has access to the outer scope from both templates']() {
    let template = this.wrapperFor([
      this.templateFor({
        cond: 'this.cond1',
        truthy: '{{this.truthy}}',
        falsy: '{{this.falsy}}',
      }),
      this.templateFor({
        cond: 'this.cond2',
        truthy: '{{this.truthy}}',
        falsy: '{{this.falsy}}',
      }),
    ]);

    this.render(template, {
      cond1: this.truthyValue,
      cond2: this.falsyValue,
      truthy: 'YES',
      falsy: 'NO',
    });

    this.assertText('YESNO');

    runTask(() => this.rerender());

    this.assertText('YESNO');

    runTask(() => {
      set(this.context, 'truthy', 'YASS');
      set(this.context, 'falsy', 'NOPE');
    });

    this.assertText('YASSNOPE');

    runTask(() => {
      set(this.context, 'cond1', this.falsyValue);
      set(this.context, 'cond2', this.truthyValue);
    });

    this.assertText('NOPEYASS');

    runTask(() => {
      set(this.context, 'truthy', 'YES');
      set(this.context, 'falsy', 'NO');
      set(this.context, 'cond1', this.truthyValue);
      set(this.context, 'cond2', this.falsyValue);
    });

    this.assertText('YESNO');
  }

  ['@test it updates correctly when enclosing another conditional']() {
    // This tests whether the outer conditional tracks its bounds correctly as its inner bounds changes
    let inner = this.templateFor({
      cond: 'this.inner',
      truthy: 'T-inner',
      falsy: 'F-inner',
    });
    let template = this.wrappedTemplateFor({
      cond: 'this.outer',
      truthy: inner,
      falsy: 'F-outer',
    });

    this.render(template, { outer: this.truthyValue, inner: this.truthyValue });

    this.assertText('T-inner');

    runTask(() => this.rerender());

    this.assertText('T-inner');

    // Changes the inner bounds
    runTask(() => set(this.context, 'inner', this.falsyValue));

    this.assertText('F-inner');

    // Now rerender the outer conditional, which require first clearing its bounds
    runTask(() => set(this.context, 'outer', this.falsyValue));

    this.assertText('F-outer');
  }

  ['@test it updates correctly when enclosing #each']() {
    // This tests whether the outer conditional tracks its bounds correctly as its inner bounds changes
    let template = this.wrappedTemplateFor({
      cond: 'this.outer',
      truthy: '{{#each this.inner as |text|}}{{text}}{{/each}}',
      falsy: 'F-outer',
    });

    this.render(template, {
      outer: this.truthyValue,
      inner: ['inner', '-', 'before'],
    });

    this.assertText('inner-before');

    runTask(() => this.rerender());

    this.assertText('inner-before');

    // Changes the inner bounds
    runTask(() => set(this.context, 'inner', ['inner-after']));

    this.assertText('inner-after');

    // Now rerender the outer conditional, which require first clearing its bounds
    runTask(() => set(this.context, 'outer', this.falsyValue));

    this.assertText('F-outer');

    // Reset
    runTask(() => {
      set(this.context, 'inner', ['inner-again']);
      set(this.context, 'outer', this.truthyValue);
    });

    this.assertText('inner-again');

    // Now clear the inner bounds
    runTask(() => set(this.context, 'inner', []));

    this.assertText('');

    // Now rerender the outer conditional, which require first clearing its bounds
    runTask(() => set(this.context, 'outer', this.falsyValue));

    this.assertText('F-outer');
  }

  ['@test it updates correctly when enclosing triple-curlies']() {
    // This tests whether the outer conditional tracks its bounds correctly as its inner bounds changes
    let template = this.wrappedTemplateFor({
      cond: 'this.outer',
      truthy: '{{{this.inner}}}',
      falsy: 'F-outer',
    });

    this.render(template, {
      outer: this.truthyValue,
      inner: '<b>inner</b>-<b>before</b>',
    });

    this.assertText('inner-before');

    runTask(() => this.rerender());

    this.assertText('inner-before');

    // Changes the inner bounds
    runTask(() => set(this.context, 'inner', '<p>inner-after</p>'));

    this.assertText('inner-after');

    // Now rerender the outer conditional, which require first clearing its bounds
    runTask(() => set(this.context, 'outer', this.falsyValue));

    this.assertText('F-outer');
  }

  ['@test child conditional should not render children if parent conditional becomes false'](
    assert
  ) {
    let childCreated = false;

    this.registerComponent('foo-bar', {
      template: 'foo-bar',
      ComponentClass: class extends Component {
        init() {
          super.init(...arguments);
          childCreated = true;
        }
      },
    });

    let innerTemplate = this.templateFor({
      cond: 'this.cond2',
      truthy: '{{foo-bar}}',
      falsy: '',
    });
    let wrappedTemplate = this.wrappedTemplateFor({
      cond: 'this.cond1',
      truthy: innerTemplate,
      falsy: '',
    });

    this.render(wrappedTemplate, {
      cond1: this.truthyValue,
      cond2: this.falsyValue,
    });

    assert.ok(!childCreated);
    this.assertText('');

    runTask(() => this.rerender());

    assert.ok(!childCreated);
    this.assertText('');

    runTask(() => {
      set(this.context, 'cond2', this.truthyValue);
      set(this.context, 'cond1', this.falsyValue);
    });

    assert.ok(!childCreated);
    this.assertText('');

    runTask(() => {
      set(this.context, 'cond2', this.falsyValue);
      set(this.context, 'cond1', this.truthyValue);
    });

    assert.ok(!childCreated);
    this.assertText('');
  }

  ['@test evaluation should be lazy'](assert) {
    let truthyEvaluated;
    let falsyEvaluated;

    let withoutEvaluatingTruthy = (callback) => {
      truthyEvaluated = false;
      callback();
      assert.ok(!truthyEvaluated, 'x-truthy is not evaluated');
    };

    let withoutEvaluatingFalsy = (callback) => {
      falsyEvaluated = false;
      callback();
      assert.ok(!falsyEvaluated, 'x-falsy is not evaluated');
    };

    this.registerHelper('x-truthy', {
      compute() {
        truthyEvaluated = true;
        return 'T';
      },
    });

    this.registerHelper('x-falsy', {
      compute() {
        falsyEvaluated = true;
        return 'F';
      },
    });

    let template = this.wrappedTemplateFor({
      cond: 'this.cond',
      truthy: '{{x-truthy}}',
      falsy: '{{x-falsy}}',
    });

    withoutEvaluatingFalsy(() => this.render(template, { cond: this.truthyValue }));

    this.assertText('T');

    withoutEvaluatingFalsy(() => runTask(() => this.rerender()));

    this.assertText('T');

    withoutEvaluatingTruthy(() => runTask(() => set(this.context, 'cond', this.falsyValue)));

    this.assertText('F');

    withoutEvaluatingTruthy(() => runTask(() => this.rerender()));

    this.assertText('F');

    withoutEvaluatingFalsy(() => runTask(() => set(this.context, 'cond', this.truthyValue)));

    this.assertText('T');
  }
}

export class IfUnlessWithSyntaxTest extends TogglingSyntaxConditionalsTest {}

applyMixins(IfUnlessWithSyntaxTest, ...IfUnlessWithTestCases);
