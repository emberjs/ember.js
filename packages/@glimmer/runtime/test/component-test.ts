import { module, RenderTests, test } from "@glimmer/test-helpers";

class BasicComponents extends RenderTests {
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

module("[glimmer-runtime] Basic Components", BasicComponents, { componentModule: true });
