import { RenderTest, test } from '../render-test';

export class ShadowingSuite extends RenderTest {
  @test({ kind: 'glimmer' })
  "normal outer attributes are reflected"() {
    this.render({
      layout: 'In layout - someProp: {{@someProp}}',
      args: { someProp: '"something here"' }
    });

    this.assertComponent('In layout - someProp: something here');
    this.assertStableRerender();
  }

  @test({ kind: 'glimmer' })
  "shadowing - normal outer attributes clobber inner attributes"() {
    this.render({
      layout: 'Hello!',
      layoutAttributes: { 'data-name': '"Godfrey"', 'data-foo': '"foo"' },
      attributes: { 'data-name': '"Godfrey"', 'data-foo': '"bar"' },
      args: { someProp: '"something here"' }
    });

    this.assertComponent('Hello!', { 'data-name': 'Godfrey', 'data-foo': 'bar' });
    this.assertStableRerender();
  }

  @test({ kind: 'glimmer' })
  "outer attributes with concat are reflected"() {
    this.render({
      layout: 'In layout - someProp: {{@someProp}}',
      args: { someProp: 'someProp' }
    }, { someProp: 'something here' });

    this.assertComponent('In layout - someProp: something here');
    this.assertStableRerender();

    this.rerender({ someProp: 'something else' });
    this.assertComponent('In layout - someProp: something else');
    this.assertStableNodes();

    this.rerender({ someProp: '' });
    this.assertComponent('In layout - someProp: ');
    this.assertStableNodes();

    this.rerender({ someProp: 'something here' });
    this.assertComponent('In layout - someProp: something here');
    this.assertStableNodes();
  }

  @test({ kind: 'glimmer' })
  "outer attributes with concat clobber inner attributes"() {
    this.render({
      layoutAttributes: { 'data-name': 'Godfrey', 'data-foo': 'foo' },
      layout: 'Hello!',
      attributes: { 'data-name': '"{{name}}"', 'data-foo': '"{{foo}}-bar"' },
    }, { name: 'Godhuda', foo: 'foo' });

    this.assertComponent('Hello!', { 'data-name': 'Godhuda', 'data-foo': 'foo-bar' });
    this.assertStableRerender();

    this.rerender({ name: 'Yehuda', foo: 'baz' });
    this.assertComponent('Hello!', { 'data-name': 'Yehuda', 'data-foo': 'baz-bar' });
    this.assertStableNodes();

    this.rerender({ name: '', foo: '' });
    this.assertComponent('Hello!', { 'data-name': '', 'data-foo': '-bar' });
    this.assertStableNodes();

    this.rerender({ name: 'Godhuda', foo: 'foo' });
    this.assertComponent('Hello!', { 'data-name': 'Godhuda', 'data-foo': 'foo-bar' });
    this.assertStableNodes();
  }

  @test({ kind: 'glimmer' })
  "outer attributes clobber inner attributes with concat"() {
    this.render({
      layoutAttributes: { 'data-name': '{{@name}}', 'data-foo': '"{{@foo}}-bar"' },
      layout: 'Hello!',
      args: { name: 'name', foo: 'foo' },
      attributes: { 'data-name': '"Godhuda"', 'data-foo': '"foo-bar"' },
    }, { name: 'Godfrey', foo: 'foo' });

    this.assertComponent('Hello!', { 'data-name': 'Godhuda', 'data-foo': 'foo-bar' });
    this.assertStableRerender();

    this.rerender({ name: 'Yehuda', foo: 'baz' });
    this.assertComponent('Hello!', { 'data-name': 'Godhuda', 'data-foo': 'foo-bar' });
    this.assertStableNodes();

    this.rerender({ name: '', foo: '' });
    this.assertComponent('Hello!', { 'data-name': 'Godhuda', 'data-foo': 'foo-bar' });
    this.assertStableNodes();

    this.rerender({ name: 'Godhuda', foo: 'foo' });
    this.assertComponent('Hello!', { 'data-name': 'Godhuda', 'data-foo': 'foo-bar' });
    this.assertStableNodes();
  }
}
