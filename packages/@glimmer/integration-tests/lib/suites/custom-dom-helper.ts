import { AbstractNodeTest, NodeJitRenderDelegate, NodeAotRenderDelegate } from '../modes/node/env';
import { test } from '../test-decorator';
import { NodeDOMTreeConstruction, serializeBuilder } from '@glimmer/node';
import { RenderTest } from '../render-test';
import { Environment, Cursor, ElementBuilder } from '@glimmer/interfaces';
import { blockStack } from '../dom/blocks';
import { strip } from '../test-helpers/strings';
import { toInnerHTML } from '../dom/simple-utils';
import { precompile } from '@glimmer/compiler';

export class DOMHelperTests extends AbstractNodeTest {
  static suiteName = 'Server-side rendering in Node.js (normal)';

  @test
  'can instantiate NodeDOMTreeConstruction without a document'() {
    // this emulates what happens in Ember when using `App.visit('/', { shouldRender: false });`

    let helper = new NodeDOMTreeConstruction(null as any);

    this.assert.ok(!!helper, 'helper was instantiated without errors');
  }
}

export class CompilationTests extends RenderTest {
  static suiteName = 'Id generation';

  @test
  'generates id in node'() {
    let template = precompile('hello');
    let obj = JSON.parse(template);
    this.assert.equal(obj.id, 'zgnsoV7o', 'short sha of template source');
    template = precompile('hello', { meta: { moduleName: 'template/hello' } });
    obj = JSON.parse(template);
    this.assert.equal(obj.id, 'Ybe5TwSG', 'short sha of template source and meta');
  }
}

export class JitSerializationDelegate extends NodeJitRenderDelegate {
  static style = 'jit serialization';

  getElementBuilder(env: Environment, cursor: Cursor): ElementBuilder {
    return serializeBuilder(env, cursor);
  }
}

export class AotSerializationDelegate extends NodeAotRenderDelegate {
  getElementBuilder(env: Environment, cursor: Cursor) {
    return serializeBuilder(env, cursor);
  }
}

export class SerializedDOMHelperTests extends DOMHelperTests {
  static suiteName = 'Server-side rendering in Node.js (serialize)';

  @test
  'The compiler can handle unescaped HTML'() {
    this.render('<div>{{{title}}}</div>', { title: '<strong>hello</strong>' });
    let b = blockStack();
    this.assertHTML(strip`
      <div>
        ${b(1)}
        <!--%glmr%-->
        <strong>hello</strong>
        <!--%glmr%-->
        ${b(1)}
      </div>
    `);
  }

  @test
  'Unescaped helpers render correctly'() {
    this.registerHelper('testing-unescaped', params => params[0]);
    this.render('{{{testing-unescaped "<span>hi</span>"}}}');
    let b = blockStack();
    this.assertHTML(strip`
      ${b(1)}
      <!--%glmr%-->
      <span>hi</span>
      <!--%glmr%-->
      ${b(1)}
    `);
  }

  @test
  'Null literals do not have representation in DOM'() {
    let b = blockStack();
    this.render('{{null}}');
    this.assertHTML(strip`${b(1)}<!--% %-->${b(1)}`);
  }

  @test
  'Elements inside a yielded block'() {
    this.render('{{#if true}}<div id="test">123</div>{{/if}}');
    let b = blockStack();
    this.assertHTML(strip`
      ${b(1)}
      <div id=\"test\">123</div>
      ${b(1)}
    `);
  }

  @test
  'A simple block helper can return text'() {
    this.render('{{#if true}}test{{else}}not shown{{/if}}');
    let b = blockStack();
    this.assertHTML(strip`
      ${b(1)}
      test
      ${b(1)}
    `);
  }

  assertHTML(html: string) {
    let b = blockStack();
    let serialized = toInnerHTML(this.element);
    this.assert.equal(serialized, `${b(0)}${html}${b(0)}`);
  }
}
