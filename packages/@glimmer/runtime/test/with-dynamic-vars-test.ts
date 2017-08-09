
import { module, RenderTests, test } from "@glimmer/test-helpers";

class WithDynamicVarsTests extends RenderTests {
  @test
  "Can get and set dynamic variable"() {
    this.render({
      layout: '{{#-with-dynamic-vars myKeyword=@value}}{{yield}}{{/-with-dynamic-vars}}',
      template: '{{-get-dynamic-var "myKeyword"}}',
      args: { value: 'value' }
    }, { value: 'hello' });

    this.assertComponent('hello');
    this.assertStableRerender();

    this.rerender({ value: 'goodbye' });
    this.assertComponent('goodbye');
    this.assertStableNodes();

    this.rerender({ value: 'hello' });
    this.assertComponent('hello');
    this.assertStableNodes();
  }

  @test
  "Can get and set dynamic variable with bound names"() {
    this.render({
      layout: '{{#-with-dynamic-vars myKeyword=@value1 secondKeyword=@value2}}{{yield}}{{/-with-dynamic-vars}}',
      template: '{{keyword}}-{{-get-dynamic-var keyword}}',
      args: { value1: "value1", value2: "value2" }
    }, { value1: "hello", value2: "goodbye", keyword: "myKeyword" });

    this.assertComponent('myKeyword-hello');
    this.assertStableRerender();

    this.rerender({ keyword: 'secondKeyword' });
    this.assertComponent('secondKeyword-goodbye');
    this.assertStableNodes();

    this.rerender({ value2: 'goodbye!' });
    this.assertComponent('secondKeyword-goodbye!');
    this.assertStableNodes();

    this.rerender({ value1: "hello", value2: "goodbye", keyword: "myKeyword" });
    this.assertComponent('myKeyword-hello');
    this.assertStableNodes();
  }

  @test
  'Can shadow existing dynamic variable'() {
    this.render({
      layout: '{{#-with-dynamic-vars myKeyword=@outer}}<div>{{-get-dynamic-var "myKeyword"}}</div>{{#-with-dynamic-vars myKeyword=@inner}}{{yield}}{{/-with-dynamic-vars}}<div>{{-get-dynamic-var "myKeyword"}}</div>{{/-with-dynamic-vars}}',
      template: '<div>{{-get-dynamic-var "myKeyword"}}</div>',
      args: { outer: 'outer', inner: 'inner' }
    }, { outer: 'original', inner: 'shadowed' });

    this.assertComponent('<div>original</div><div>shadowed</div><div>original</div>');
    this.assertStableRerender();

    this.rerender({ outer: 'original2', inner: 'shadowed' });
    this.assertComponent('<div>original2</div><div>shadowed</div><div>original2</div>');
    this.assertStableNodes();

    this.rerender({ outer: 'original2', inner: 'shadowed2' });
    this.assertComponent('<div>original2</div><div>shadowed2</div><div>original2</div>');
    this.assertStableNodes();

    this.rerender({ outer: 'original', inner: 'shadowed' });
    this.assertComponent('<div>original</div><div>shadowed</div><div>original</div>');
    this.assertStableNodes();
  }

}

module("Dynamically-scoped variable accessors", WithDynamicVarsTests, { componentModule: true });
