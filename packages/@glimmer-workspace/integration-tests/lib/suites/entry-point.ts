import { createPrimitiveRef } from '@glimmer/reference';
import { DynamicScopeImpl } from '@glimmer/runtime';
import { castToBrowser } from '@glimmer/util';

import type { ComponentKind } from '../components/types';
import { JitRenderDelegate } from '../modes/jit/delegate';
import { Count, RenderTest } from '../render-test';
import { test } from '../test-decorator';
import { defineComponent } from '../test-helpers/define';

export class EntryPointTest extends RenderTest {
  static suiteName = 'entry points';

  declare readonly testType: ComponentKind;

  override readonly count = new Count();

  @test
  'an entry point'() {
    let delegate = new JitRenderDelegate();
    let Title = defineComponent({}, `<h1>hello {{@title}}</h1>`);

    let element = delegate.getInitialElement();
    let title = createPrimitiveRef('renderComponent');
    delegate.renderComponent(Title, { title }, element);

    QUnit.assert.strictEqual(
      castToBrowser(element, 'HTML').innerHTML,
      '<h1>hello renderComponent</h1>'
    );
  }

  @test
  'does not leak args between invocations'() {
    let delegate = new JitRenderDelegate();
    let Title = defineComponent({}, `<h1>hello {{@title}}</h1>`);

    let element = delegate.getInitialElement();
    let title = createPrimitiveRef('renderComponent');
    delegate.renderComponent(Title, { title }, element);
    QUnit.assert.strictEqual(
      castToBrowser(element, 'HTML').innerHTML,
      '<h1>hello renderComponent</h1>'
    );

    element = delegate.getInitialElement();
    let newTitle = createPrimitiveRef('new title');
    delegate.renderComponent(Title, { title: newTitle }, element);
    QUnit.assert.strictEqual(castToBrowser(element, 'HTML').innerHTML, '<h1>hello new title</h1>');
  }

  @test
  'can render different components per call'() {
    let delegate = new JitRenderDelegate();
    let Title = defineComponent({}, `<h1>hello {{@title}}</h1>`);
    let Body = defineComponent({}, `<p>body {{@body}}</p>`);

    let element = delegate.getInitialElement();
    let title = createPrimitiveRef('renderComponent');
    delegate.renderComponent(Title, { title }, element);
    QUnit.assert.strictEqual(
      castToBrowser(element, 'HTML').innerHTML,
      '<h1>hello renderComponent</h1>'
    );

    element = delegate.getInitialElement();
    let body = createPrimitiveRef('text');
    delegate.renderComponent(Body, { body }, element);
    QUnit.assert.strictEqual(castToBrowser(element, 'HTML').innerHTML, '<p>body text</p>');
  }

  @test
  'supports passing in an initial dynamic context'() {
    let delegate = new JitRenderDelegate();
    let Locale = defineComponent({}, `{{-get-dynamic-var "locale"}}`);

    let element = delegate.getInitialElement();
    let dynamicScope = new DynamicScopeImpl({
      locale: createPrimitiveRef('en_US'),
    });
    delegate.renderComponent(Locale, {}, element, dynamicScope);

    QUnit.assert.strictEqual(castToBrowser(element, 'HTML').innerHTML, 'en_US');
  }
}
