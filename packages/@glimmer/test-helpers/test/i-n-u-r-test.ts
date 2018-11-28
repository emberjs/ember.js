import { LazyRenderDelegate, RenderTest } from '@glimmer/test-helpers';
import { Simple } from '@glimmer/interfaces';

QUnit.module('Render Tests: I-N-U-R');

QUnit.test('Can set properties', assert => {
  new class extends RenderTest {
    constructor(delegate: LazyRenderDelegate) {
      super(delegate);
      this.setProperties({ foo: 'bar' });
      assert.equal(this.context.foo, 'bar');
    }
  }(new LazyRenderDelegate());
});

QUnit.test('Can take basic snapshots', assert => {
  let div = document.createElement('div') as Simple.Element;
  let text = document.createTextNode('Foo') as Simple.Text;
  div.appendChild(text);

  new class extends RenderTest {
    element = div;
    constructor(delegate: LazyRenderDelegate) {
      super(delegate);
      let snapShot = this.takeSnapshot();
      assert.deepEqual(snapShot, [text, 'up']);
    }
  }(new LazyRenderDelegate());
});

QUnit.test('Can take nested snapshots', assert => {
  let div = document.createElement('div') as Simple.Element;
  let p = document.createElement('p') as Simple.Element;
  let text = document.createTextNode('Foo') as Simple.Text;
  p.appendChild(text);
  div.appendChild(p);

  new class extends RenderTest {
    element = div;
    constructor(delegate: LazyRenderDelegate) {
      super(delegate);
      let snapShot = this.takeSnapshot();
      assert.deepEqual(snapShot, [p, 'down', text, 'up', 'up']);
    }
  }(new LazyRenderDelegate());
});

QUnit.test('Can take nested snapshots of serialized blocks', assert => {
  let div = document.createElement('div') as Simple.Element;
  let open = document.createComment('<!--%+b:0%-->') as Simple.Comment;
  let text = document.createTextNode('Foo') as Simple.Text;
  let close = document.createComment('<!--%-b:0%-->') as Simple.Comment;
  div.appendChild(open);
  div.appendChild(text);
  div.appendChild(close);

  new class extends RenderTest {
    element = div;
    constructor(delegate: LazyRenderDelegate) {
      super(delegate);
      let snapShot = this.takeSnapshot();
      assert.deepEqual(snapShot, [open, text, close, 'up']);
    }
  }(new LazyRenderDelegate());
});
