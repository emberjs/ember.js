import { Option, Environment, ElementBuilder } from '@glimmer/interfaces';
import { DynamicAttribute, SimpleDynamicAttribute, dynamicAttribute } from '@glimmer/runtime';
import { AttrNamespace, SimpleElement } from '@simple-dom/interface';
import { assert } from './support';
import { RenderTest, test, jitSuite } from '..';

let warnings = 0;

class StyleWarningsTest extends RenderTest {
  static suiteName = 'Style attributes';

  beforeEach() {
    warnings = 0;
  }

  @test
  'Standard element with static style and element modifier does not give you a warning'() {
    this.registerModifier('foo', class {});
    this.render('<button style="display: flex" {{foo}}>click me</button>', {});

    assert.strictEqual(warnings, 0);
  }

  @test
  'Standard element with dynamic style and element modifier gives you 1 warning'() {
    this.registerModifier('foo', class {});
    this.render('<button style={{dynAttr}} {{foo}}>click me</button>', { dynAttr: 'display:flex' });

    assert.strictEqual(warnings, 1);
  }

  @test
  'using a static inline style on an element does not give you a warning'() {
    this.render(`<div style="background: red">Thing</div>`, {});

    assert.strictEqual(warnings, 0);
    this.assertHTML('<div style="background: red">Thing</div>', 'initial render');
  }

  @test
  'triple curlies are trusted'() {
    this.render(`<div foo={{foo}} style={{{styles}}}>Thing</div>`, { styles: 'background: red' });

    assert.strictEqual(warnings, 0);
    this.assertHTML('<div style="background: red">Thing</div>', 'initial render');
  }

  @test
  'using a static inline style on an namespaced element does not give you a warning'() {
    this.render(`<svg xmlns:svg="http://www.w3.org/2000/svg" style="background: red" />`, {});

    assert.strictEqual(warnings, 0);

    this.assertHTML(
      '<svg xmlns:svg="http://www.w3.org/2000/svg" style="background: red"></svg>',
      'initial render'
    );
  }
}

jitSuite(StyleWarningsTest, {
  env: {
    attributeFor(
      element: SimpleElement,
      attr: string,
      isTrusting: boolean,
      namespace: Option<AttrNamespace>
    ): DynamicAttribute {
      if (attr === 'style' && !isTrusting) {
        return new StyleAttribute({ element, name: 'style', namespace });
      }

      return dynamicAttribute(element, attr, namespace);
    },
  },
});

class StyleAttribute extends SimpleDynamicAttribute {
  set(dom: ElementBuilder, value: unknown, env: Environment): void {
    warnings++;
    super.set(dom, value, env);
  }

  update() {}
}
