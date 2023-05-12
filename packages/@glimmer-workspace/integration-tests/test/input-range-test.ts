import { EmberishCurlyComponent, type EmberishCurlyComponentFactory, jitSuite, test } from '..';
import { AttributesTests } from './attributes-test';

abstract class RangeTests extends AttributesTests {
  min = -5;
  max = 50;

  abstract renderRange(value: number): void;
  abstract assertRangeValue(value: number): void;
  setup() {}

  @test
  'value over default max but below set max is kept'() {
    this.setup();
    this.renderRange(25);
    this.assertRangeValue(25);
  }

  @test
  'value below default min but above set min is kept'() {
    this.setup();
    this.renderRange(-2);
    this.assertRangeValue(-2);
  }

  @test
  'in the valid default range is kept'() {
    this.setup();
    this.renderRange(5);
    this.assertRangeValue(5);
  }

  @test
  'value above max is reset to max'() {
    this.setup();
    this.renderRange(55);
    this.assertRangeValue(50);
  }

  @test
  'value below min is reset to min'() {
    this.setup();
    this.renderRange(-10);
    this.assertRangeValue(-5);
  }
}

abstract class TemplateRangeTests extends RangeTests {
  abstract readonly attrs: string;

  renderRange(value: number) {
    this.render(`<input ${this.attrs} />`, {
      max: this.max,
      min: this.min,
      value,
    });
  }

  assertRangeValue(value: number) {
    this.assert.strictEqual(this.readDOMAttr('value'), value.toString());
  }
}

jitSuite(
  class extends TemplateRangeTests {
    static override suiteName = `[emberjs/ember.js#15675] Template <input type="range" value={{this.value}} min={{this.min}} max={{this.max}} />`;

    attrs = 'type="range" value={{this.value}} min={{this.min}} max={{this.max}}';
  }
);

// Ember Components attributeBindings

class EmberInputRangeComponent extends EmberishCurlyComponent {
  override tagName = 'input';
  type = 'range';
}

jitSuite(
  class EmberComponentRangeTests extends RangeTests {
    static override suiteName = `Components - [emberjs/ember.js#15675] - type value min max`;

    component(): EmberishCurlyComponentFactory {
      return class extends EmberInputRangeComponent {
        override attributeBindings = ['type', 'value', 'min', 'max'];
      } as any;
    }

    renderRange(value: number): void {
      this.registerComponent('Curly', 'range-input', '', this.component());
      this.render(`{{range-input max=this.max min=this.min value=this.value}}`, {
        max: this.max,
        min: this.min,
        value,
      });
    }

    assertRangeValue(value: number): void {
      let attr = (this.element.firstChild as any)['value'];
      this.assert.strictEqual(attr, value.toString());
    }
  }
);

jitSuite(
  class BasicComponentImplicitAttributesRangeTest extends RangeTests {
    static override suiteName = `integration - GlimmerComponent - [emberjs/ember.js#15675] ...attributes <input type="range" value="%x" min="-5" max="50" />`;
    attrs = 'type="range" value="%x" min="-5" max="50"';

    renderRange(value: number): void {
      this.registerComponent('Glimmer', 'RangeInput', '<input ...attributes/>');
      this.render(`<RangeInput ${this.attrs.replace('%x', value.toString())} />`);
    }

    assertRangeValue(value: number): void {
      let attr = this.readDOMAttr('value');
      this.assert.strictEqual(attr, value.toString());
    }
  }
);

jitSuite(
  class BasicComponentSplattributesLastRangeTest extends RangeTests {
    static override suiteName = `integration - GlimmerComponent - [emberjs/ember.js#15675] ...attributes last <input type="range" value="%x" min="-5" max="50" />`;
    attrs = 'type="range" value="%x" min="-5" max="50"';

    renderRange(value: number): void {
      this.registerComponent('Glimmer', 'RangeInput', '<input type="text" ...attributes/>');
      this.render(`<RangeInput ${this.attrs.replace('%x', value.toString())} />`);
    }

    assertRangeValue(value: number): void {
      let attr = this.readDOMAttr('value');
      this.assert.strictEqual(attr, value.toString());
    }
  }
);

jitSuite(
  class BasicComponentSplattributesFirstRangeTest extends RangeTests {
    static override suiteName = `integration - GlimmerComponent - [emberjs/ember.js#15675] ...attributes first <input type="range" value="%x" min="-5" max="50" />`;
    attrs = 'type="text" min="-5" max="50"';

    renderRange(value: number): void {
      this.registerComponent(
        'Glimmer',
        'RangeInput',
        `<input ...attributes type="range" value="${value}" />`
      );
      this.render(`<RangeInput ${this.attrs.replace('%x', value.toString())} />`);
    }

    assertRangeValue(value: number): void {
      let attr = this.readDOMAttr('value');
      this.assert.strictEqual(attr, value.toString());
    }
  }
);
