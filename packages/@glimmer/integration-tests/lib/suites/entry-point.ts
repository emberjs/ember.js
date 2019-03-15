import { PrimitiveReference } from '@glimmer/runtime';
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
    let title = PrimitiveReference.create('renderComponent');
    delegate.renderComponent('Title', { title }, element);

    QUnit.assert.equal((element as Element).innerHTML, '<h1>hello renderComponent</h1>');
  }

  @test
  'does not leak args between invocations'() {
    let delegate = new AotRenderDelegate();
    delegate.registerComponent('Basic', 'Basic', 'Title', `<h1>hello {{@title}}</h1>`);

    let element = delegate.getInitialElement();
    let title = PrimitiveReference.create('renderComponent');
    delegate.renderComponent('Title', { title }, element);
    QUnit.assert.equal((element as Element).innerHTML, '<h1>hello renderComponent</h1>');

    element = delegate.getInitialElement();
    let newTitle = PrimitiveReference.create('new title');
    delegate.renderComponent('Title', { title: newTitle }, element);
    QUnit.assert.equal((element as Element).innerHTML, '<h1>hello new title</h1>');
  }

  @test
  'can render different components per call'() {
    let delegate = new AotRenderDelegate();
    delegate.registerComponent('Basic', 'Basic', 'Title', `<h1>hello {{@title}}</h1>`);
    delegate.registerComponent('Basic', 'Basic', 'Body', `<p>body {{@body}}</p>`);

    let element = delegate.getInitialElement();
    let title = PrimitiveReference.create('renderComponent');
    delegate.renderComponent('Title', { title }, element);
    QUnit.assert.equal((element as Element).innerHTML, '<h1>hello renderComponent</h1>');

    element = delegate.getInitialElement();
    let body = PrimitiveReference.create('text');
    delegate.renderComponent('Body', { body }, element);
    QUnit.assert.equal((element as Element).innerHTML, '<p>body text</p>');
  }
}
