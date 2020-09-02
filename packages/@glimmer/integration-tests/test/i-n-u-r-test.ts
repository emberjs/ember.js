import { cast } from '@glimmer/runtime';
import { JitRenderDelegate, RenderTest } from '..';
import { module } from './support';

module('Render Tests: I-N-U-R', ({ test }) => {
  let doc = cast(document).simple;

  test('Can set properties', (assert) => {
    new (class extends RenderTest {
      constructor(delegate: JitRenderDelegate) {
        super(delegate);
        this.setProperties({ foo: 'bar' });
        assert.equal(this.context.foo, 'bar');
      }
    })(new JitRenderDelegate());
  });

  test('Can take basic snapshots', (assert) => {
    let div = doc.createElement('div');
    let text = doc.createTextNode('Foo');
    div.appendChild(text);

    new (class extends RenderTest {
      element = div;
      constructor(delegate: JitRenderDelegate) {
        super(delegate);
        let snapShot = this.takeSnapshot();
        assert.deepEqual(snapShot, [text, 'up']);
      }
    })(new JitRenderDelegate());
  });

  test('Can take nested snapshots', (assert) => {
    let div = doc.createElement('div');
    let p = doc.createElement('p');
    let text = doc.createTextNode('Foo');
    p.appendChild(text);
    div.appendChild(p);

    new (class extends RenderTest {
      element = div;
      constructor(delegate: JitRenderDelegate) {
        super(delegate);
        let snapShot = this.takeSnapshot();
        assert.deepEqual(snapShot, [p, 'down', text, 'up', 'up']);
      }
    })(new JitRenderDelegate());
  });

  test('Can take nested snapshots of serialized blocks', (assert) => {
    let div = doc.createElement('div');
    let open = doc.createComment('<!--%+b:0%-->');
    let text = doc.createTextNode('Foo');
    let close = doc.createComment('<!--%-b:0%-->');
    div.appendChild(open);
    div.appendChild(text);
    div.appendChild(close);

    new (class extends RenderTest {
      element = div;
      constructor(delegate: JitRenderDelegate) {
        super(delegate);
        let snapShot = this.takeSnapshot();
        assert.deepEqual(snapShot, [open, text, close, 'up']);
      }
    })(new JitRenderDelegate());
  });
});
