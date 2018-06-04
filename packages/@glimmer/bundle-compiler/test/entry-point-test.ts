import { module, test, EagerRenderDelegate } from '@glimmer/test-helpers';
import { PrimitiveReference } from '@glimmer/runtime';

export class EntryPointTest {
  @test
  'an entry point'() {
    let delegate = new EagerRenderDelegate();
    let element = document.createElement('div');
    let title = PrimitiveReference.create('renderComponent');

    delegate.registerComponent('Basic', 'Basic', 'Title', `<h1>hello {{@title}}</h1>`);
    delegate.renderComponent('Title', { title }, element);

    QUnit.assert.equal(element.innerHTML, '<h1>hello renderComponent</h1>');
  }
}

module('[bundle-compiler] entry point', EntryPointTest);
