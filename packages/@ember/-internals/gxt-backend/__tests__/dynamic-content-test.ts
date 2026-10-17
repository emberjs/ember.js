/**
 * Dynamic content (compat, GXT_MODE).
 *
 * Glimmer semantics (@glimmer/runtime's append opcodes): a `{{value}}` content
 * mustache renders what its value is, and renders what it is again after an
 * update:
 *
 * - text (strings, numbers, objects by their `toString()`), updated in place;
 * - the HTML of a SafeString (an object with a `toHTML()` method), parsed in
 *   the namespace of the element it is rendered in;
 * - a DOM node, or the nodes of a DocumentFragment, inserted as they are.
 *
 * The result of a helper invocation (`{{format this.value}}`) and a yielded
 * block parameter render the same way, and a `{{{value}}}` renders a DOM node
 * value as that node too. A
 * modifier of an element sees the element's content when it is installed.
 *
 * The test page loads this file only in GXT builds (`virtual:gxt-tests`).
 */
import { defineSimpleModifier, moduleFor, RenderingTestCase, runTask } from 'internal-test-helpers';
import { set } from '@ember/object';
import { helper } from '@ember/component/helper';
import { capabilities as helperCapabilities, setHelperManager } from '@ember/helper';
import { htmlSafe } from '@ember/template';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@ember/component';
import templateOnly from '@ember/component/template-only';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

function paragraph(text: string): HTMLParagraphElement {
  let p = document.createElement('p');
  p.textContent = text;
  return p;
}

function fragmentOf(...nodes: Node[]): DocumentFragment {
  let fragment = document.createDocumentFragment();
  for (let node of nodes) fragment.appendChild(node);
  return fragment;
}

// An object helper definition (as `fn`, `hash`, … of @ember/helper are)
// whose value is `helped`.
function objectHelperDefinition(): object {
  return setHelperManager(
    () => ({
      capabilities: helperCapabilities('3.23', { hasValue: true }),
      createHelper: () => ({}),
      getValue: () => 'helped',
    }),
    {}
  );
}

moduleFor(
  'GXT dynamic content',
  class extends RenderingTestCase {
    // Renders `template` (which wraps `{{this.value}}` in `before` / `after`),
    // then sets `value` to each kind of content in turn.
    assertContentKinds(before: string, after: string) {
      this.render(`${before}{{this.value}}${after}`, { value: 'hello' });
      this.assertHTML(`${before}hello${after}`);

      runTask(() => set(this.context, 'value', htmlSafe('<b>bold</b>')));
      this.assertHTML(`${before}<b>bold</b>${after}`);

      let p = paragraph('node');
      runTask(() => set(this.context, 'value', p));
      this.assertHTML(`${before}<p>node</p>${after}`);
      this.assert.strictEqual(this.element.querySelector('p'), p, 'the node itself is inserted');

      runTask(() => set(this.context, 'value', fragmentOf(paragraph('one'), paragraph('two'))));
      this.assertHTML(`${before}<p>one</p><p>two</p>${after}`);

      runTask(() => set(this.context, 'value', '<b>text</b>'));
      this.assertHTML(`${before}&lt;b&gt;text&lt;/b&gt;${after}`);

      runTask(() => set(this.context, 'value', { toString: () => 'an object' }));
      this.assertHTML(`${before}an object${after}`);

      runTask(() => set(this.context, 'value', htmlSafe('<i>again</i>')));
      this.assertHTML(`${before}<i>again</i>${after}`);

      runTask(() => set(this.context, 'value', null));
      this.assertHTML(`${before}${after}`);
    }

    // `<YieldValue @value={{…}} as |v|>`: a template-only component that yields
    // `@value`.
    registerYieldValue() {
      this.owner.register(
        'component:yield-value',
        setComponentTemplate(this.compile('{{yield @value}}'), templateOnly())
      );
    }

    ['@test the only content of an element renders what its value is']() {
      this.assertContentKinds('<div>', '</div>');
    }

    ['@test content between text renders what its value is']() {
      this.assertContentKinds('<div>before', 'after</div>');
    }

    ['@test content between elements renders what its value is']() {
      this.assertContentKinds('<div><b>before</b>', '<b>after</b></div>');
    }

    ['@test content at the top level of a template renders what its value is']() {
      this.assertContentKinds('[', ']');
    }

    ['@test content inside an SVG foreignObject renders what its value is']() {
      this.assertContentKinds('<svg><foreignObject>', '</foreignObject></svg>');
    }

    ['@test the result of a helper renders what it is']() {
      this.owner.register(
        'helper:same-value',
        helper(([value]: unknown[]) => value)
      );
      this.render('<p>{{same-value this.value}}</p>[{{same-value this.value}}]', {
        value: 'text',
      });
      this.assertHTML('<p>text</p>[text]');

      runTask(() => set(this.context, 'value', htmlSafe('<b>bold</b>')));
      this.assertHTML('<p><b>bold</b></p>[<b>bold</b>]');

      runTask(() => set(this.context, 'value', '<i>text</i>'));
      this.assertHTML('<p>&lt;i&gt;text&lt;/i&gt;</p>[&lt;i&gt;text&lt;/i&gt;]');
    }

    ['@test text content inside an SVG element updates']() {
      this.render('<svg><text>before{{this.value}}after</text></svg>', { value: 'one' });
      this.assertText('beforeoneafter');

      runTask(() => set(this.context, 'value', 'two'));
      this.assertText('beforetwoafter');

      runTask(() => set(this.context, 'value', null));
      this.assertText('beforeafter');
    }

    ['@test the HTML of a SafeString inside an SVG element is SVG']() {
      this.render('<svg><text>{{this.value}}</text></svg>', { value: 'one' });
      this.assertText('one');

      runTask(() => set(this.context, 'value', htmlSafe('<tspan>two</tspan>')));
      this.assertText('two');
      let tspan = this.element.querySelector('tspan')!;
      this.assert.strictEqual(tspan.namespaceURI, SVG_NAMESPACE, 'the tspan is an SVG element');
    }

    ['@test a DOM node value renders as that node']() {
      let p = paragraph('first');
      this.render('<div>{{this.node}}</div>', { node: p });
      this.assertHTML('<div><p>first</p></div>');
      this.assert.strictEqual(this.element.querySelector('p'), p, 'the node itself is inserted');

      runTask(() => set(this.context, 'node', document.createTextNode('a text node')));
      this.assertHTML('<div>a text node</div>');
    }

    ['@test a DOM node in triple curlies renders as that node']() {
      this.render('<div>{{{this.value}}}</div>', { value: '<b>html</b>' });
      this.assertHTML('<div><b>html</b></div>');

      let p = paragraph('node');
      runTask(() => set(this.context, 'value', p));
      this.assertHTML('<div><p>node</p></div>');
      this.assert.strictEqual(this.element.querySelector('p'), p, 'the node itself is inserted');

      runTask(() => set(this.context, 'value', fragmentOf(paragraph('one'), paragraph('two'))));
      this.assertHTML('<div><p>one</p><p>two</p></div>');

      runTask(() => set(this.context, 'value', '<i>html</i>'));
      this.assertHTML('<div><i>html</i></div>');
    }

    ['@test a modifier of the element sees its content when it is installed'](
      assert: QUnit['assert']
    ) {
      let seen: string[] = [];
      this.owner.register(
        'modifier:peek',
        defineSimpleModifier((element: Element) => seen.push(element.innerHTML))
      );
      this.render('<p {{peek}}>{{this.value}}</p><p {{peek}}>static</p>', {
        value: htmlSafe('<b>bold</b>'),
      });
      this.assertHTML('<p><b>bold</b></p><p>static</p>');
      assert.deepEqual(seen, ['<b>bold</b>', 'static']);
    }

    ['@test a yielded block param renders what its value is']() {
      this.registerYieldValue();
      this.render('<YieldValue @value={{this.value}} as |v|><div>{{v}}</div>[{{v}}]</YieldValue>', {
        value: 'hello',
      });
      this.assertHTML('<div>hello</div>[hello]');

      runTask(() => set(this.context, 'value', htmlSafe('<b>bold</b>')));
      this.assertHTML('<div><b>bold</b></div>[<b>bold</b>]');

      runTask(() => set(this.context, 'value', '<i>text</i>'));
      this.assertHTML('<div>&lt;i&gt;text&lt;/i&gt;</div>[&lt;i&gt;text&lt;/i&gt;]');
    }

    ['@test a yielded block param that becomes a DOM node renders as that node']() {
      this.registerYieldValue();
      this.render('<YieldValue @value={{this.value}} as |v|><div>{{v}}</div></YieldValue>', {
        value: 'text',
      });
      this.assertHTML('<div>text</div>');

      let p = paragraph('node');
      runTask(() => set(this.context, 'value', p));
      this.assertHTML('<div><p>node</p></div>');
      this.assert.strictEqual(this.element.querySelector('p'), p, 'the node itself is inserted');

      runTask(() => set(this.context, 'value', 'text again'));
      this.assertHTML('<div>text again</div>');
    }

    ['@test a helper definition value renders the helper invoked without arguments']() {
      this.render('<p>{{this.definition}}</p>[{{this.definition}}]', {
        definition: objectHelperDefinition(),
      });
      this.assertHTML('<p>helped</p>[helped]');
    }

    ['@test a helper definition in a strict template renders the helper invoked without arguments']() {
      let def = objectHelperDefinition();
      this.owner.register(
        'component:bar',
        setComponentTemplate(
          precompileTemplate('{{def}}<p>{{def}}</p>', { strictMode: true, scope: () => ({ def }) }),
          templateOnly()
        )
      );
      this.render('<Bar />');
      this.assertHTML('helped<p>helped</p>');
    }

    ['@test text content keeps its text node while the value stays text']() {
      this.render('<div>before{{this.value}}after</div>', { value: 'one' });
      let nodes = Array.from(this.element.querySelector('div')!.childNodes);

      runTask(() => set(this.context, 'value', 'two'));
      this.assertText('beforetwoafter');
      this.assert.deepEqual(
        Array.from(this.element.querySelector('div')!.childNodes),
        nodes,
        'the nodes are kept'
      );
    }
  }
);
