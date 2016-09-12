import { assign } from 'ember-utils';
import { applyMixins } from './abstract-test-case';
import { RenderingTest } from './test-case';
import { get, set } from 'ember-metal';
import {
  Object as EmberObject,
  ObjectProxy,
  A as emberA,
  ArrayProxy,
  removeAt
} from 'ember-runtime';
import { Component } from './helpers';

class AbstractConditionalsTest extends RenderingTest {

  get truthyValue() { return true; }

  get falsyValue() { return false; }

  wrapperFor(templates) {
    return templates.join('');
  }

  wrappedTemplateFor(options) {
    return this.wrapperFor([this.templateFor(options)]);
  }

  /* abstract */
  templateFor({ cond, truthy, falsy }) {
    // e.g. `{{#if ${cond}}}${truthy}{{else}}${falsy}{{/if}}`
    throw new Error('Not implemented: `templateFor`');
  }

  /* abstract */
  renderValues(...values) {
    throw new Error('Not implemented: `renderValues`');
  }

}

class AbstractGenerator {

  constructor(cases) {
    this.cases = cases;
  }

  /* abstract */
  generate(value, idx) {
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

        this.runTask(() => this.rerender());

        this.assertText('T1');

        this.runTask(() => set(this.context, 'cond1', this.falsyValue));

        this.assertText('F1');

        this.runTask(() => set(this.context, 'cond1', value));

        this.assertText('T1');
      }
    };
  }

}

export class FalsyGenerator extends AbstractGenerator {

  generate(value, idx) {
    return {
      [`@test it should consider ${JSON.stringify(value)} falsy [${idx}]`]() {
        this.renderValues(value);

        this.assertText('F1');

        this.runTask(() => this.rerender());

        this.assertText('F1');

        this.runTask(() => set(this.context, 'cond1', this.truthyValue));

        this.assertText('T1');

        this.runTask(() => set(this.context, 'cond1', value));

        this.assertText('F1');
      }
    };
  }

}

export class StableTruthyGenerator extends TruthyGenerator {

  generate(value, idx) {
    return assign(super.generate(value, idx), {
      [`@test it maintains DOM stability when condition changes from ${value} to another truthy value and back [${idx}]`]() {
        this.renderValues(value);

        this.assertText('T1');

        this.takeSnapshot();

        this.runTask(() => set(this.context, 'cond1', this.truthyValue));

        this.assertText('T1');

        this.assertInvariants();

        this.runTask(() => set(this.context, 'cond1', value));

        this.assertText('T1');

        this.assertInvariants();
      }
    });
  }

}

export class StableFalsyGenerator extends FalsyGenerator {

  generate(value, idx) {
    return assign(super.generate(value), {
      [`@test it maintains DOM stability when condition changes from ${value} to another falsy value and back [${idx}]`]() {
        this.renderValues(value);

        this.assertText('F1');

        this.takeSnapshot();

        this.runTask(() => set(this.context, 'cond1', this.falsyValue));

        this.assertText('F1');

        this.assertInvariants();

        this.runTask(() => set(this.context, 'cond1', value));

        this.assertText('F1');

        this.assertInvariants();
      }
    });
  }

}

class ObjectProxyGenerator extends AbstractGenerator {

  generate(value, idx) {
    // This is inconsistent with our usual to-bool policy, but the current proxy implementation
    // simply uses !!content to determine truthiness
    if (value) {
      return {
        [`@test it should consider an object proxy with \`${JSON.stringify(value)}\` truthy [${idx}]`]() {
          this.renderValues(ObjectProxy.create({ content: value }));

          this.assertText('T1');

          this.runTask(() => this.rerender());

          this.assertText('T1');

          this.runTask(() => set(this.context, 'cond1.content', this.falsyValue));

          this.assertText('F1');

          this.runTask(() => set(this.context, 'cond1', ObjectProxy.create({ content: value })));

          this.assertText('T1');
        }
      };
    } else {
      return {
        [`@test it should consider an object proxy with \`${JSON.stringify(value)}\` falsy [${idx}]`]() {
          this.renderValues(ObjectProxy.create({ content: value }));

          this.assertText('F1');

          this.runTask(() => this.rerender());

          this.assertText('F1');

          this.runTask(() => set(this.context, 'cond1.content', this.truthyValue));

          this.assertText('T1');

          this.runTask(() => set(this.context, 'cond1', ObjectProxy.create({ content: value })));

          this.assertText('F1');
        }
      };
    }
  }

}

// Testing behaviors shared across all conditionals, i.e. {{#if}}, {{#unless}},
// {{#with}}, {{#each}}, {{#each-in}}, (if) and (unless)
export class BasicConditionalsTest extends AbstractConditionalsTest {

  ['@test it renders the corresponding block based on the conditional']() {
    this.renderValues(this.truthyValue, this.falsyValue);

    this.assertText('T1F2');

    this.runTask(() => this.rerender());

    this.assertText('T1F2');

    this.runTask(() => set(this.context, 'cond1', this.falsyValue));

    this.assertText('F1F2');

    this.runTask(() => {
      set(this.context, 'cond1', this.truthyValue);
      set(this.context, 'cond2', this.truthyValue);
    });

    this.assertText('T1T2');

    this.runTask(() => {
      set(this.context, 'cond1', this.truthyValue);
      set(this.context, 'cond2', this.falsyValue);
    });

    this.assertText('T1F2');
  }

}

// Testing behaviors related to ember objects, object proxies, etc
export const ObjectTestCases = {

  ['@test it considers object proxies without content falsy']() {
    this.renderValues(
      ObjectProxy.create({ content: {} }),
      ObjectProxy.create({ content: EmberObject.create() }),
      ObjectProxy.create({ content: null })
    );

    this.assertText('T1T2F3');

    this.runTask(() => this.rerender());

    this.assertText('T1T2F3');

    this.runTask(() => {
      set(this.context, 'cond1.content', null);
      set(this.context, 'cond2.content', null);
    });

    this.assertText('F1F2F3');

    this.runTask(() => {
      set(this.context, 'cond1.content', EmberObject.create());
      set(this.context, 'cond2.content', {});
      set(this.context, 'cond3.content', { foo: 'bar' });
    });

    this.assertText('T1T2T3');

    this.runTask(() => {
      set(this.context, 'cond1', ObjectProxy.create({ content: {} }));
      set(this.context, 'cond2', ObjectProxy.create({ content: EmberObject.create() }));
      set(this.context, 'cond3', ObjectProxy.create({ content: null }));
    });

    this.assertText('T1T2F3');
  }

};

// Testing behaviors related to arrays and array proxies
export const ArrayTestCases = {

  ['@test it considers empty arrays falsy']() {
    this.renderValues(
      emberA(['hello']),
      emberA()
    );

    this.assertText('T1F2');

    this.runTask(() => this.rerender());

    this.assertText('T1F2');

    this.runTask(() => removeAt(get(this.context, 'cond1'), 0));

    this.assertText('F1F2');

    this.runTask(() => {
      get(this.context, 'cond1').pushObject('hello');
      get(this.context, 'cond2').pushObjects([1]);
    });

    this.assertText('T1T2');

    this.runTask(() => {
      set(this.context, 'cond1', emberA(['hello']));
      set(this.context, 'cond2', emberA());
    });

    this.assertText('T1F2');
  },

  ['@test it considers array proxies without content falsy']() {
    this.renderValues(
      ArrayProxy.create({ content: emberA(['hello']) }),
      ArrayProxy.create({ content: null })
    );

    this.assertText('T1F2');

    this.runTask(() => this.rerender());

    this.assertText('T1F2');

    this.runTask(() => {
      set(this.context, 'cond1.content', null);
      set(this.context, 'cond2.content', null);
    });

    this.assertText('F1F2');

    this.runTask(() => {
      set(this.context, 'cond1.content', emberA(['hello']));
      set(this.context, 'cond2.content', emberA([1]));
    });

    this.assertText('T1T2');

    this.runTask(() => {
      set(this.context, 'cond1', ArrayProxy.create({ content: emberA(['hello']) }));
      set(this.context, 'cond2', ArrayProxy.create({ content: null }));
    });

    this.assertText('T1F2');
  },

  ['@test it considers array proxies with empty arrays falsy']() {
    this.renderValues(
      ArrayProxy.create({ content: emberA(['hello']) }),
      ArrayProxy.create({ content: emberA() })
    );

    this.assertText('T1F2');

    this.runTask(() => this.rerender());

    this.assertText('T1F2');

    this.runTask(() => removeAt(get(this.context, 'cond1.content'), 0));

    this.assertText('F1F2');

    this.runTask(() => {
      get(this.context, 'cond1.content').pushObject('hello');
      get(this.context, 'cond2.content').pushObjects([1]);
    });

    this.assertText('T1T2');

    this.runTask(() => {
      set(this.context, 'cond1', ArrayProxy.create({ content: emberA(['hello']) }));
      set(this.context, 'cond2', ArrayProxy.create({ content: emberA() }));
    });

    this.assertText('T1F2');
  }

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
    emberA(['hello']),
    {},
    { foo: 'bar' },
    EmberObject.create(),
    EmberObject.create({ foo: 'bar' }),
    ObjectProxy.create({ content: true }),
    Object,
    function() {},
    /*jshint -W053 */
    new String('hello'),
    new String(''),
    new Boolean(true),
    new Boolean(false),
    /*jshint +W053 */
    new Date()
  ]),

  new StableFalsyGenerator([
    false,
    null,
    undefined,
    '',
    0,
    [],
    emberA(),
    ObjectProxy.create({ content: undefined })
  ]),

  new ObjectProxyGenerator([
    true,
    ' ',
    'hello',
    'false',
    'null',
    'undefined',
    1,
    ['hello'],
    emberA(['hello']),
    ArrayProxy.create({ content: ['hello'] }),
    ArrayProxy.create({ content: [] }),
    {},
    { foo: 'bar' },
    EmberObject.create(),
    EmberObject.create({ foo: 'bar' }),
    ObjectProxy.create({ content: true }),
    ObjectProxy.create({ content: undefined }),
    /*jshint -W053 */
    new String('hello'),
    new String(''),
    new Boolean(true),
    new Boolean(false),
    /*jshint +W053 */
    new Date(),
    false,
    null,
    undefined,
    '',
    0,
    [],
    emberA()
  ]),

  ObjectTestCases,

  ArrayTestCases

];

// Testing behaviors shared across the "toggling" conditionals, i.e. {{#if}},
// {{#unless}}, {{#with}}, {{#each}}, {{#each-in}}, (if) and (unless)
export class TogglingConditionalsTest extends BasicConditionalsTest {}

// Testing behaviors shared across the (if) and (unless) helpers
export class TogglingHelperConditionalsTest extends TogglingConditionalsTest {

  renderValues(...values) {
    let templates = [];
    let context = {};

    for (let i = 1; i <= values.length; i++) {
      templates.push(this.templateFor({ cond: `cond${i}`, truthy: `t${i}`, falsy: `f${i}` }));
      context[`t${i}`] = `T${i}`;
      context[`f${i}`] = `F${i}`;
      context[`cond${i}`] = values[i - 1];
    }

    let wrappedTemplate = this.wrapperFor(templates);
    this.render(wrappedTemplate, context);
  }

  ['@test it has access to the outer scope from both templates']() {
    let template = this.wrapperFor([
      this.templateFor({ cond: 'cond1', truthy: 'truthy', falsy: 'falsy' }),
      this.templateFor({ cond: 'cond2', truthy: 'truthy', falsy: 'falsy' })
    ]);

    this.render(template, { cond1: this.truthyValue, cond2: this.falsyValue, truthy: 'YES', falsy: 'NO' });

    this.assertText('YESNO');

    this.runTask(() => this.rerender());

    this.assertText('YESNO');

    this.runTask(() => {
      set(this.context, 'truthy', 'YASS');
      set(this.context, 'falsy', 'NOPE');
    });

    this.assertText('YASSNOPE');

    this.runTask(() => {
      set(this.context, 'cond1', this.falsyValue);
      set(this.context, 'cond2', this.truthyValue);
    });

    this.assertText('NOPEYASS');

    this.runTask(() => {
      set(this.context, 'truthy', 'YES');
      set(this.context, 'falsy', 'NO');
      set(this.context, 'cond1', this.truthyValue);
      set(this.context, 'cond2', this.falsyValue);
    });

    this.assertText('YESNO');
  }

  ['@test it does not update when the unbound helper is used']() {
    let template = this.wrapperFor([
      this.templateFor({ cond: '(unbound cond1)', truthy: '"T1"', falsy: '"F1"' }),
      this.templateFor({ cond: '(unbound cond2)', truthy: '"T2"', falsy: '"F2"' })
    ]);

    this.render(template, { cond1: this.truthyValue, cond2: this.falsyValue });

    this.assertText('T1F2');

    this.runTask(() => this.rerender());

    this.assertText('T1F2');

    this.runTask(() => set(this.context, 'cond1', this.falsyValue));

    this.assertText('T1F2');

    this.runTask(() => {
      set(this.context, 'cond1', this.truthyValue);
      set(this.context, 'cond2', this.truthyValue);
    });

    this.assertText('T1F2');

    this.runTask(() => {
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
      }
    });

    this.registerHelper('x-falsy', {
      compute() {
        falsyEvaluated = true;
        return 'F';
      }
    });

    let template = this.wrappedTemplateFor({ cond: 'cond', truthy: '(x-truthy)', falsy: '(x-falsy)' });

    withoutEvaluatingFalsy(() => this.render(template, { cond: this.truthyValue }));

    this.assertText('T');

    withoutEvaluatingFalsy(() => this.runTask(() => this.rerender()));

    this.assertText('T');

    withoutEvaluatingTruthy(() => this.runTask(() => set(this.context, 'cond', this.falsyValue)));

    this.assertText('F');

    withoutEvaluatingTruthy(() => this.runTask(() => this.rerender()));

    this.assertText('F');

    withoutEvaluatingFalsy(() => this.runTask(() => set(this.context, 'cond', this.truthyValue)));

    this.assertText('T');
  }

}

export class IfUnlessHelperTest extends TogglingHelperConditionalsTest {}

applyMixins(IfUnlessHelperTest, ...IfUnlessWithTestCases);

// Testing behaviors shared across the "toggling" syntatical constructs,
// i.e. {{#if}}, {{#unless}}, {{#with}}, {{#each}} and {{#each-in}}
export class TogglingSyntaxConditionalsTest extends TogglingConditionalsTest {

  renderValues(...values) {
    let templates = [];
    let context = {};

    for (let i = 1; i <= values.length; i++) {
      templates.push(this.templateFor({ cond: `cond${i}`, truthy: `{{t}}${i}`, falsy: `{{f}}${i}` }));
      context[`cond${i}`] = values[i - 1];
    }

    let wrappedTemplate = this.wrapperFor(templates);
    this.render(wrappedTemplate, assign({ t: 'T', f: 'F' }, context));
  }

  ['@test it does not update when the unbound helper is used']() {
    let template = `${
      this.templateFor({ cond: '(unbound cond1)', truthy: 'T1', falsy: 'F1' })
    }${
      this.templateFor({ cond: '(unbound cond2)', truthy: 'T2', falsy: 'F2' })
    }`;

    this.render(template, { cond1: this.truthyValue, cond2: this.falsyValue });

    this.assertText('T1F2');

    this.runTask(() => this.rerender());

    this.assertText('T1F2');

    this.runTask(() => set(this.context, 'cond1', this.falsyValue));

    this.assertText('T1F2');

    this.runTask(() => {
      set(this.context, 'cond1', this.truthyValue);
      set(this.context, 'cond2', this.truthyValue);
    });

    this.assertText('T1F2');

    this.runTask(() => {
      set(this.context, 'cond1', this.truthyValue);
      set(this.context, 'cond2', this.falsyValue);
    });

    this.assertText('T1F2');
  }

  ['@test it has access to the outer scope from both templates']() {
    let template = this.wrapperFor([
      this.templateFor({ cond: 'cond1', truthy: '{{truthy}}', falsy: '{{falsy}}' }),
      this.templateFor({ cond: 'cond2', truthy: '{{truthy}}', falsy: '{{falsy}}' })
    ]);

    this.render(template, { cond1: this.truthyValue, cond2: this.falsyValue, truthy: 'YES', falsy: 'NO' });

    this.assertText('YESNO');

    this.runTask(() => this.rerender());

    this.assertText('YESNO');

    this.runTask(() => {
      set(this.context, 'truthy', 'YASS');
      set(this.context, 'falsy', 'NOPE');
    });

    this.assertText('YASSNOPE');

    this.runTask(() => {
      set(this.context, 'cond1', this.falsyValue);
      set(this.context, 'cond2', this.truthyValue);
    });

    this.assertText('NOPEYASS');

    this.runTask(() => {
      set(this.context, 'truthy', 'YES');
      set(this.context, 'falsy', 'NO');
      set(this.context, 'cond1', this.truthyValue);
      set(this.context, 'cond2', this.falsyValue);
    });

    this.assertText('YESNO');
  }

  ['@test it updates correctly when enclosing another conditional']() {
    // This tests whether the outer conditional tracks its bounds correctly as its inner bounds changes
    let inner = this.templateFor({ cond: 'inner', truthy: 'T-inner', falsy: 'F-inner' });
    let template = this.wrappedTemplateFor({ cond: 'outer', truthy: inner, falsy: 'F-outer' });

    this.render(template, { outer: this.truthyValue, inner: this.truthyValue });

    this.assertText('T-inner');

    this.runTask(() => this.rerender());

    this.assertText('T-inner');

    // Changes the inner bounds
    this.runTask(() => set(this.context, 'inner', this.falsyValue));

    this.assertText('F-inner');

    // Now rerender the outer conditional, which require first clearing its bounds
    this.runTask(() => set(this.context, 'outer', this.falsyValue));

    this.assertText('F-outer');
  }

  ['@test it updates correctly when enclosing #each']() {
    // This tests whether the outer conditional tracks its bounds correctly as its inner bounds changes
    let template = this.wrappedTemplateFor({ cond: 'outer', truthy: '{{#each inner as |text|}}{{text}}{{/each}}', falsy: 'F-outer' });

    this.render(template, { outer: this.truthyValue, inner: ['inner', '-', 'before'] });

    this.assertText('inner-before');

    this.runTask(() => this.rerender());

    this.assertText('inner-before');

    // Changes the inner bounds
    this.runTask(() => set(this.context, 'inner', ['inner-after']));

    this.assertText('inner-after');

    // Now rerender the outer conditional, which require first clearing its bounds
    this.runTask(() => set(this.context, 'outer', this.falsyValue));

    this.assertText('F-outer');

    // Reset
    this.runTask(() => {
      set(this.context, 'inner', ['inner-again']);
      set(this.context, 'outer', this.truthyValue);
    });

    this.assertText('inner-again');

    // Now clear the inner bounds
    this.runTask(() => set(this.context, 'inner', []));

    this.assertText('');

    // Now rerender the outer conditional, which require first clearing its bounds
    this.runTask(() => set(this.context, 'outer', this.falsyValue));

    this.assertText('F-outer');
  }

  ['@test it updates correctly when enclosing triple-curlies']() {
    // This tests whether the outer conditional tracks its bounds correctly as its inner bounds changes
    let template = this.wrappedTemplateFor({ cond: 'outer', truthy: '{{{inner}}}', falsy: 'F-outer' });

    this.render(template, { outer: this.truthyValue, inner: '<b>inner</b>-<b>before</b>' });

    this.assertText('inner-before');

    this.runTask(() => this.rerender());

    this.assertText('inner-before');

    // Changes the inner bounds
    this.runTask(() => set(this.context, 'inner', '<p>inner-after</p>'));

    this.assertText('inner-after');

    // Now rerender the outer conditional, which require first clearing its bounds
    this.runTask(() => set(this.context, 'outer', this.falsyValue));

    this.assertText('F-outer');
  }

  ['@test child conditional should not render children if parent conditional becomes false'](assert) {
    let childCreated = false;

    this.registerComponent('foo-bar', {
      template: 'foo-bar',
      ComponentClass: Component.extend({
        init() {
          this._super(...arguments);
          childCreated = true;
        }
      })
    });

    let innerTemplate = this.templateFor({ cond: 'cond2', truthy: '{{foo-bar}}', falsy: '' });
    let wrappedTemplate = this.wrappedTemplateFor({ cond: 'cond1', truthy: innerTemplate, falsy: '' });

    this.render(wrappedTemplate, { cond1: this.truthyValue, cond2: this.falsyValue });

    assert.ok(!childCreated);
    this.assertText('');

    this.runTask(() => this.rerender());

    assert.ok(!childCreated);
    this.assertText('');

    this.runTask(() => {
      set(this.context, 'cond2', this.truthyValue);
      set(this.context, 'cond1', this.falsyValue);
    });

    assert.ok(!childCreated);
    this.assertText('');

    this.runTask(() => {
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
      }
    });

    this.registerHelper('x-falsy', {
      compute() {
        falsyEvaluated = true;
        return 'F';
      }
    });

    let template = this.wrappedTemplateFor({ cond: 'cond', truthy: '{{x-truthy}}', falsy: '{{x-falsy}}' });

    withoutEvaluatingFalsy(() => this.render(template, { cond: this.truthyValue }));

    this.assertText('T');

    withoutEvaluatingFalsy(() => this.runTask(() => this.rerender()));

    this.assertText('T');

    withoutEvaluatingTruthy(() => this.runTask(() => set(this.context, 'cond', this.falsyValue)));

    this.assertText('F');

    withoutEvaluatingTruthy(() => this.runTask(() => this.rerender()));

    this.assertText('F');

    withoutEvaluatingFalsy(() => this.runTask(() => set(this.context, 'cond', this.truthyValue)));

    this.assertText('T');
  }

}

export class IfUnlessWithSyntaxTest extends TogglingSyntaxConditionalsTest {}

applyMixins(IfUnlessWithSyntaxTest, ...IfUnlessWithTestCases);
