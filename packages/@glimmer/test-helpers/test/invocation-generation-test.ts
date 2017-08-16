import { AbstractRenderTest } from "../lib/abstract-test-case";
import { TestEnvironmentRenderDelegate } from "@glimmer/test-helpers";

let renderTests: AbstractRenderTest;
QUnit.module("Render Tests: buildComponent", {
  beforeEach() {
    renderTests = new AbstractRenderTest(new TestEnvironmentRenderDelegate());
  }
});

QUnit.test("Can build basic glimmer invocation", assert => {
  renderTests["testType"] = "Glimmer";
  let invocation = renderTests.buildComponent({
    layout: "Hello"
  });

  assert.equal(invocation, "<TestComponent />");
});

QUnit.test("Can build glimmer invocation with template", assert => {
  renderTests["testType"] = "Glimmer";
  let invocation = renderTests.buildComponent({
    layout: "Hello {{yield}}",
    template: "World"
  });

  assert.equal(invocation, "<TestComponent>World</TestComponent>");
});

QUnit.test("Can build glimmer invocation with args", assert => {
  renderTests["testType"] = "Glimmer";
  let invocation = renderTests.buildComponent({
    layout: "Hello {{yield}}",
    template: "World",
    args: { foo: "bar", baz: 1, bar: null, literal: "'literal'" }
  });

  assert.equal(invocation, "<TestComponent @foo={{bar}} @baz={{1}} @bar={{null}} @literal='literal'>World</TestComponent>");
});

QUnit.test("Can build glimmer invocation with attributes", assert => {
  renderTests["testType"] = "Glimmer";
  let invocation = renderTests.buildComponent({
    layout: "Hello {{yield}}",
    template: "World",
    args: { foo: "bar", baz: 1, bar: null },
    attributes: { "data-foo": "bar", id: "wat" }
  });

  assert.equal(
    invocation,
    "<TestComponent @foo={{bar}} @baz={{1}} @bar={{null}} data-foo=bar id=wat>World</TestComponent>"
  );
});

QUnit.test("Can build glimmer invocation with custom tag name", assert => {
  renderTests["testType"] = "Glimmer";
  let invocation = renderTests.buildComponent({
    name: "LolWat",
    layout: "Hello {{yield}}",
    template: "World",
    args: { foo: "bar", baz: 1, bar: null },
    attributes: { "data-foo": '"bar"', id: '"wat"' }
  });

  assert.equal(invocation, `<LolWat @foo={{bar}} @baz={{1}} @bar={{null}} data-foo="bar" id="wat">World</LolWat>`);
});

QUnit.test("Can build glimmer invocation with block params", assert => {
  renderTests["testType"] = "Glimmer";
  let invocation = renderTests.buildComponent({
    name: "Lol",
    layout: "Hello {{yield}}",
    template: "World",
    args: { foo: "bar", baz: 1, bar: null },
    attributes: { "data-foo": '"bar"', id: '"wat"' },
    blockParams: ["a b c"]
  });

  assert.equal(
    invocation,
    `<Lol @foo={{bar}} @baz={{1}} @bar={{null}} data-foo="bar" id="wat" as |a b c|>World</Lol>`
  );
});

QUnit.test("Can build basic curly invocation", assert => {
  renderTests["testType"] = "Curly";
  let invocation = renderTests.buildComponent({
    layout: "Hello"
  });

  assert.equal(invocation, "{{test-component}}");
});

QUnit.test("Can build curly invocation with template", assert => {
  renderTests["testType"] = "Curly";
  let invocation = renderTests.buildComponent({
    layout: "Hello {{yield}}",
    template: "World"
  });

  assert.equal(invocation, "{{#test-component}}World{{/test-component}}");
});

QUnit.test("Can build curly invocation with args", assert => {
  renderTests["testType"] = "Curly";
  let invocation = renderTests.buildComponent({
    layout: "Hello {{yield}}",
    template: "World",
    args: { foo: "bar", baz: 1, bar: null }
  });

  assert.equal(invocation, "{{#test-component foo=bar baz=1 bar=null}}World{{/test-component}}");
});

QUnit.test("Can build curly invocation with attributes throws", assert => {
  renderTests["testType"] = "Curly";

  assert.throws(() => {
    renderTests.buildComponent({
      layout: "Hello {{yield}}",
      template: "World",
      args: { foo: "bar", baz: 1, bar: null },
      attributes: { "data-foo": '"bar"', id: '"wat"' }
    });
  }, /Cannot pass attributes to curly components/);
});

QUnit.test("Can build curly invocation with 'attributes' in args", assert => {
  renderTests["testType"] = "Curly";
  let invocation = renderTests.buildComponent({
    layout: "Hello {{yield}}",
    template: "World",
    args: { foo: "bar", baz: 1, bar: null, "data-foo": '"bar"', id: '"wat"' }
  });

  assert.equal(
    invocation,
    `{{#test-component foo=bar baz=1 bar=null data-foo="bar" id="wat"}}World{{/test-component}}`
  );
});

QUnit.test("Can build curly invocation with custom tag name", assert => {
  renderTests["testType"] = "Curly";
  let invocation = renderTests.buildComponent({
    name: "lol-wat",
    layout: "Hello {{yield}}",
    template: "World",
    args: { foo: "bar", baz: 1, bar: null, "data-foo": '"bar"', id: '"wat"' }
  });

  assert.equal(invocation, `{{#lol-wat foo=bar baz=1 bar=null data-foo="bar" id="wat"}}World{{/lol-wat}}`);
});

QUnit.test("Can build curly invocation with block params", assert => {
  renderTests["testType"] = "Curly";
  let invocation = renderTests.buildComponent({
    name: "lol-wat",
    layout: "Hello {{yield}}",
    template: "World",
    args: { foo: "bar", baz: 1, bar: null, "data-foo": '"bar"', id: '"wat"' },
    blockParams: ["a b c"]
  });

  assert.equal(invocation, `{{#lol-wat foo=bar baz=1 bar=null data-foo="bar" id="wat" as |a b c|}}World{{/lol-wat}}`);
});

QUnit.test("Can build curly invocation with inverse", assert => {
  renderTests["testType"] = "Curly";
  let invocation = renderTests.buildComponent({
    name: "lol-wat",
    layout: "Hello {{yield}}",
    template: "World",
    args: { foo: "bar", baz: 1, bar: null, "data-foo": '"bar"', id: '"wat"' },
    blockParams: ["a b c"],
    inverse: "INVERSE"
  });

  assert.equal(
    invocation,
    `{{#lol-wat foo=bar baz=1 bar=null data-foo="bar" id="wat" as |a b c|}}World{{else}}INVERSE{{/lol-wat}}`
  );
});

QUnit.test("Can build basic dynamic invocation", assert => {
  renderTests["testType"] = "Dynamic";
  let invocation = renderTests.buildComponent({
    layout: "Hello"
  });

  assert.equal(invocation, "{{component componentName}}");
});

QUnit.test("Can build dynamic invocation with template", assert => {
  renderTests["testType"] = "Dynamic";
  let invocation = renderTests.buildComponent({
    layout: "Hello {{yield}}",
    template: "World"
  });

  assert.equal(invocation, "{{#component componentName}}World{{/component}}");
});

QUnit.test("Can build dynamic invocation with args", assert => {
  renderTests["testType"] = "Dynamic";
  let invocation = renderTests.buildComponent({
    layout: "Hello {{yield}}",
    template: "World",
    args: { foo: "bar", baz: 1, bar: null }
  });

  assert.equal(invocation, "{{#component componentName foo=bar baz=1 bar=null}}World{{/component}}");
});

QUnit.test("Can build dynamic invocation with custom tag name", assert => {
  renderTests["testType"] = "Dynamic";
  let invocation = renderTests.buildComponent({
    name: "lol-wat",
    layout: "Hello {{yield}}",
    template: "World",
    args: { foo: "bar", baz: 1, bar: null, "data-foo": '"bar"', id: '"wat"' }
  });

  assert.equal(
    invocation,
    `{{#component componentName foo=bar baz=1 bar=null data-foo="bar" id="wat"}}World{{/component}}`
  );
});

QUnit.test("Can build dynamic invocation with block params", assert => {
  renderTests["testType"] = "Dynamic";
  let invocation = renderTests.buildComponent({
    name: "lol-wat",
    layout: "Hello {{yield}}",
    template: "World",
    args: { foo: "bar", baz: 1, bar: null, "data-foo": '"bar"', id: '"wat"' },
    blockParams: ["a b c"]
  });

  assert.equal(
    invocation,
    `{{#component componentName foo=bar baz=1 bar=null data-foo="bar" id="wat" as |a b c|}}World{{/component}}`
  );
});

QUnit.test("Can build dynamic invocation with inverse", assert => {
  renderTests["testType"] = "Dynamic";
  let invocation = renderTests.buildComponent({
    name: "lol-wat",
    layout: "Hello {{yield}}",
    template: "World",
    args: { foo: "bar", baz: 1, bar: null, "data-foo": '"bar"', id: '"wat"' },
    blockParams: ["a b c"],
    inverse: "INVERSE"
  });

  assert.equal(
    invocation,
    `{{#component componentName foo=bar baz=1 bar=null data-foo="bar" id="wat" as |a b c|}}World{{else}}INVERSE{{/component}}`
  );
});

QUnit.test("Can build basic component invocation", assert => {
  renderTests["testType"] = "Basic";
  let invocation = renderTests.buildComponent({
    layout: "Hello"
  });

  assert.equal(invocation, "<TestComponent />");
});

QUnit.test("Can build basic component invocation with template", assert => {
  renderTests["testType"] = "Basic";
  let invocation = renderTests.buildComponent({
    layout: "Hello {{yield}}",
    template: "World"
  });

  assert.equal(invocation, "<TestComponent>World</TestComponent>");
});

QUnit.test("Can build basic component invocation with args", assert => {
  renderTests["testType"] = "Basic";
  let invocation = renderTests.buildComponent({
    layout: "Hello {{yield}}",
    template: "World",
    args: { foo: "bar", baz: 1, bar: null }
  });

  assert.equal(invocation, "<TestComponent @foo={{bar}} @baz={{1}} @bar={{null}}>World</TestComponent>");
});

QUnit.test("Can build basic component invocation with attributes", assert => {
  renderTests["testType"] = "Basic";
  let invocation = renderTests.buildComponent({
    layout: "Hello {{yield}}",
    template: "World",
    args: { foo: "bar", baz: 1, bar: null },
    attributes: { "data-foo": "bar", id: "wat" }
  });

  assert.equal(
    invocation,
    "<TestComponent @foo={{bar}} @baz={{1}} @bar={{null}} data-foo=bar id=wat>World</TestComponent>"
  );
});

QUnit.test("Can build basic component invocation with custom tag name", assert => {
  renderTests["testType"] = "Basic";
  let invocation = renderTests.buildComponent({
    name: "Lol",
    layout: "Hello {{yield}}",
    template: "World",
    args: { foo: "bar", baz: 1, bar: null },
    attributes: { "data-foo": '"bar"', id: '"wat"' }
  });

  assert.equal(invocation, `<Lol @foo={{bar}} @baz={{1}} @bar={{null}} data-foo="bar" id="wat">World</Lol>`);
});

QUnit.test("Can build basic component invocation with block params", assert => {
  renderTests["testType"] = "Basic";
  let invocation = renderTests.buildComponent({
    name: "Lol",
    layout: "Hello {{yield}}",
    template: "World",
    args: { foo: "bar", baz: 1, bar: null },
    attributes: { "data-foo": '"bar"', id: '"wat"' },
    blockParams: ["a b c"]
  });

  assert.equal(
    invocation,
    `<Lol @foo={{bar}} @baz={{1}} @bar={{null}} data-foo="bar" id="wat" as |a b c|>World</Lol>`
  );
});
