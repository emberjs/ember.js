import { RenderTests } from "../lib/abstract-test-case";

QUnit.module("Render Tests: I-N-U-R");

QUnit.test("Can set properties", assert => {
  new class extends RenderTests {
    constructor() {
      super();
      this.setProperties({ foo: "bar" });
      assert.equal(this.context.foo, "bar");
    }
  }();
});

QUnit.test("Can take basic snapshots", assert => {
  let div = document.createElement("div");
  let text = document.createTextNode("Foo");
  div.appendChild(text);

  new class extends RenderTests {
    element = div;
    constructor() {
      super();
      let snapShot = this.takeSnapshot();
      assert.deepEqual(snapShot, [text, "up"]);
    }
  }();
});

QUnit.test("Can take nested snapshots", assert => {
  let div = document.createElement("div");
  let p = document.createElement("p");
  let text = document.createTextNode("Foo");
  p.appendChild(text);
  div.appendChild(p);

  new class extends RenderTests {
    element = div;
    constructor() {
      super();
      let snapShot = this.takeSnapshot();
      assert.deepEqual(snapShot, [p, "down", text, "up", "up"]);
    }
  }();
});

QUnit.test("Can take nested snapshots of serialized blocks", assert => {
  let div = document.createElement("div");
  let open = document.createComment("<!--%+block:0%-->");
  let text = document.createTextNode("Foo");
  let close = document.createComment("<!--%-block:0%-->");
  div.appendChild(open);
  div.appendChild(text);
  div.appendChild(close);

  new class extends RenderTests {
    element = div;
    constructor() {
      super();
      let snapShot = this.takeSnapshot();
      assert.deepEqual(snapShot, [open, text, close, "up"]);
    }
  }();
});
