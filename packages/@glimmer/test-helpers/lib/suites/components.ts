import { RenderTest, test } from '../render-test';

export class FragmentComponents extends RenderTest {
  @test({
    kind: "fragment"
  })
  "creating a new component"() {
    this.render(
      {
        name: "MyComponent",
        layout: "{{yield}} - {{@color}}",
        template: "hello!",
        args: { color: "color" }
      },
      { color: "red" }
    );

    this.assertHTML(`hello! - red`);
    this.assertStableRerender();

    this.rerender({ color: "green" });
    this.assertHTML(`hello! - green`);
    this.assertStableNodes();

    this.rerender({ color: "red" });
    this.assertHTML(`hello! - red`);
    this.assertStableNodes();
  }

  @test({
    kind: "fragment"
  })
  "inner ...attributes"() {
    this.render(
      {
        name: "MyComponent",
        layout: "<div><span ...attributes>{{yield}} - {{@color}}</span></div>",
        template: "hello!",
        args: { color: "color" },
        attributes: { color: "{{color}}" }
      },
      { color: "red" }
    );

    this.assertHTML(`<div><span color='red'>hello! - red</span></div>`);
    this.assertStableRerender();

    this.rerender({ color: "green" });
    this.assertHTML(`<div><span color='green'>hello! - green</span></div>`);
    this.assertStableNodes();

    this.rerender({ color: "red" });
    this.assertHTML(`<div><span color='red'>hello! - red</span></div>`);
    this.assertStableNodes();
  }
}

export class BasicComponents extends RenderTest {
  @test({
    kind: "basic"
  })
  "creating a new component"() {
    this.render(
      {
        name: "MyComponent",
        layout: "{{yield}}",
        template: "hello!",
        attributes: { color: "{{color}}" }
      },
      { color: "red" }
    );

    this.assertHTML(`<div color='red'>hello!</div>`);
    this.assertStableRerender();

    this.rerender({ color: "green" });
    this.assertHTML(`<div color='green'>hello!</div>`);
    this.assertStableNodes();

    this.rerender({ color: "red" });
    this.assertHTML(`<div color='red'>hello!</div>`);
    this.assertStableNodes();
  }

  @test({
    kind: "basic"
  })
  "creating a new component passing args"() {
    this.render(
      {
        name: "MyComponent",
        layout: "{{@arg1}}{{yield}}",
        template: "hello!",
        args: { arg1: "'hello - '" },
        attributes: { color: "{{color}}" }
      },
      { color: "red" }
    );

    this.assertHTML("<div color='red'>hello - hello!</div>");
    this.assertStableRerender();

    this.rerender({ color: "green" });
    this.assertHTML("<div color='green'>hello - hello!</div>");
    this.assertStableNodes();

    this.rerender({ color: "red" });
    this.assertHTML("<div color='red'>hello - hello!</div>");
    this.assertStableNodes();
  }

  @test({
    kind: "basic"
  })
  "creating a new component passing dynamic args"() {
    this.render(
      {
        name: "MyComponent",
        layout: "{{@arg1}}{{yield}}",
        template: "hello!",
        args: { arg1: "left" },
        attributes: { color: "{{color}}" }
      },
      { color: "red", left: "left - " }
    );

    this.assertHTML("<div color='red'>left - hello!</div>");
    this.assertStableRerender();

    this.rerender({ color: "green", left: "LEFT - " });
    this.assertHTML("<div color='green'>LEFT - hello!</div>");
    this.assertStableNodes();

    this.rerender({ color: "red", left: "left - " });
    this.assertHTML("<div color='red'>left - hello!</div>");
    this.assertStableNodes();
  }

  @test({
    kind: "basic"
  })
  "creating a new component yielding values"() {
    this.render(
      {
        name: "MyComponent",
        layout: "{{@arg1}}{{yield @yieldme}}",
        template: "hello! {{yielded}}",
        blockParams: ["yielded"],
        args: { arg1: "left", yieldme: "'yield me'" },
        attributes: { color: "{{color}}" }
      },
      { color: "red", left: "left - " }
    );

    this.assertHTML("<div color='red'>left - hello! yield me</div>");
    this.assertStableRerender();

    this.rerender({ color: "green", left: "LEFT - " });
    this.assertHTML("<div color='green'>LEFT - hello! yield me</div>");
    this.assertStableNodes();

    this.rerender({ color: "red", left: "left - " });
    this.assertHTML("<div color='red'>left - hello! yield me</div>");
    this.assertStableNodes();
  }
}
