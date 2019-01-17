import { JitRenderDelegate, RenderTest } from '@glimmer/integration-tests';
import { SimpleComment, SimpleElement, SimpleText } from '@simple-dom/interface';

import { module } from './support';

module('Render Tests: I-N-U-R', ({ test }) => {
  test('Can set properties', assert => {
    // tslint:disable-next-line:no-unused-expression
    new class extends RenderTest {
      constructor(delegate: JitRenderDelegate) {
        super(delegate);
        this.setProperties({ foo: 'bar' });
        assert.equal(this.context.foo, 'bar');
      }
    }(new JitRenderDelegate());
  });

  test('Can take basic snapshots', assert => {
    let div = document.createElement('div') as SimpleElement;
    let text = document.createTextNode('Foo') as SimpleText;
    div.appendChild(text);

    // tslint:disable-next-line:no-unused-expression
    new class extends RenderTest {
      element = div;
      constructor(delegate: JitRenderDelegate) {
        super(delegate);
        let snapShot = this.takeSnapshot();
        assert.deepEqual(snapShot, [text, 'up']);
      }
    }(new JitRenderDelegate());
  });

  test('Can take nested snapshots', assert => {
    let div = document.createElement('div') as SimpleElement;
    let p = document.createElement('p') as SimpleElement;
    let text = document.createTextNode('Foo') as SimpleText;
    p.appendChild(text);
    div.appendChild(p);

    // tslint:disable-next-line:no-unused-expression
    new class extends RenderTest {
      element = div;
      constructor(delegate: JitRenderDelegate) {
        super(delegate);
        let snapShot = this.takeSnapshot();
        assert.deepEqual(snapShot, [p, 'down', text, 'up', 'up']);
      }
    }(new JitRenderDelegate());
  });

  test('Can take nested snapshots of serialized blocks', assert => {
    let div = document.createElement('div') as SimpleElement;
    let open = document.createComment('<!--%+b:0%-->') as SimpleComment;
    let text = document.createTextNode('Foo') as SimpleText;
    let close = document.createComment('<!--%-b:0%-->') as SimpleComment;
    div.appendChild(open);
    div.appendChild(text);
    div.appendChild(close);

    // tslint:disable-next-line:no-unused-expression
    new class extends RenderTest {
      element = div;
      constructor(delegate: JitRenderDelegate) {
        super(delegate);
        let snapShot = this.takeSnapshot();
        assert.deepEqual(snapShot, [open, text, close, 'up']);
      }
    }(new JitRenderDelegate());
  });
});
