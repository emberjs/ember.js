import { DynamicScopeImpl } from '@glimmer/runtime';
import { createPrimitiveRef } from '@glimmer/reference';
import { RenderTest, Count } from '../render-test';
import { ComponentKind } from '../components/types';
import { test } from '../test-decorator';
import { AotRenderDelegate } from '../modes/aot/delegate';

export class EntryPointTest extends RenderTest {
  static suiteName = 'entry points';

  readonly testType!: ComponentKind;

  readonly count = new Count();

  @test
  'an entry point'() {
    let delegate = new AotRenderDelegate();
    delegate.registerComponent('Basic', 'Basic', 'Title', `<h1>hello {{@title}}</h1>`);

    let element = delegate.getInitialElement();
    let title = createPrimitiveRef('renderComponent');
    delegate.renderComponent('Title', { title }, element);

    QUnit.assert.equal((element as Element).innerHTML, '<h1>hello renderComponent</h1>');
  }

  @test
  'does not leak args between invocations'() {
    let delegate = new AotRenderDelegate();
    delegate.registerComponent('Basic', 'Basic', 'Title', `<h1>hello {{@title}}</h1>`);

    let element = delegate.getInitialElement();
    let title = createPrimitiveRef('renderComponent');
    delegate.renderComponent('Title', { title }, element);
    QUnit.assert.equal((element as Element).innerHTML, '<h1>hello renderComponent</h1>');

    element = delegate.getInitialElement();
    let newTitle = createPrimitiveRef('new title');
    delegate.renderComponent('Title', { title: newTitle }, element);
    QUnit.assert.equal((element as Element).innerHTML, '<h1>hello new title</h1>');
  }

  @test
  'can render different components per call'() {
    let delegate = new AotRenderDelegate();
    delegate.registerComponent('Basic', 'Basic', 'Title', `<h1>hello {{@title}}</h1>`);
    delegate.registerComponent('Basic', 'Basic', 'Body', `<p>body {{@body}}</p>`);

    let element = delegate.getInitialElement();
    let title = createPrimitiveRef('renderComponent');
    delegate.renderComponent('Title', { title }, element);
    QUnit.assert.equal((element as Element).innerHTML, '<h1>hello renderComponent</h1>');

    element = delegate.getInitialElement();
    let body = createPrimitiveRef('text');
    delegate.renderComponent('Body', { body }, element);
    QUnit.assert.equal((element as Element).innerHTML, '<p>body text</p>');
  }

  @test
  'supports passing in an initial dynamic context'() {
    let delegate = new AotRenderDelegate();
    delegate.registerComponent('Basic', 'Basic', 'Locale', `{{-get-dynamic-var "locale"}}`);

    let element = delegate.getInitialElement();
    let dynamicScope = new DynamicScopeImpl({
      locale: createPrimitiveRef('en_US'),
    });
    delegate.renderComponent('Locale', {}, element, dynamicScope);

    QUnit.assert.equal((element as Element).innerHTML, 'en_US');
  }
}
