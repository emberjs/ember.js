import { module, test, EagerRenderDelegate, RenderTest } from '@glimmer/test-helpers';
import { PrimitiveReference } from '@glimmer/runtime';

export class EntryPointTest extends RenderTest {
  @test
  'an entry point'() {
    let delegate = new EagerRenderDelegate();
    delegate.registerComponent('Basic', 'Basic', 'Title', `<h1>hello {{@title}}</h1>`);

    let element = delegate.getInitialElement();
    let title = PrimitiveReference.create('renderComponent');
    delegate.renderComponent('Title', { title }, element);

    QUnit.assert.equal((element as HTMLElement).innerHTML, '<h1>hello renderComponent</h1>');
  }

  @test
  'does not leak args between invocations'() {
    let delegate = new EagerRenderDelegate();
    delegate.registerComponent('Basic', 'Basic', 'Title', `<h1>hello {{@title}}</h1>`);

    let element = delegate.getInitialElement();
    let title = PrimitiveReference.create('renderComponent');
    delegate.renderComponent('Title', { title }, element);
    QUnit.assert.equal((element as HTMLElement).innerHTML, '<h1>hello renderComponent</h1>');

    element = delegate.getInitialElement();
    let newTitle = PrimitiveReference.create('new title');
    delegate.renderComponent('Title', { title: newTitle }, element);
    QUnit.assert.equal((element as HTMLElement).innerHTML, '<h1>hello new title</h1>');
  }

  @test
  'can render different components per call'() {
    let delegate = new EagerRenderDelegate();
    delegate.registerComponent('Basic', 'Basic', 'Title', `<h1>hello {{@title}}</h1>`);
    delegate.registerComponent('Basic', 'Basic', 'Body', `<p>body {{@body}}</p>`);

    let element = delegate.getInitialElement();
    let title = PrimitiveReference.create('renderComponent');
    delegate.renderComponent('Title', { title }, element);
    QUnit.assert.equal((element as HTMLElement).innerHTML, '<h1>hello renderComponent</h1>');

    element = delegate.getInitialElement();
    let body = PrimitiveReference.create('text');
    delegate.renderComponent('Body', { body }, element);
    QUnit.assert.equal((element as HTMLElement).innerHTML, '<p>body text</p>');
  }
}

module('[bundle-compiler] entry point', EntryPointTest);
