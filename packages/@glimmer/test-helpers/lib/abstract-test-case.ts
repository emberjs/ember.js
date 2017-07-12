import { TagWrapper } from "../../reference/lib/validators";
import { PathReference, Tagged, RevisionTag, DirtyableTag, Tag } from "@glimmer/reference";
import { Template, RenderResult, RenderOptions } from "@glimmer/runtime";
import { TestEnvironment, UserHelper } from "./environment";
import { Opaque, dict, expect } from "@glimmer/util";
import { assign, equalTokens, normalizeInnerHTML } from "./helpers";
import { Option, Dict } from "@glimmer/interfaces";
import { UpdatableReference } from "@glimmer/object-reference";
import {
  TestDynamicScope,
  EmberishGlimmerComponent,
  EmberishCurlyComponent,
  equalsElement,
  classes,
  regex,
  BasicComponent
} from "../lib/environment";
import { NodeDOMTreeConstruction } from "@glimmer/node";
import * as SimpleDOM from "simple-dom";

export const OPEN: { marker: "open-block" } = { marker: "open-block" };
export const CLOSE: { marker: "close-block" } = { marker: "close-block" };
export const SEP: { marker: "sep" } = { marker: "sep" };
export const EMPTY: { marker: "empty" } = { marker: "empty" };
const TEST_COMPONENT = "test-component";

export type Content = string | typeof OPEN | typeof CLOSE | typeof SEP | typeof EMPTY;

export function skip(_target: Object, _name: string, descriptor: PropertyDescriptor) {
  descriptor.value["skip"] = true;
}

export class VersionedObject implements Tagged {
  public tag: TagWrapper<DirtyableTag>;
  public value: Object;

  constructor(value: Object) {
    this.tag = DirtyableTag.create();
    assign(this, value);
  }

  update(value: Object) {
    assign(this, value);
    this.dirty();
  }

  set(key: string, value: Opaque) {
    this[key] = value;
    this.dirty();
  }

  dirty() {
    this.tag.inner.dirty();
  }
}

export type ComponentKind = "Glimmer" | "Curly" | "Dynamic" | "Basic";

export interface ComponentBlueprint {
  layout: string;
  tag?: string;
  inverse?: string;
  template?: string;
  name?: string;
  args?: Object;
  attributes?: Object;
  blockParams?: string[];
}

export class SimpleRootReference implements PathReference<Opaque> {
  public tag: TagWrapper<RevisionTag>;

  constructor(private object: VersionedObject) {
    this.tag = object.tag;
  }

  get(key: string): PathReference<Opaque> {
    return new SimplePathReference(this, key);
  }

  value(): Object {
    return this.object;
  }
}

class SimplePathReference implements PathReference<Opaque> {
  public tag: Tag;

  constructor(private parent: PathReference<Opaque>, private key: string) {
    this.tag = parent.tag;
  }

  get(key: string): SimplePathReference {
    return new SimplePathReference(this, key);
  }

  value(): Opaque {
    let parentValue = this.parent.value();
    return parentValue && parentValue[this.key];
  }
}

type IndividualSnapshot = "up" | "down" | Node;
type NodesSnapshot = IndividualSnapshot[];

export abstract class AbstractRenderTest {
  protected abstract element: HTMLElement;
  protected rawTemplate: string;
  protected serialized: string;
  protected assert = QUnit.assert;
  protected context = dict<Opaque>();
  protected renderResult: Option<RenderResult> = null;
  private snapshot: NodesSnapshot = [];
  private helpers = {};
  public testType: ComponentKind;

  constructor(protected env = new TestEnvironment()) {}

  registerHelper(name: string, helper: UserHelper) {
    this.helpers[name] = helper;
  }

  registerComponent(type: ComponentKind = this.testType, name: string, layout: string) {
    switch (type) {
      case "Glimmer":
        this.env.registerEmberishGlimmerComponent(name, EmberishGlimmerComponent, layout);
        break;
      case "Curly":
        this.env.registerEmberishCurlyComponent(name, EmberishCurlyComponent, layout);
        break;

      case "Dynamic":
        this.env.registerEmberishCurlyComponent(name, EmberishCurlyComponent, layout);
        break;
      case "Basic":
        this.env.registerBasicComponent(name, BasicComponent, layout);
        break;
    }
  }

  populateHelpers() {
    Object.keys(this.helpers).forEach(name => this.env.registerHelper(name, this.helpers[name]));
  }

  buildComponent(blueprint: ComponentBlueprint): string {
    let invocation = "";

    switch (this.testType) {
      case "Glimmer":
        invocation = this.buildGlimmerComponent(blueprint);
        break;
      case "Curly":
        invocation = this.buildCurlyComponent(blueprint);
        break;
      case "Dynamic":
        invocation = this.buildDynamicComponent(blueprint);
        break;
      case "Basic":
        invocation = this.buildBasicComponent(blueprint);
        break;
    }

    return invocation;
  }

  private buildArgs(args: Object, sigil = ""): string {
    return `${Object.keys(args).map(arg => `${sigil}${arg}=${args[arg]}`).join(" ")}`;
  }

  private buildBlockParams(blockParams: string[]): string {
    return `${blockParams.length > 0 ? `as |${blockParams.join(" ")}|` : ""}`;
  }

  private buildInverse(inverse: string): string {
    return `${inverse ? `{{else}}${inverse}` : ""}`;
  }

  private buildAttributes(attrs: Object): string {
    return Object.keys(attrs).map(attr => `${attr}=${attrs[attr]}`).join(" ");
  }

  private angleBracketComponent(blueprint: ComponentBlueprint): string {
    let { args = {}, attributes = {}, template, inverse, name = TEST_COMPONENT, blockParams = [] } = blueprint;
    let componentArgs = this.buildArgs(args, "@");
    let componentBlockParams = this.buildBlockParams(blockParams);
    let inv = this.buildInverse(inverse!);
    let attrs = this.buildAttributes(attributes);
    let invocation = `<${name} ${componentArgs} ${attrs} ${componentBlockParams} ${template
      ? `>${template}${inv}</${name}>`
      : "/>"}`;
    return invocation;
  }
  private buildGlimmerComponent(blueprint: ComponentBlueprint): string {
    let { tag = "div", layout, name = TEST_COMPONENT } = blueprint;
    let invocation = this.angleBracketComponent(blueprint);
    this.registerComponent("Glimmer", name, `<${tag}>${layout}</${tag}>`);
    this.assert.ok(true, `generated glimmer invocation as ${invocation}`);
    return invocation;
  }

  private buildCurlyComponent(blueprint: ComponentBlueprint): string {
    let { args = {}, layout, template, attributes, inverse, name = TEST_COMPONENT, blockParams = [] } = blueprint;

    if (attributes) {
      throw new Error("Cannot pass attributes to curly components");
    }

    let componentArgs = this.buildArgs(args);
    let componentBlockParams = this.buildBlockParams(blockParams);
    let inv = this.buildInverse(inverse!);
    let invocation = `${template ? "{{#" : "{{"}${name} ${componentArgs} ${componentBlockParams}}}${template
      ? `${template}`
      : ""}${inv}${template ? `{{/${name}}}` : "}}"}`;
    this.registerComponent("Curly", name, layout);

    this.assert.ok(true, `generated curly invocation as ${invocation}`);
    return invocation;
  }

  private buildBasicComponent(blueprint: ComponentBlueprint): string {
    let { tag = "div", layout, name = TEST_COMPONENT } = blueprint;
    let invocation = this.angleBracketComponent(blueprint);
    this.registerComponent("Basic", name, `<${tag}>${layout}</${tag}>`);
    this.assert.ok(true, `generated basic invocation as ${invocation}`);
    return invocation;
  }

  private buildDynamicComponent(blueprint: ComponentBlueprint): string {
    let { args = {}, layout, template, attributes, inverse, name = TEST_COMPONENT, blockParams = [] } = blueprint;

    if (attributes) {
      throw new Error("Cannot pass attributes to curly components");
    }

    let componentArgs = this.buildArgs(args);
    let componentBlockParams = this.buildBlockParams(blockParams);
    let inv = this.buildInverse(inverse!);
    let invocation = `${template
      ? "{{#"
      : "{{"}component componentName ${componentArgs} ${componentBlockParams}}}${template
      ? `${template}`
      : ""}${inv}${template ? `{{/component}}` : "}}"}`;
    this.registerComponent("Curly", name, layout);

    this.assert.ok(true, `generated dynamic invocation as ${invocation}`);

    return invocation;
  }

  shouldBeVoid(tagName: string) {
    this.element.innerHTML = "";
    let html = "<" + tagName + " data-foo='bar'><p>hello</p>";
    let template = this.compile(html);
    this.renderTemplate(template);

    let tag = "<" + tagName + ' data-foo="bar">';
    let closing = "</" + tagName + ">";
    let extra = "<p>hello</p>";
    html = normalizeInnerHTML(this.element.innerHTML);

    QUnit.assert.pushResult({
      result: html === tag + extra || html === tag + closing + extra,
      actual: html,
      expected: tag + closing + extra,
      message: tagName + " should be a void element"
    });
  }

  protected compile(template: string): Template<Opaque> {
    this.rawTemplate = template;
    return this.env.compile(template);
  }

  render(template: string | ComponentBlueprint, properties: Dict<Opaque> = {}): void {
    if (typeof template === "object") {
      let blueprint = template as ComponentBlueprint;
      template = this.buildComponent(blueprint);

      if (this.testType === "Dynamic" && properties["componentName"] === undefined) {
        properties["componentName"] = blueprint.name || TEST_COMPONENT;
      }
    }

    this.setProperties(properties);

    this.renderResult = this.renderTemplate(this.compile(template));
  }

  protected abstract renderTemplate(template: Template<Opaque>): RenderResult;

  rerender(properties: Dict<Opaque> = {}): void {
    this.setProperties(properties);

    this.env.begin();
    expect(this.renderResult, "the test should call render() before rerender()").rerender();
    this.env.commit();
  }

  protected set(key: string, value: Opaque): void {
    this.context[key] = value;
  }

  protected setProperties(properties: Dict<Opaque>): void {
    Object.assign(this.context, properties);
  }

  protected takeSnapshot() {
    let snapshot: (Node | "up" | "down")[] = (this.snapshot = []);

    let node = this.element.firstChild;
    let upped = false;

    while (node && node !== this.element) {
      if (upped) {
        if (node.nextSibling) {
          node = node.nextSibling;
          upped = false;
        } else {
          snapshot.push("up");
          node = node.parentNode;
        }
      } else {
        if (!isServerMarker(node)) snapshot.push(node);

        if (node.firstChild) {
          snapshot.push("down");
          node = node.firstChild;
        } else if (node.nextSibling) {
          node = node.nextSibling;
        } else {
          snapshot.push("up");
          node = node.parentNode;
          upped = true;
        }
      }
    }

    return snapshot;
  }

  protected assertStableRerender() {
    this.takeSnapshot();
    this.runTask(() => this.rerender());
    this.assertStableNodes();
  }

  protected assertHTML(html: string) {
    equalTokens(this.element, html);
  }

  protected assertComponent(content: string, attrs: Object) {
    let element = this.element.firstChild as HTMLDivElement;
    assertEmberishElement(element, "div", attrs, content);
  }

  private runTask<T>(callback: () => T): T {
    return callback();
  }

  protected assertStableNodes(
    { except: _except }: { except: Array<Node> | Node | Node[] } = {
      except: []
    }
  ) {
    let except: Array<Node>;

    if (Array.isArray(_except)) {
      except = uniq(_except);
    } else {
      except = [_except];
    }

    let { oldSnapshot, newSnapshot } = normalize(this.snapshot, this.takeSnapshot(), except);

    this.assert.deepEqual(oldSnapshot, newSnapshot, "DOM nodes are stable");
  }
}

export class RenderTests extends AbstractRenderTest {
  protected element: HTMLDivElement;
  protected template: Option<Template<Opaque>>;
  constructor(env: TestEnvironment) {
    super(env);
    this.element = this.env.getAppendOperations().createElement("div") as HTMLDivElement;
  }
  renderTemplate(template: Template<Opaque>): RenderResult {
    this.populateHelpers();
    return renderTemplate(this.env, template, {
      self: new UpdatableReference(this.context),
      parentNode: this.element,
      dynamicScope: new TestDynamicScope()
    });
  }
}

export class RehydrationTests extends RenderTests {
  serialized: string;
  setupServer(template: string = this.rawTemplate) {
    let doc = new SimpleDOM.Document();
    let env = new TestEnvironment({
      document: doc,
      appendOperations: new NodeDOMTreeConstruction(doc)
    });
    this.setup({ template, env });
  }

  setupClient(template: string = this.rawTemplate) {
    let env = new TestEnvironment();
    let div = document.createElement("div");

    expect(this.serialized, "Should have serialized HTML from `this.renderServerSide()`");

    div.innerHTML = this.serialized;
    this.element = div;
    this.setup({ template, env });
  }

  setup({ template, context, env }: { template: string; context?: Dict<Opaque>; env?: TestEnvironment }) {
    if (env) this.env = env;
    this.template = this.compile(template);
    if (context) this.setProperties(context);
  }

  assertServerOutput(..._expected: Content[]) {
    let serialized = this.serialize();
    equalTokens(serialized, content([OPEN, ..._expected, CLOSE]));
    this.serialized = serialized;
  }

  renderServerSide(context?: Dict<Opaque>): void {
    if (context) {
      this.context = context;
    }
    this.setupServer();
    this.populateHelpers();
    this.element = this.env.getAppendOperations().createElement("div") as HTMLDivElement;
    let template = expect(this.template, "Must set up a template before calling renderServerSide");
    // Emulate server-side render
    renderTemplate(this.env, template, {
      self: new UpdatableReference(this.context),
      parentNode: this.element,
      dynamicScope: new TestDynamicScope(),
      mode: "serialize"
    });

    this.takeSnapshot();
    this.serialized = this.serialize();
  }

  serialize() {
    let serializer = new SimpleDOM.HTMLSerializer(SimpleDOM.voidMap);
    let serialized = serializer.serializeChildren(this.element);
    return serialized;
  }

  renderClientSide(context?: Dict<Opaque>) {
    if (context) {
      this.context = context;
    }
    this.setupClient();
    this.populateHelpers();
    let { env } = this;
    this.template = this.compile(this.rawTemplate);
    this.element = env.getAppendOperations().createElement("div") as HTMLDivElement;
    let template = expect(this.template, "Must set up a template before calling renderClientSide");
    // Client-side rehydration
    this.renderResult = renderTemplate(env, template, {
      self: new UpdatableReference(this.context),
      parentNode: this.element,
      dynamicScope: new TestDynamicScope(),
      mode: "rehydrate"
    });
  }

  renderTemplate(template: Template<Opaque>): RenderResult {
    this.template = template;
    this.renderServerSide();
    this.renderClientSide();
    return this.renderResult!;
  }
}

function normalize(oldSnapshot: NodesSnapshot, newSnapshot: NodesSnapshot, except: Array<Node>) {
  let oldIterator = new SnapshotIterator(oldSnapshot);
  let newIterator = new SnapshotIterator(newSnapshot);

  let normalizedOld = [];
  let normalizedNew = [];

  while (true) {
    let nextOld = oldIterator.peek();
    let nextNew = newIterator.peek();

    if (nextOld === null && newIterator.peek() === null) break;

    if (
      (nextOld instanceof Node && except.indexOf(nextOld) > -1) ||
      (nextNew instanceof Node && except.indexOf(nextNew) > -1)
    ) {
      oldIterator.skip();
      newIterator.skip();
    } else {
      normalizedOld.push(oldIterator.next());
      normalizedNew.push(newIterator.next());
    }
  }

  return { oldSnapshot: normalizedOld, newSnapshot: normalizedNew };
}

class SnapshotIterator {
  private depth = 0;
  private pos = 0;

  constructor(private snapshot: NodesSnapshot) {}

  peek(): Option<IndividualSnapshot> {
    if (this.pos >= this.snapshot.length) return null;
    return this.snapshot[this.pos];
  }

  next(): Option<IndividualSnapshot> {
    if (this.pos >= this.snapshot.length) return null;
    return this.nextNode() || null;
  }

  skip(): void {
    let skipUntil = this.depth;
    this.nextNode();

    if (this.snapshot[this.pos] === "down") {
      do {
        this.nextNode();
      } while (this.depth !== skipUntil);
    }
  }

  private nextNode(): IndividualSnapshot {
    let token = this.snapshot[this.pos++];

    if (token === "down") {
      this.depth++;
    } else if (token === "up") {
      this.depth--;
    }

    return token;
  }
}

function uniq(arr: any[]) {
  return arr.reduce((accum, val) => {
    if (accum.indexOf(val) === -1) accum.push(val);
    return accum;
  }, []);
}

function isServerMarker(node: Node) {
  return node.nodeType === Node.COMMENT_NODE && node.nodeValue!.charAt(0) === "%";
}

export interface ComponentTestMeta {
  kind?: "glimmer" | "curly" | "dynamic" | "basic";
  skip?: boolean | "glimmer" | "curly" | "dynamic" | "basic";
}

function setTestingDescriptor(descriptor: PropertyDescriptor): void {
  let testFunction = descriptor.value as Function;
  descriptor.enumerable = true;
  testFunction["isTest"] = true;
}

export function test(meta: ComponentTestMeta): MethodDecorator;
export function test(
  _target: Object | ComponentTestMeta,
  _name?: string,
  descriptor?: PropertyDescriptor
): PropertyDescriptor | void;
export function test(...args: any[]) {
  if (args.length === 1) {
    let meta: ComponentTestMeta = args[0];
    return (_target: Object, _name: string, descriptor: PropertyDescriptor) => {
      let testFunction = descriptor.value as Function;
      Object.keys(meta).forEach(key => (testFunction[key] = meta[key]));
      setTestingDescriptor(descriptor);
    };
  }

  let descriptor = args[2];
  setTestingDescriptor(descriptor);
  return descriptor;
}

export function module(
  name: string,
  klass: typeof AbstractRenderTest & Function,
  options = { componentModule: false }
): void {
  if (options.componentModule) {
    componentModule(name, klass);
  } else {
    QUnit.module(`[NEW] ${name}`);

    for (let prop in klass.prototype) {
      const test = klass.prototype[prop];

      if (isTestFunction(test)) {
        QUnit.test(prop, assert => test.call(new klass(), assert));
      }
    }
  }
}

interface ComponentTests {
  glimmer: Function[];
  curly: Function[];
  dynamic: Function[];
  basic: Function[];
}

function componentModule(name: string, klass: typeof AbstractRenderTest & Function) {
  let tests: ComponentTests = {
    glimmer: [],
    curly: [],
    dynamic: [],
    basic: []
  };

  function createTest(prop: string, test: any, skip = false) {
    return (type: ComponentKind, klass: typeof AbstractRenderTest & Function) => {
      let instance = new klass();
      instance.testType = type;
      if (skip) {
        QUnit.skip(`${type.toLowerCase()}: ${prop}`, assert => test.call(instance, assert));
      } else {
        QUnit.test(`${type.toLowerCase()}: ${prop}`, assert => test.call(instance, assert));
      }
    };
  }

  for (let prop in klass.prototype) {
    const test = klass.prototype[prop];
    if (isTestFunction(test)) {
      if (test["kind"] === undefined) {
        let skip = test["skip"];
        switch (skip) {
          case "glimmer":
            tests.curly.push(createTest(prop, test));
            tests.dynamic.push(createTest(prop, test));
            tests.glimmer.push(createTest(prop, test));
            break;
          case "curly":
            tests.glimmer.push(createTest(prop, test));
            tests.dynamic.push(createTest(prop, test));
            tests.curly.push(createTest(prop, test, true));
            break;
          case "dynamic":
            tests.glimmer.push(createTest(prop, test));
            tests.curly.push(createTest(prop, test));
            tests.dynamic.push(createTest(prop, test, true));
            break;
          default:
            tests.glimmer.push(createTest(prop, test));
            tests.curly.push(createTest(prop, test));
            tests.dynamic.push(createTest(prop, test));
        }
        continue;
      }

      let kind = test["kind"];

      if (kind === "curly") {
        tests.curly.push(createTest(prop, test));
      }

      if (kind === "glimmer") {
        tests.glimmer.push(createTest(prop, test));
      }

      if (kind === "dynamic") {
        tests.dynamic.push(createTest(prop, test));
      }

      if (kind === "basic") {
        tests.basic.push(createTest(prop, test));
      }
    }
  }
  QUnit.module(`[NEW] ${name}`, () => {
    nestedComponentModules(klass, tests);
  });
}

function nestedComponentModules(klass: typeof AbstractRenderTest & Function, tests: ComponentTests): void {
  Object.keys(tests).forEach(type => {
    let formattedType = `${type[0].toUpperCase() + type.slice(1)}`;
    QUnit.module(`${formattedType}`, () => {
      tests[type].forEach((t: (type: string, klass: typeof AbstractRenderTest & Function) => void) =>
        t(formattedType, klass)
      );
    });
  });
}

function isTestFunction(value: any): value is (this: AbstractRenderTest, assert: typeof QUnit.assert) => void {
  return typeof value === "function" && value.isTest;
}

export function renderTemplate(env: TestEnvironment, template: Template<Opaque>, options: RenderOptions) {
  env.begin();

  let templateIterator = template.render(options);

  let iteratorResult: IteratorResult<RenderResult>;

  do {
    iteratorResult = templateIterator.next() as IteratorResult<RenderResult>;
  } while (!iteratorResult.done);

  let result = iteratorResult.value;

  env.commit();

  return result;
}

function content(list: Content[]): string {
  let out: string[] = [];
  let depth = 0;

  list.forEach(item => {
    if (typeof item === "string") {
      out.push(item);
    } else if (item.marker === "open-block") {
      out.push(`<!--%+block:${depth++}%-->`);
    } else if (item.marker === "close-block") {
      out.push(`<!--%-block:${--depth}%-->`);
    } else {
      out.push(`<!--%${item.marker}%-->`);
    }
  });

  return out.join("");
}

function assertEmberishElement(element: HTMLElement, tagName: string, attrs: Object, contents: string): void;
function assertEmberishElement(element: HTMLElement, tagName: string, attrs: Object): void;
function assertEmberishElement(element: HTMLElement, tagName: string, contents: string): void;
function assertEmberishElement(element: HTMLElement, tagName: string): void;
function assertEmberishElement(...args: any[]): void {
  let element = args[0];
  let tagName, attrs, contents;

  if (args.length === 3) {
    if (typeof args[1] === "string") [tagName, attrs, contents] = [args[1], {}, args[2]];
    else [tagName, attrs, contents] = [args[1], args[2], null];
  } else if (args.length === 2) {
    [tagName, attrs, contents] = [args[1], {}, null];
  } else {
    [element, tagName, attrs, contents] = args;
  }

  let fullAttrs = assign({ class: classes("ember-view"), id: regex(/^ember\d*$/) }, attrs);

  equalsElement(element, tagName, fullAttrs, contents);
}
