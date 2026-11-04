// The syntax covered in this file is inherited from Handlebars. It is kept for
// compatibility with existing templates and is not to be extended or relied on
// in new code.

import {
  defineComponent,
  defineSimpleHelper,
  jitSuite,
  RenderTest,
  test,
} from '@glimmer-workspace/integration-tests';

class TrustingAmpersandTest extends RenderTest {
  static suiteName = 'Inherited from Handlebars (legacy behavior): {{&foo}}';

  @test
  'strict: {{&foo}} renders unescaped, like {{{foo}}}'() {
    const html = defineSimpleHelper(() => '<b>x</b>');
    this.renderComponent(defineComponent({ html }, '[{{&html}}][{{{html}}}][{{html}}]'));
    this.assertHTML('[<b>x</b>][<b>x</b>][&lt;b&gt;x&lt;/b&gt;]');
    this.assertStableRerender();
  }

  @test
  'loose: {{&foo}} renders unescaped, like {{{foo}}}'() {
    this.registerHelper('html', () => '<b>x</b>');
    this.render('[{{&html}}][{{{html}}}][{{html}}]');
    this.assertHTML('[<b>x</b>][<b>x</b>][&lt;b&gt;x&lt;/b&gt;]');
    this.assertStableRerender();
  }
}

class InverseSynonymTest extends RenderTest {
  static suiteName = 'Inherited from Handlebars (legacy behavior): {{^}} as {{else}}';

  @test
  'strict: {{^}} separates the inverse block'() {
    this.renderComponent(
      defineComponent({}, '{{#if @a}}A{{^}}B{{/if}}|{{#unless @b}}C{{^}}D{{/unless}}'),
      { a: false, b: true }
    );
    this.assertHTML('B|D');
    this.assertStableRerender();
  }

  @test
  'loose: {{^}} separates the inverse block and updates'() {
    this.render('{{#if this.a}}A{{^}}B{{/if}}', { a: true });
    this.assertHTML('A');
    this.assertStableRerender();

    this.rerender({ a: false });
    this.assertHTML('B');
  }
}

// {{^foo}}...{{else}}...{{/foo}} is not meant to be supported going forward. These tests only
// document current behavior.
class InverseOpenerTest extends RenderTest {
  static suiteName = 'Inherited from Handlebars (legacy behavior): {{^foo}} with {{else}}';

  @test
  'strict: {{^if}} swaps the two blocks'() {
    this.renderComponent(defineComponent({}, '{{^if @a}}A{{else}}B{{/if}}'), { a: true });
    this.assertHTML('B');
    this.assertStableRerender();
  }

  @test
  'loose: {{^if}} swaps the two blocks and updates'() {
    this.render('{{^if this.a}}A{{else}}B{{/if}}', { a: true });
    this.assertHTML('B');
    this.assertStableRerender();

    this.rerender({ a: false });
    this.assertHTML('A');
  }
}

class RawBlockTest extends RenderTest {
  static suiteName = 'Inherited from Handlebars (legacy behavior): raw blocks';

  @test
  'strict: a raw block yields its body with mustaches as literal text'() {
    const Wrap = defineComponent({}, '({{yield}})');
    this.renderComponent(defineComponent({ Wrap }, '[{{{{Wrap}}}}hi {{this.x}}{{{{/Wrap}}}}]'));
    this.assertHTML('[(hi {{this.x}})]');
    this.assertStableRerender();
  }

  @test
  'loose: a raw block yields its body with mustaches as literal text'() {
    this.registerComponent('TemplateOnly', 'wrap', '({{yield}})');
    this.render('[{{{{wrap}}}}hi {{this.x}}{{{{/wrap}}}}]', { x: 'X' });
    this.assertHTML('[(hi {{this.x}})]');
    this.assertStableRerender();
  }

  @test
  'loose: a raw block takes arguments and still parses HTML in its body'() {
    this.registerComponent('TemplateOnly', 'wrap', '({{@k}}:{{yield}})');
    this.render('{{{{wrap k=2}}}}<b>{{x}}</b>{{{{/wrap}}}}');
    this.assertHTML('(2:<b>{{x}}</b>)');
    this.assertStableRerender();
  }

  @test
  'loose: a raw block on a keyword is an ordinary block'() {
    this.render('[{{{{if this.y}}}}hi {{this.x}}{{{{/if}}}}]', { x: 'X', y: true });
    this.assertHTML('[hi {{this.x}}]');
    this.assertStableRerender();
  }
}

jitSuite(TrustingAmpersandTest);
jitSuite(InverseSynonymTest);
jitSuite(InverseOpenerTest);
jitSuite(RawBlockTest);
