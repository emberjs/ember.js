import {AttributesTests} from './attributes-test';
import { module, test, EmberishCurlyComponent, EmberishCurlyComponentFactory, TestEnvironment } from '@glimmer/test-helpers';
import { EmberishRootView } from '@glimmer/runtime/test/ember-component-test';

abstract class RangeTests extends AttributesTests {
  min = -5;
  max = 50;

  abstract renderRange(value : number) : void;
  abstract assertRangeValue(value : number) : void;
  setup() {

  }

  @test 'value over default max but below set max is kept'() {
    this.setup();
    this.renderRange(25);
    this.assertRangeValue(25);
  }

  @test 'value below default min but above set min is kept'() {
    this.setup();
    this.renderRange(-2);
    this.assertRangeValue(-2);
  }

  @test 'in the valid default range is kept'() {
    this.setup();
    this.renderRange(5);
    this.assertRangeValue(5);
  }

  @test 'value above max is reset to max'() {
    this.setup();
    this.renderRange(55);
    this.assertRangeValue(50);
  }

  @test 'value below min is reset to min'() {
    this.setup();
    this.renderRange(-10);
    this.assertRangeValue(-5);
  }
}

class TemplateRangeTests extends RangeTests {
  attrs : string;

  renderRange(value: number) {
    this.render(`<input ${this.attrs} />`, {
      max: this.max,
      min: this.min,
      value
    });
  }

  assertRangeValue(value: number) {
    this.assert.equal(this.readDOMAttr('value'), value.toString());
  }
}

module(`[emberjs/ember.js#15675] Template <input type="range" value={{value}} min={{min}} max={{max}} />`, class extends TemplateRangeTests {
  attrs = 'type="range" value={{value}} min={{min}} max={{max}}';
});

// Ember Components attributeBindings

class EmberInputRangeComponent extends EmberishCurlyComponent {
  tagName = 'input';
  type = 'range';
}

abstract class EmberComponentRangeTests extends RangeTests {
  env : TestEnvironment;
  view : EmberishRootView;

  setup() {
    this.env = new TestEnvironment();
  }

  abstract component() : EmberishCurlyComponentFactory;

  appendViewFor(template: string, context: Object = {}) {
    this.view = new EmberishRootView(this.env, template, context);

    this.env.begin();
    this.view.appendTo('#qunit-fixture');
    this.env.commit();
  }

  renderRange(value: number): void {
    this.env.registerEmberishCurlyComponent('range-input', this.component(), '');
    this.appendViewFor(`{{range-input max=max min=min value=value}}`, {
      max: this.max,
      min: this.min,
      value
    });
  }
  assertRangeValue(value: number): void {
    let attr = this.view.element['value'];
    this.assert.equal(attr, value.toString());
  }
}

module(`Components - [emberjs/ember.js#15675] - type value min max`,
  class extends EmberComponentRangeTests {
    component(): EmberishCurlyComponentFactory {
      return class extends EmberInputRangeComponent {
        attributeBindings = ['type', 'value', 'min', 'max'];
      };
    }
  }
);

class BasicComponentImplicitAttributesRangeTest extends RangeTests {
  attrs: string;

  renderRange(value: number): void {
    this.registerComponent('Glimmer', 'RangeInput', '<input ...attributes/>');
    this.render(`<RangeInput ${this.attrs.replace('%x', value.toString())} />`);
  }

  assertRangeValue(value: number): void {
    let attr = this.readDOMAttr('value');
    this.assert.equal(attr, value.toString());
  }
}

module(`GlimmerComponent - [emberjs/ember.js#15675] ...attributes <input type="range" value="%x" min="-5" max="50" />`, class extends BasicComponentImplicitAttributesRangeTest {
  attrs = 'type="range" value="%x" min="-5" max="50"';
});
