import { PathReference, Tagged, TagWrapper, RevisionTag, DirtyableTag, Tag } from "@glimmer/reference";
import { RenderResult, RenderLayoutOptions, TemplateIterator, Environment } from "@glimmer/runtime";
import { Opaque, Dict, dict, expect } from "@glimmer/util";
import { NodeDOMTreeConstruction } from "@glimmer/node";
import { Option } from "@glimmer/interfaces";
import { UpdatableReference } from "@glimmer/object-reference";
import * as SimpleDOM from "simple-dom";

import { assign, equalTokens, normalizeInnerHTML } from "./helpers";
import LazyTestEnvironment from './environment/modes/lazy/environment';
import LazyRenderDelegate from "./environment/modes/lazy/render-delegate";
import {
  TestDynamicScope,
  equalsElement,
  classes,
  regex
} from "./environment";
import { UserHelper } from './environment/helper';
import { EmberishGlimmerComponent, EmberishCurlyComponent, BasicComponent } from './environment/components';
import RenderDelegate from './render-delegate';

export const OPEN: { marker: "open-block" } = { marker: "open-block" };
export const CLOSE: { marker: "close-block" } = { marker: "close-block" };
export const SEP: { marker: "sep" } = { marker: "sep" };
export const EMPTY: { marker: "empty" } = { marker: "empty" };
const GLIMMER_TEST_COMPONENT = "TestComponent";
const CURLY_TEST_COMPONENT = "test-component";

export type Content = string | typeof OPEN | typeof CLOSE | typeof SEP | typeof EMPTY;

export function skip(_target: Object, _name: string, descriptor: PropertyDescriptor) {
  descriptor.value["skip"] = true;
}

const COMMENT_NODE = 8; //  Node.COMMENT_NODE

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

export type ComponentKind = "Glimmer" | "Curly" | "Dynamic" | "Basic" | "Fragment";

export interface ComponentBlueprint {
  layout: string;
  tag?: string;
  inverse?: string;
  template?: string;
  name?: string;
  args?: Object;
  attributes?: Object;
  layoutAttributes?: Object;
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

type IndividualSnapshot = 'up' | 'down' | Node;
type NodesSnapshot = IndividualSnapshot[];

export class RenderTest {
  protected element: HTMLElement;
  protected assert = QUnit.assert;
  protected context: Dict<Opaque> = dict<Opaque>();
  protected renderResult: Option<RenderResult> = null;
  protected helpers = dict<UserHelper>();
  protected testType: ComponentKind;
  private snapshot: NodesSnapshot = [];

  constructor(protected delegate: RenderDelegate) {
    this.element = delegate.getInitialElement();
  }

  registerHelper(name: string, helper: UserHelper) {
    this.delegate.registerHelper(name, helper);
  }

  registerComponent<K extends ComponentKind>(type: K, name: string, layout: string, Class?: ComponentTypes[K]) {
    this.delegate.registerComponent(type, this.testType, name, layout, Class);
  }

  buildComponent(blueprint: ComponentBlueprint): string {
    let invocation = '';
    switch (this.testType) {
      case 'Glimmer':
        invocation = this.buildGlimmerComponent(blueprint);
        break;
      case 'Curly':
        invocation = this.buildCurlyComponent(blueprint);
        break;
      case 'Dynamic':
        invocation = this.buildDynamicComponent(blueprint);
        break;
      case 'Basic':
        invocation = this.buildBasicComponent(blueprint);
        break;
      case "Fragment":
        invocation = this.buildFragmentComponent(blueprint);
        break;

      default:
        throw new Error(`Invalid test type ${this.testType}`);
    }

    return invocation;
  }

  private buildArgs(args: Object): string {
    let { testType } = this;
    let sigil = "";
    let needsCurlies = false;

    if (testType === "Glimmer" || testType === "Basic" || testType === "Fragment") {
      sigil = "@";
      needsCurlies = true;
    }

    return `${Object.keys(args)
      .map(arg => {
        let rightSide: string;

        let value = args[arg];
        if (needsCurlies) {
          let isString = value && (value[0] === "'" || value[0] === '"');
          if (isString) {
            rightSide = `${value}`;
          } else {
            rightSide = `{{${value}}}`;
          }
        } else {
          rightSide = `${value}`;
        }

        return `${sigil}${arg}=${rightSide}`;
      })
      .join(" ")}`;
  }

  private buildBlockParams(blockParams: string[]): string {
    return `${blockParams.length > 0 ? ` as |${blockParams.join(" ")}|` : ""}`;
  }

  private buildInverse(inverse: string | undefined): string {
    return `${inverse ? `{{else}}${inverse}` : ''}`;
  }

  private buildAttributes(attrs: Object = {}): string {
    return Object.keys(attrs).map(attr => `${attr}=${attrs[attr]}`).join(" ");
  }

  private buildAngleBracketComponent(blueprint: ComponentBlueprint): string {
    let { args = {}, attributes = {}, template, name = GLIMMER_TEST_COMPONENT, blockParams = [] } = blueprint;

    let invocation: string | string[] = [];

    invocation.push(`<${name}`);

    let componetArgs = this.buildArgs(args);

    if (componetArgs !== "") {
      invocation.push(componetArgs);
    }

    let attrs = this.buildAttributes(attributes);
    if (attrs !== "") {
      invocation.push(attrs);
    }

    let open = invocation.join(" ");
    invocation = [open];

    if (template) {
      let block: string | string[] = [];
      let params = this.buildBlockParams(blockParams);
      if (params !== "") {
        block.push(params);
      }
      block.push(`>`);
      block.push(template);
      block.push(`</${name}>`);
      invocation.push(block.join(''));
    } else {
      invocation.push(" ");
      invocation.push(`/>`);
    }

    return invocation.join("");
  }

  private buildGlimmerComponent(blueprint: ComponentBlueprint): string {
    let { tag = "div", layout, name = GLIMMER_TEST_COMPONENT } = blueprint;
    let invocation = this.buildAngleBracketComponent(blueprint);
    let layoutAttrs = this.buildAttributes(blueprint.layoutAttributes);
    this.assert.ok(true, `generated glimmer layout as ${`<${tag} ${layoutAttrs} ...attributes>${layout}</${tag}>`}`);
    this.delegate.registerComponent("Glimmer", this.testType, name, `<${tag} ${layoutAttrs} ...attributes>${layout}</${tag}>`);
    this.assert.ok(true, `generated glimmer invocation as ${invocation}`);
    return invocation;
  }

  private buildCurlyBlockTemplate(
    name: string,
    template: string,
    blockParams: string[],
    inverse?: string
  ): string {
    let block: string[] = [];
    block.push(this.buildBlockParams(blockParams));
    block.push('}}');
    block.push(template);
    block.push(this.buildInverse(inverse));
    block.push(`{{/${name}}}`);
    return block.join('');
  }

  private buildCurlyComponent(blueprint: ComponentBlueprint): string {
    let { args = {}, layout, template, attributes, inverse, name = CURLY_TEST_COMPONENT, blockParams = [] } = blueprint;

    if (attributes) {
      throw new Error('Cannot pass attributes to curly components');
    }

    let invocation: string[] | string = [];

    if (template) {
      invocation.push(`{{#${name}`);
    } else {
      invocation.push(`{{${name}`);
    }

    let componentArgs = this.buildArgs(args);

    if (componentArgs !== "") {
      invocation.push(" ");
      invocation.push(componentArgs);
    }

    if (template) {
      invocation.push(
        this.buildCurlyBlockTemplate(name, template, blockParams, inverse)
      );
    } else {
      invocation.push('}}');
    }
    this.assert.ok(true, `generated curly layout as ${layout}`);
    this.delegate.registerComponent("Curly", this.testType, name, layout);
    invocation = invocation.join("");
    this.assert.ok(true, `generated curly invocation as ${invocation}`);
    return invocation;
  }

  private buildFragmentComponent(blueprint: ComponentBlueprint): string {
    let { layout, name = GLIMMER_TEST_COMPONENT } = blueprint;
    let invocation = this.buildAngleBracketComponent(blueprint);
    this.assert.ok(true, `generated fragment layout as ${layout}`);
    this.delegate.registerComponent("Basic", this.testType, name, `${layout}`);
    this.assert.ok(true, `generated fragment invocation as ${invocation}`);
    return invocation;
  }

  private buildBasicComponent(blueprint: ComponentBlueprint): string {
    let { tag = "div", layout, name = GLIMMER_TEST_COMPONENT } = blueprint;
    let invocation = this.buildAngleBracketComponent(blueprint);
    this.assert.ok(true, `generated basic layout as ${layout}`);
    this.delegate.registerComponent("Basic", this.testType, name, `<${tag} ...attributes>${layout}</${tag}>`);
    this.assert.ok(true, `generated basic invocation as ${invocation}`);
    return invocation;
  }

  private buildDynamicComponent(blueprint: ComponentBlueprint): string {
    let { args = {}, layout, template, attributes, inverse, name = GLIMMER_TEST_COMPONENT, blockParams = [] } = blueprint;

    if (attributes) {
      throw new Error('Cannot pass attributes to curly components');
    }

    let invocation: string | string[] = [];
    if (template) {
      invocation.push('{{#component componentName');
    } else {
      invocation.push('{{component componentName');
    }

    let componentArgs = this.buildArgs(args);

    if (componentArgs !== "") {
      invocation.push(" ");
      invocation.push(componentArgs);
    }

    if (template) {
      invocation.push(
        this.buildCurlyBlockTemplate(
          'component',
          template,
          blockParams,
          inverse
        )
      );
    } else {
      invocation.push('}}');
    }

    this.assert.ok(true, `generated dynamic layout as ${layout}`);
    this.delegate.registerComponent("Curly", this.testType, name, layout);
    invocation = invocation.join("");
    this.assert.ok(true, `generated dynamic invocation as ${invocation}`);

    return invocation;
  }

  shouldBeVoid(tagName: string) {
    this.element.innerHTML = "";
    let html = "<" + tagName + " data-foo='bar'><p>hello</p>";
    this.delegate.renderTemplate(html, this.context, this.element, () => this.takeSnapshot());

    let tag = '<' + tagName + ' data-foo="bar">';
    let closing = '</' + tagName + '>';
    let extra = '<p>hello</p>';
    html = normalizeInnerHTML(this.element.innerHTML);

    QUnit.assert.pushResult({
      result: html === tag + extra || html === tag + closing + extra,
      actual: html,
      expected: tag + closing + extra,
      message: tagName + ' should be a void element'
    });
  }

  render(template: string | ComponentBlueprint, properties: Dict<Opaque> = {}): void {
    if (typeof template === "object") {
      let blueprint = template as ComponentBlueprint;
      template = this.buildComponent(blueprint);

      if (this.testType === "Dynamic" && properties["componentName"] === undefined) {
        properties["componentName"] = blueprint.name || GLIMMER_TEST_COMPONENT;
      }
    }

    this.setProperties(properties);

    this.renderResult = this.delegate.renderTemplate(template, this.context, this.element, () => this.takeSnapshot());
  }

  rerender(properties: Dict<Opaque> = {}): void {
    this.setProperties(properties);

    let result = expect(this.renderResult, "the test should call render() before rerender()");

    result.env.begin();
    result.rerender();
    result.env.commit();
  }

  protected set(key: string, value: Opaque): void {
    this.context[key] = value;
  }

  protected setProperties(properties: Dict<Opaque>): void {
    Object.assign(this.context, properties);
  }

  protected takeSnapshot() {
    let snapshot: (Node | 'up' | 'down')[] = (this.snapshot = []);

    let node = this.element.firstChild;
    let upped = false;

    while (node && node !== this.element) {
      if (upped) {
        if (node.nextSibling) {
          node = node.nextSibling;
          upped = false;
        } else {
          snapshot.push('up');
          node = node.parentNode;
        }
      } else {
        if (!isServerMarker(node)) snapshot.push(node);

        if (node.firstChild) {
          snapshot.push('down');
          node = node.firstChild;
        } else if (node.nextSibling) {
          node = node.nextSibling;
        } else {
          snapshot.push('up');
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

  protected assertHTML(html: string, message?: string) {
    equalTokens(this.element, html, message ? `${html} (${message})` : html);
    this.takeSnapshot();
  }

  protected assertComponent(content: string, attrs: Object = {}) {
    let element = this.element.firstChild as HTMLDivElement;
    assertEmberishElement(element, "div", attrs, content);
    this.takeSnapshot();
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

    let { oldSnapshot, newSnapshot } = normalize(
      this.snapshot,
      this.takeSnapshot(),
      except
    );

    this.assert.deepEqual(oldSnapshot, newSnapshot, 'DOM nodes are stable');
  }
}

export const CLASSES = {
  Glimmer: EmberishGlimmerComponent,
  Curly: EmberishCurlyComponent,
  Dynamic: EmberishCurlyComponent,
  Basic: BasicComponent,
  Fragment: BasicComponent
};

export type ComponentTypes = typeof CLASSES;

export function registerComponent<K extends ComponentKind>(env: LazyTestEnvironment, type: K, name: string, layout: string, Class?: ComponentTypes[K]) {
  switch (type) {
    case "Glimmer":
      env.registerEmberishGlimmerComponent(name, Class as typeof EmberishGlimmerComponent, layout);
      break;
    case "Curly":
      env.registerEmberishCurlyComponent(name, Class as typeof EmberishCurlyComponent, layout);
      break;

    case "Dynamic":
      env.registerEmberishCurlyComponent(name, Class as typeof EmberishCurlyComponent, layout);
      break;
    case "Basic":
    case "Fragment":
      env.registerBasicComponent(name, Class as typeof BasicComponent, layout);
      break;
  }
}

export class RehydrationDelegate implements RenderDelegate {
  serialized: string;

  protected env: never;

  public clientEnv: LazyTestEnvironment;
  public serverEnv: LazyTestEnvironment;

  constructor() {
    this.clientEnv = new LazyTestEnvironment();

    let doc = new SimpleDOM.Document();

    this.serverEnv = new LazyTestEnvironment({
      document: doc,
      appendOperations: new NodeDOMTreeConstruction(doc)
    });
  }

  getInitialElement(): HTMLElement {
    return this.clientEnv.getAppendOperations().createElement('div') as HTMLElement;
  }

  renderServerSide(template: string, context: Dict<Opaque>, takeSnapshot: () => void): string {
    let env = this.serverEnv;
    let element = env.getAppendOperations().createElement("div") as HTMLDivElement;
    // Emulate server-side render
    renderTemplate(template, {
      env,
      self: new UpdatableReference(context),
      cursor: { element, nextSibling: null },
      dynamicScope: new TestDynamicScope(),
      mode: 'serialize'
    });

    takeSnapshot();
    return this.serialize(element);
  }

  serialize(element: HTMLElement) {
    let serializer = new SimpleDOM.HTMLSerializer(SimpleDOM.voidMap);
    let serialized = serializer.serializeChildren(element);
    return serialized;
  }

  renderClientSide(template: string, context: Dict<Opaque>, element: HTMLElement): RenderResult {
    let env = this.clientEnv;
    // Client-side rehydration
    return renderTemplate(template, {
      env,
      self: new UpdatableReference(context),
      cursor: { element, nextSibling: null },
      dynamicScope: new TestDynamicScope(),
      mode: 'rehydrate'
    });
  }

  renderTemplate(template: string, context: Dict<Opaque>, element: HTMLElement, snapshot: () => void): RenderResult {
    let serialized = this.renderServerSide(template, context, snapshot);
    element.innerHTML = serialized;
    return this.renderClientSide(template, context, element);
  }

  registerComponent(type: ComponentKind, name: string, layout: string): void {
    registerComponent(this.clientEnv, type, name, layout);
    registerComponent(this.serverEnv, type, name, layout);
  }

  registerHelper(name: string, helper: UserHelper): void {
    this.clientEnv.registerHelper(name, helper);
    this.serverEnv.registerHelper(name, helper);
  }
}

function normalize(
  oldSnapshot: NodesSnapshot,
  newSnapshot: NodesSnapshot,
  except: Array<Node>
) {
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

    if (this.snapshot[this.pos] === 'down') {
      do {
        this.nextNode();
      } while (this.depth !== skipUntil);
    }
  }

  private nextNode(): IndividualSnapshot {
    let token = this.snapshot[this.pos++];

    if (token === 'down') {
      this.depth++;
    } else if (token === 'up') {
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
  return (
    node.nodeType === COMMENT_NODE && node.nodeValue!.charAt(0) === '%'
  );
}

export interface ComponentTestMeta {
  kind?: "glimmer" | "curly" | "dynamic" | "basic" | "fragment";
  skip?: boolean | "glimmer" | "curly" | "dynamic" | "basic" | "fragment";
}

function setTestingDescriptor(descriptor: PropertyDescriptor): void {
  let testFunction = descriptor.value as Function;
  descriptor.enumerable = true;
  testFunction['isTest'] = true;
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

export interface RenderDelegateConstructor<Delegate extends RenderDelegate> {
  new(env?: Environment): Delegate;
}

export interface RenderTestConstructor<D extends RenderDelegate, T extends RenderTest> {
  new(delegate: D): T;
}

export function module<T extends RenderTest> (
  name: string,
  klass: RenderTestConstructor<RenderDelegate, T>,
  options = { componentModule: false }
): void {
  return rawModule(name, klass, LazyRenderDelegate, options);
}

export function rawModule<D extends RenderDelegate, T extends RenderTest> (
  name: string,
  klass: RenderTestConstructor<D, T>,
  Delegate: RenderDelegateConstructor<D>,
  options = { componentModule: false }
): void {
  if (options.componentModule) {
    if (shouldRunTest<D>(Delegate)) {
      componentModule(name, klass, Delegate);
    }
  } else {
    QUnit.module(`[NEW] ${name}`);

    for (let prop in klass.prototype) {
      const test = klass.prototype[prop];

      if (isTestFunction(test) && shouldRunTest<D>(Delegate)) {
        QUnit.test(prop, assert => test.call(new klass(new Delegate()), assert));
      }
    }
  }
}

interface ComponentTests {
  glimmer: Function[];
  curly: Function[];
  dynamic: Function[];
  basic: Function[];
  fragment: Function[];
}

function componentModule<D extends RenderDelegate, T extends RenderTest>(name: string, klass: RenderTestConstructor<D, T>, Delegate: RenderDelegateConstructor<D>) {
  let tests: ComponentTests = {
    glimmer: [],
    curly: [],
    dynamic: [],
    basic: [],
    fragment: []
  };

  function createTest(prop: string, test: any, skip?: boolean) {
    let shouldSkip: boolean;
    if (skip === true || test.skip === true) {
      shouldSkip = true;
    }
    return (type: ComponentKind, klass: RenderTestConstructor<D, T>) => {
      let instance = new klass(new Delegate());
      instance['testType'] = type;
      if (!shouldSkip) {
        QUnit.test(`${type.toLowerCase()}: ${prop}`, assert =>
          test.call(instance, assert)
        );
      }
    };
  }

  for (let prop in klass.prototype) {
    const test = klass.prototype[prop];
    if (isTestFunction(test)) {
      if (test['kind'] === undefined) {
        let skip = test['skip'];
        switch (skip) {
          case 'glimmer':
            tests.curly.push(createTest(prop, test));
            tests.dynamic.push(createTest(prop, test));
            tests.glimmer.push(createTest(prop, test, true));
            break;
          case 'curly':
            tests.glimmer.push(createTest(prop, test));
            tests.dynamic.push(createTest(prop, test));
            tests.curly.push(createTest(prop, test, true));
            break;
          case 'dynamic':
            tests.glimmer.push(createTest(prop, test));
            tests.curly.push(createTest(prop, test));
            tests.dynamic.push(createTest(prop, test, true));
            break;
          case true:
            if (test["kind"] === "basic") {
              // Basic components are not part of matrix testing
              tests.basic.push(createTest(prop, test, true));
            } else if (test["kind"] === "fragment") {
              tests.fragment.push(createTest(prop, test, true));
            } else {
              ["glimmer", "curly", "dynamic"].forEach(kind => {
                tests[kind].push(createTest(prop, test, true));
              });
            }
          default:
            tests.glimmer.push(createTest(prop, test));
            tests.curly.push(createTest(prop, test));
            tests.dynamic.push(createTest(prop, test));
        }
        continue;
      }

      let kind = test['kind'];

      if (kind === 'curly') {
        tests.curly.push(createTest(prop, test));
        tests.dynamic.push(createTest(prop, test));
      }

      if (kind === 'glimmer') {
        tests.glimmer.push(createTest(prop, test));
      }

      if (kind === 'dynamic') {
        tests.curly.push(createTest(prop, test));
        tests.dynamic.push(createTest(prop, test));
      }

      if (kind === 'basic') {
        tests.basic.push(createTest(prop, test));
      }

      if (kind === "fragment") {
        tests.fragment.push(createTest(prop, test));
      }
    }
  }
  QUnit.module(`[NEW] ${name}`, () => {
    nestedComponentModules(klass, tests);
  });
}

function nestedComponentModules(
  klass: typeof RenderTest & Function,
  tests: ComponentTests
): void {
  Object.keys(tests).forEach(type => {
    let formattedType = `${type[0].toUpperCase() + type.slice(1)}`;
    QUnit.module(`${formattedType}`, () => {
      tests[
        type
      ].forEach(
        (
          t: (type: string, klass: typeof RenderTest & Function) => void
        ) => t(formattedType, klass)
      );
    });
  });
}

function isTestFunction(
  value: any
): value is (this: RenderTest, assert: typeof QUnit.assert) => void {
  return typeof value === 'function' && value.isTest;
}

export function renderTemplate(template: string, options: RenderLayoutOptions & { env: LazyTestEnvironment }) {
  let { env } = options;

  let iterator = env.compile(template).renderLayout(options);
  return renderSync(env, iterator);
}

export function renderSync(env: Environment, iterator: TemplateIterator) {
  env.begin();

  let iteratorResult: IteratorResult<RenderResult>;

  do {
    iteratorResult = iterator.next() as IteratorResult<RenderResult>;
  } while (!iteratorResult.done);

  let result = iteratorResult.value;

  env.commit();

  return result;
}

export function content(list: Content[]): string {
  let out: string[] = [];
  let depth = 0;

  list.forEach(item => {
    if (typeof item === 'string') {
      out.push(item);
    } else if (item.marker === 'open-block') {
      out.push(`<!--%+block:${depth++}%-->`);
    } else if (item.marker === 'close-block') {
      out.push(`<!--%-block:${--depth}%-->`);
    } else {
      out.push(`<!--%${item.marker}%-->`);
    }
  });

  return out.join('');
}

function assertEmberishElement(
  element: HTMLElement,
  tagName: string,
  attrs: Object,
  contents: string
): void;
function assertEmberishElement(
  element: HTMLElement,
  tagName: string,
  attrs: Object
): void;
function assertEmberishElement(
  element: HTMLElement,
  tagName: string,
  contents: string
): void;
function assertEmberishElement(element: HTMLElement, tagName: string): void;
function assertEmberishElement(...args: any[]): void {
  let element = args[0];
  let tagName, attrs, contents;

  if (args.length === 3) {
    if (typeof args[1] === 'string')
      [tagName, attrs, contents] = [args[1], {}, args[2]];
    else [tagName, attrs, contents] = [args[1], args[2], null];
  } else if (args.length === 2) {
    [tagName, attrs, contents] = [args[1], {}, null];
  } else {
    [element, tagName, attrs, contents] = args;
  }

  let fullAttrs = assign(
    { class: classes('ember-view'), id: regex(/^ember\d*$/) },
    attrs
  );

  equalsElement(element, tagName, fullAttrs, contents);
}

const HAS_TYPED_ARRAYS = (() => {
  try {
    if (typeof Uint16Array === 'undefined') return false;
    let arr = new Uint16Array([1]);
    arr.slice(0, 1);
    return true;
  } catch (e) {
    return false;
  }
})();

function shouldRunTest<T extends RenderDelegate>(Delegate: RenderDelegateConstructor<T>) {
  let isEagerDelegate = Delegate['isEager'];

  if (HAS_TYPED_ARRAYS) {
    return true;
  }

  if (!HAS_TYPED_ARRAYS && !isEagerDelegate) {
    return true;
  }

  return false;
}
