import { precompile } from '@glimmer/compiler';
import { Cursor, Environment } from '@glimmer/interfaces';
import {
  AbstractNodeTest,
  blockStack,
  NodeEagerRenderDelegate,
  NodeLazyRenderDelegate,
  rawModule,
  RenderTest,
  SSRComponentSuite,
  strip,
  test,
  toInnerHTML,
} from '@glimmer/test-helpers';
import { NodeDOMTreeConstruction, serializeBuilder } from '..';

class DOMHelperTests extends AbstractNodeTest {
  @test
  'can instantiate NodeDOMTreeConstruction without a document'() {
    // this emulates what happens in Ember when using `App.visit('/', { shouldRender: false });`

    let helper = new NodeDOMTreeConstruction(null as any);

    this.assert.ok(!!helper, 'helper was instantiated without errors');
  }
}

class CompilationTests extends RenderTest {
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

class LazySerializationDelegate extends NodeLazyRenderDelegate {
  getElementBuilder(env: Environment, cursor: Cursor) {
    return serializeBuilder(env, cursor);
  }
}

class EagerSerializationDelegate extends NodeEagerRenderDelegate {
  getElementBuilder(env: Environment, cursor: Cursor) {
    return serializeBuilder(env, cursor);
  }
}

class SerializedDOMHelperTests extends DOMHelperTests {
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

rawModule('Server-side rendering in Node.js (lazy)', DOMHelperTests, NodeLazyRenderDelegate);
rawModule('Server-side rendering in Node.js (eager)', DOMHelperTests, NodeEagerRenderDelegate);

rawModule(
  'Server-side rendering in Node.js (lazy serialization)',
  SerializedDOMHelperTests,
  LazySerializationDelegate
);
rawModule(
  'Server-side rendering in Node.js (Eager serialization)',
  SerializedDOMHelperTests,
  EagerSerializationDelegate
);

rawModule('Id generation', CompilationTests, NodeLazyRenderDelegate);

rawModule('[Bundle Compiler] SSR Components', SSRComponentSuite, NodeEagerRenderDelegate, {
  componentModule: true,
});
