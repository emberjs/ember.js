import {
  Cursor,
  Dict,
  Environment,
  Maybe,
  Option,
  RenderResult,
  ElementBuilder,
} from '@glimmer/interfaces';
import { serializeBuilder } from '@glimmer/node';
import { UpdatableReference } from '@glimmer/object-reference';
import {
  bump,
  DirtyableTag,
  PathReference,
  RevisionTag,
  Tag,
  Tagged,
  TagWrapper,
} from '@glimmer/reference';
import { UNDEFINED_REFERENCE } from '@glimmer/runtime';
import { clearElement, dict, expect, keys, assign } from '@glimmer/util';
import createHTMLDocument from '@simple-dom/document';
import { SimpleElement, SimpleNode, SimpleDocument, NodeType } from '@simple-dom/interface';
import { assertElement, replaceHTML, toInnerHTML } from './dom';
import { classes, equalsElement, regex } from './environment';
import { UserHelper } from './environment/helper';
import { qunitFixture } from './environment/modes/lazy/fixture';
import LazyRenderDelegate, { JitDelegateContext } from './environment/modes/lazy/render-delegate';
import {
  debugRehydration,
  DebugRehydrationBuilder,
} from './environment/modes/rehydration/debug-builder';
import { TestModifierConstructor } from './environment/modifier';
import { equalTokens, normalizeInnerHTML } from './helpers';
import { ComponentKind, ComponentTypes } from './interfaces';
import { registerComponent, renderTemplate, JitTestDelegateContext } from './render';
import RenderDelegate from './render-delegate';
import LazyRuntimeResolver, { JitRegistry } from './environment/modes/lazy/runtime-resolver';
import { registerHelper, registerModifier } from './environment/modes/lazy/register';

export const OPEN: { marker: 'open-block' } = { marker: 'open-block' };
export const CLOSE: { marker: 'close-block' } = { marker: 'close-block' };
export const SEP: { marker: '|' } = { marker: '|' };
export const EMPTY: { marker: ' ' } = { marker: ' ' };
export const GLIMMER_TEST_COMPONENT = 'TestComponent';
const CURLY_TEST_COMPONENT = 'test-component';

export type Content = string | typeof OPEN | typeof CLOSE | typeof SEP | typeof EMPTY;

export function skip(_target: Object, _name: string, descriptor: PropertyDescriptor) {
  descriptor.value['skip'] = true;
}

export class VersionedObject implements Tagged {
  [key: string]: unknown;

  public tag: TagWrapper<DirtyableTag>;
  public value!: Object;

  constructor(value: Object) {
    this.tag = DirtyableTag.create();
    assign(this, value);
  }

  update(value: Object) {
    assign(this, value);
    this.dirty();
  }

  set(key: string, value: unknown) {
    this[key] = value;
    this.dirty();
  }

  dirty() {
    this.tag.inner.dirty();
  }
}

// TODO: Consolidate
export type DeclaredComponentKind = 'glimmer' | 'curly' | 'dynamic' | 'basic' | 'fragment';

export interface ComponentBlueprint {
  layout: string;
  tag?: string;
  else?: string;
  template?: string;
  name?: string;
  args?: Object;
  attributes?: Object;
  layoutAttributes?: Object;
  blockParams?: string[];
}

export class SimpleRootReference implements PathReference<unknown> {
  public tag: TagWrapper<RevisionTag>;

  constructor(private object: VersionedObject) {
    this.tag = object.tag;
  }

  get(key: string): PathReference<unknown> {
    return new SimplePathReference(this, key);
  }

  value(): Object {
    return this.object;
  }
}

class SimplePathReference implements PathReference<unknown> {
  public tag: Tag;

  constructor(private parent: PathReference<unknown>, private key: string) {
    this.tag = parent.tag;
  }

  get(key: string): SimplePathReference {
    return new SimplePathReference(this, key);
  }

  value(): unknown {
    let parentValue = this.parent.value() as Maybe<Dict>;
    if (parentValue === null || parentValue === undefined) {
      return UNDEFINED_REFERENCE;
    } else {
      return parentValue && parentValue[this.key];
    }
  }
}

export type IndividualSnapshot = 'up' | 'down' | SimpleNode;
export type NodesSnapshot = IndividualSnapshot[];

export function snapshotIsNode(snapshot: IndividualSnapshot): snapshot is SimpleNode {
  return snapshot !== 'up' && snapshot !== 'down';
}

export class Count {
  private expected = dict<number>();
  private actual = dict<number>();

  expect(name: string, count = 1) {
    this.expected[name] = count;
    this.actual[name] = (this.actual[name] || 0) + 1;
  }

  assert() {
    QUnit.assert.deepEqual(this.actual, this.expected, 'TODO');
  }
}

export class RenderTest implements IRenderTest {
  testType!: ComponentKind;

  protected element: SimpleElement;
  protected assert = QUnit.assert;
  protected context: Dict = dict();
  protected renderResult: Option<RenderResult> = null;
  protected helpers = dict<UserHelper>();
  protected snapshot: NodesSnapshot = [];
  readonly count = new Count();

  constructor(protected delegate: RenderDelegate) {
    this.element = delegate.getInitialElement();
  }

  registerHelper(name: string, helper: UserHelper) {
    this.delegate.registerHelper(name, helper);
  }

  registerModifier(name: string, ModifierClass: TestModifierConstructor) {
    this.delegate.registerModifier(name, ModifierClass);
  }

  registerComponent<K extends ComponentKind>(
    type: K,
    name: string,
    layout: string,
    Class?: ComponentTypes[K]
  ) {
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
      case 'Fragment':
        invocation = this.buildFragmentComponent(blueprint);
        break;

      default:
        throw new Error(`Invalid test type ${this.testType}`);
    }

    return invocation;
  }

  private buildArgs(args: Dict): string {
    let { testType } = this;
    let sigil = '';
    let needsCurlies = false;

    if (testType === 'Glimmer' || testType === 'Basic' || testType === 'Fragment') {
      sigil = '@';
      needsCurlies = true;
    }

    return `${Object.keys(args)
      .map(arg => {
        let rightSide: string;

        let value = args[arg] as Maybe<string[]>;
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
      .join(' ')}`;
  }

  private buildBlockParams(blockParams: string[]): string {
    return `${blockParams.length > 0 ? ` as |${blockParams.join(' ')}|` : ''}`;
  }

  private buildElse(elseBlock: string | undefined): string {
    return `${elseBlock ? `{{else}}${elseBlock}` : ''}`;
  }

  private buildAttributes(attrs: Dict = {}): string {
    return Object.keys(attrs)
      .map(attr => `${attr}=${attrs[attr]}`)
      .join(' ');
  }

  private buildAngleBracketComponent(blueprint: ComponentBlueprint): string {
    let {
      args = {},
      attributes = {},
      template,
      name = GLIMMER_TEST_COMPONENT,
      blockParams = [],
    } = blueprint;

    let invocation: string | string[] = [];

    invocation.push(`<${name}`);

    let componetArgs = this.buildArgs(args);

    if (componetArgs !== '') {
      invocation.push(componetArgs);
    }

    let attrs = this.buildAttributes(attributes);
    if (attrs !== '') {
      invocation.push(attrs);
    }

    let open = invocation.join(' ');
    invocation = [open];

    if (template) {
      let block: string | string[] = [];
      let params = this.buildBlockParams(blockParams);
      if (params !== '') {
        block.push(params);
      }
      block.push(`>`);
      block.push(template);
      block.push(`</${name}>`);
      invocation.push(block.join(''));
    } else {
      invocation.push(' ');
      invocation.push(`/>`);
    }

    return invocation.join('');
  }

  private buildGlimmerComponent(blueprint: ComponentBlueprint): string {
    let { tag = 'div', layout, name = GLIMMER_TEST_COMPONENT } = blueprint;
    let invocation = this.buildAngleBracketComponent(blueprint);
    let layoutAttrs = this.buildAttributes(blueprint.layoutAttributes);
    this.assert.ok(
      true,
      `generated glimmer layout as ${`<${tag} ${layoutAttrs} ...attributes>${layout}</${tag}>`}`
    );
    this.delegate.registerComponent(
      'Glimmer',
      this.testType,
      name,
      `<${tag} ${layoutAttrs} ...attributes>${layout}</${tag}>`
    );
    this.assert.ok(true, `generated glimmer invocation as ${invocation}`);
    return invocation;
  }

  private buildCurlyBlockTemplate(
    name: string,
    template: string,
    blockParams: string[],
    elseBlock?: string
  ): string {
    let block: string[] = [];
    block.push(this.buildBlockParams(blockParams));
    block.push('}}');
    block.push(template);
    block.push(this.buildElse(elseBlock));
    block.push(`{{/${name}}}`);
    return block.join('');
  }

  private buildCurlyComponent(blueprint: ComponentBlueprint): string {
    let {
      args = {},
      layout,
      template,
      attributes,
      else: elseBlock,
      name = CURLY_TEST_COMPONENT,
      blockParams = [],
    } = blueprint;

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

    if (componentArgs !== '') {
      invocation.push(' ');
      invocation.push(componentArgs);
    }

    if (template) {
      invocation.push(this.buildCurlyBlockTemplate(name, template, blockParams, elseBlock));
    } else {
      invocation.push('}}');
    }
    this.assert.ok(true, `generated curly layout as ${layout}`);
    this.delegate.registerComponent('Curly', this.testType, name, layout);
    invocation = invocation.join('');
    this.assert.ok(true, `generated curly invocation as ${invocation}`);
    return invocation;
  }

  private buildFragmentComponent(blueprint: ComponentBlueprint): string {
    let { layout, name = GLIMMER_TEST_COMPONENT } = blueprint;
    let invocation = this.buildAngleBracketComponent(blueprint);
    this.assert.ok(true, `generated fragment layout as ${layout}`);
    this.delegate.registerComponent('Basic', this.testType, name, `${layout}`);
    this.assert.ok(true, `generated fragment invocation as ${invocation}`);
    return invocation;
  }

  private buildBasicComponent(blueprint: ComponentBlueprint): string {
    let { tag = 'div', layout, name = GLIMMER_TEST_COMPONENT } = blueprint;
    let invocation = this.buildAngleBracketComponent(blueprint);
    this.assert.ok(true, `generated basic layout as ${layout}`);
    this.delegate.registerComponent(
      'Basic',
      this.testType,
      name,
      `<${tag} ...attributes>${layout}</${tag}>`
    );
    this.assert.ok(true, `generated basic invocation as ${invocation}`);
    return invocation;
  }

  private buildDynamicComponent(blueprint: ComponentBlueprint): string {
    let {
      args = {},
      layout,
      template,
      attributes,
      else: elseBlock,
      name = GLIMMER_TEST_COMPONENT,
      blockParams = [],
    } = blueprint;

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

    if (componentArgs !== '') {
      invocation.push(' ');
      invocation.push(componentArgs);
    }

    if (template) {
      invocation.push(this.buildCurlyBlockTemplate('component', template, blockParams, elseBlock));
    } else {
      invocation.push('}}');
    }

    this.assert.ok(true, `generated dynamic layout as ${layout}`);
    this.delegate.registerComponent('Curly', this.testType, name, layout);
    invocation = invocation.join('');
    this.assert.ok(true, `generated dynamic invocation as ${invocation}`);

    return invocation;
  }

  shouldBeVoid(tagName: string) {
    clearElement(this.element);
    let html = '<' + tagName + " data-foo='bar'><p>hello</p>";
    this.delegate.renderTemplate(html, this.context, this.element, () => this.takeSnapshot());

    let tag = '<' + tagName + ' data-foo="bar">';
    let closing = '</' + tagName + '>';
    let extra = '<p>hello</p>';
    html = normalizeInnerHTML(toInnerHTML(this.element));

    QUnit.assert.pushResult({
      result: html === tag + extra || html === tag + closing + extra,
      actual: html,
      expected: tag + closing + extra,
      message: tagName + ' should be a void element',
    });
  }

  render(template: string | ComponentBlueprint, properties: Dict<unknown> = {}): void {
    QUnit.assert.ok(true, `Rendering ${template} with ${JSON.stringify(properties)}`);
    if (typeof template === 'object') {
      let blueprint = template as ComponentBlueprint;
      template = this.buildComponent(blueprint);

      if (this.testType === 'Dynamic' && properties['componentName'] === undefined) {
        properties['componentName'] = blueprint.name || GLIMMER_TEST_COMPONENT;
      }
    }

    this.setProperties(properties);

    this.renderResult = this.delegate.renderTemplate(template, this.context, this.element, () =>
      this.takeSnapshot()
    );
  }

  rerender(properties: Dict<unknown> = {}): void {
    QUnit.assert.ok(true, `rerender ${JSON.stringify(properties)}`);
    this.setProperties(properties);

    let result = expect(this.renderResult, 'the test should call render() before rerender()');

    result.env.begin();
    result.rerender();
    result.env.commit();
  }

  protected set(key: string, value: unknown): void {
    this.context[key] = value;
  }

  protected setProperties(properties: Dict<unknown>): void {
    assign(this.context, properties);
    bump();
  }

  protected takeSnapshot(): NodesSnapshot {
    let snapshot: NodesSnapshot = (this.snapshot = []);

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
    let element = assertElement(this.element.firstChild);

    switch (this.testType) {
      case 'Glimmer':
        assertElementShape(element, 'div', attrs, content);
        break;
      default:
        assertEmberishElement(element, 'div', attrs, content);
    }

    this.takeSnapshot();
  }

  private runTask<T>(callback: () => T): T {
    return callback();
  }

  protected assertStableNodes(
    { except: _except }: { except: SimpleNode | SimpleNode[] } = {
      except: [],
    }
  ) {
    let except: Array<SimpleNode>;

    if (Array.isArray(_except)) {
      except = uniq(_except);
    } else {
      except = [_except];
    }

    let { oldSnapshot, newSnapshot } = normalize(this.snapshot, this.takeSnapshot(), except);

    this.assert.deepEqual(oldSnapshot, newSnapshot, 'DOM nodes are stable');
  }
}

export interface RehydrationStats {
  clearedNodes: SimpleNode[];
}

export class RehydrationDelegate implements RenderDelegate {
  static readonly isEager = false;

  public clientEnv: JitTestDelegateContext;
  public serverEnv: JitTestDelegateContext;

  private clientResolver: LazyRuntimeResolver;
  private serverResolver: LazyRuntimeResolver;

  private clientRegistry: JitRegistry;
  private serverRegistry: JitRegistry;

  public clientDoc: SimpleDocument;
  public serverDoc: SimpleDocument;

  public rehydrationStats!: RehydrationStats;
  constructor() {
    this.clientDoc = document as SimpleDocument;
    this.clientResolver = new LazyRuntimeResolver();
    this.clientRegistry = this.clientResolver.registry;
    this.clientEnv = JitDelegateContext(this.clientDoc, this.clientResolver, this.clientRegistry);

    this.serverDoc = createHTMLDocument();
    this.serverResolver = new LazyRuntimeResolver();
    this.serverRegistry = this.serverResolver.registry;
    this.serverEnv = JitDelegateContext(this.serverDoc, this.serverResolver, this.serverRegistry);
  }

  getInitialElement(): SimpleElement {
    return this.clientDoc.createElement('div');
  }

  createElement(tagName: string): SimpleElement {
    return this.clientDoc.createElement(tagName);
  }

  getElementBuilder(env: Environment, cursor: Cursor): ElementBuilder {
    if (cursor.element instanceof Node) {
      return debugRehydration(env, cursor);
    }

    return serializeBuilder(env, cursor);
  }

  renderServerSide(
    template: string,
    context: Dict<unknown>,
    takeSnapshot: () => void,
    element: SimpleElement | undefined = undefined
  ): string {
    element = element || this.serverDoc.createElement('div');
    let cursor = { element, nextSibling: null };
    // Emulate server-side render
    renderTemplate(
      template,
      this.serverEnv,
      this.getSelf(context),
      this.getElementBuilder(this.serverEnv.runtime.env, cursor)
    );

    takeSnapshot();
    return this.serialize(element);
  }

  getSelf(context: unknown): UpdatableReference {
    return new UpdatableReference(context);
  }

  serialize(element: SimpleElement): string {
    return toInnerHTML(element);
  }

  renderClientSide(template: string, context: Dict<unknown>, element: SimpleElement): RenderResult {
    let env = this.clientEnv.runtime.env;
    // Client-side rehydration
    let cursor = { element, nextSibling: null };
    let builder = this.getElementBuilder(env, cursor) as DebugRehydrationBuilder;
    let result = renderTemplate(template, this.clientEnv, this.getSelf(context), builder);

    this.rehydrationStats = {
      clearedNodes: builder['clearedNodes'],
    };

    return result;
  }

  renderTemplate(
    template: string,
    context: Dict<unknown>,
    element: SimpleElement,
    snapshot: () => void
  ): RenderResult {
    let serialized = this.renderServerSide(template, context, snapshot);
    replaceHTML(element, serialized);
    qunitFixture().appendChild(element);
    return this.renderClientSide(template, context, element);
  }

  registerComponent(type: ComponentKind, _testType: string, name: string, layout: string): void {
    registerComponent(this.clientRegistry, type, name, layout);
    registerComponent(this.serverRegistry, type, name, layout);
  }

  registerHelper(name: string, helper: UserHelper): void {
    registerHelper(this.clientRegistry, name, helper);
    registerHelper(this.serverRegistry, name, helper);
  }

  registerModifier(name: string, ModifierClass: TestModifierConstructor): void {
    registerModifier(this.clientRegistry, name, ModifierClass);
    registerModifier(this.serverRegistry, name, ModifierClass);
  }
}

function normalize(
  oldSnapshot: NodesSnapshot,
  newSnapshot: NodesSnapshot,
  except: Array<SimpleNode>
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
      (nextOld && snapshotIsNode(nextOld) && except.indexOf(nextOld) > -1) ||
      (nextNew && snapshotIsNode(nextNew) && except.indexOf(nextNew) > -1)
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

function isServerMarker(node: SimpleNode) {
  return node.nodeType === NodeType.COMMENT_NODE && node.nodeValue!.charAt(0) === '%';
}

export interface ComponentTestMeta {
  kind?: DeclaredComponentKind;
  skip?: boolean | DeclaredComponentKind;
}

function setTestingDescriptor(descriptor: PropertyDescriptor): void {
  let testFunction = descriptor.value as Function & Dict;
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
      let testFunction = descriptor.value as Function & Dict;
      keys(meta).forEach(key => (testFunction[key] = meta[key]));
      setTestingDescriptor(descriptor);
    };
  }

  let descriptor = args[2];
  setTestingDescriptor(descriptor);
  return descriptor;
}

export interface RenderDelegateConstructor<Delegate extends RenderDelegate> {
  readonly isEager: boolean;
  new (doc?: SimpleDocument): Delegate;
}

interface IRenderTest {
  readonly count: Count;
  testType: ComponentKind;
}

export interface RenderTestConstructor<D extends RenderDelegate, T extends IRenderTest> {
  new (delegate: D): T;
}

export function module<T extends IRenderTest>(
  name: string,
  klass: RenderTestConstructor<RenderDelegate, T>,
  options = { componentModule: false }
): void {
  return rawModule(name, klass, LazyRenderDelegate, options);
}

export function rawModule<D extends RenderDelegate>(
  name: string,
  klass: RenderTestConstructor<D, IRenderTest>,
  Delegate: RenderDelegateConstructor<D>,
  options = { componentModule: false }
): void {
  if (options.componentModule) {
    if (shouldRunTest<D>(Delegate)) {
      componentModule(name, (klass as any) as RenderTestConstructor<D, RenderTest>, Delegate);
    }
  } else {
    QUnit.module(`[NEW] ${name}`);

    for (let prop in klass.prototype) {
      const test = klass.prototype[prop];

      if (isTestFunction(test) && shouldRunTest<D>(Delegate)) {
        QUnit.test(prop, assert => {
          let instance = new klass(new Delegate());
          test.call(instance, assert, instance.count);
          instance.count.assert();
        });
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

function componentModule<D extends RenderDelegate, T extends IRenderTest>(
  name: string,
  klass: RenderTestConstructor<D, T>,
  Delegate: RenderDelegateConstructor<D>
) {
  let tests: ComponentTests = {
    glimmer: [],
    curly: [],
    dynamic: [],
    basic: [],
    fragment: [],
  };

  function createTest(prop: string, test: any, skip?: boolean) {
    let shouldSkip: boolean;
    if (skip === true || test.skip === true) {
      shouldSkip = true;
    }

    return (type: ComponentKind, klass: RenderTestConstructor<D, T>) => {
      if (!shouldSkip) {
        QUnit.test(`${type.toLowerCase()}: ${prop}`, assert => {
          let instance = new klass(new Delegate());
          instance.testType = type;
          test.call(instance, assert, instance.count);
        });
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
            if (test['kind'] === 'basic') {
              // Basic components are not part of matrix testing
              tests.basic.push(createTest(prop, test, true));
            } else if (test['kind'] === 'fragment') {
              tests.fragment.push(createTest(prop, test, true));
            } else {
              ['glimmer', 'curly', 'dynamic'].forEach(kind => {
                tests[kind as DeclaredComponentKind].push(createTest(prop, test, true));
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

      if (kind === 'fragment') {
        tests.fragment.push(createTest(prop, test));
      }
    }
  }
  QUnit.module(`[NEW] ${name}`, () => {
    nestedComponentModules(klass, tests);
  });
}

function nestedComponentModules<D extends RenderDelegate, T extends IRenderTest>(
  klass: RenderTestConstructor<D, T>,
  tests: ComponentTests
): void {
  keys(tests).forEach(type => {
    let formattedType = `${type[0].toUpperCase() + type.slice(1)}`;
    QUnit.module(`${formattedType}`, () => {
      for (let i = tests[type].length - 1; i >= 0; i--) {
        let t = tests[type][i];
        t(formattedType, klass);
        tests[type].pop();
      }
    });
  });
}

interface TestFunction {
  (this: IRenderTest, assert: typeof QUnit.assert, count?: Count): void;
  kind?: DeclaredComponentKind;
  skip?: boolean | DeclaredComponentKind;
}

function isTestFunction(value: any): value is TestFunction {
  return typeof value === 'function' && value.isTest;
}

export function content(list: Content[]): string {
  let out: string[] = [];
  let depth = 0;

  list.forEach(item => {
    if (typeof item === 'string') {
      out.push(item);
    } else if (item.marker === 'open-block') {
      out.push(`<!--%+b:${depth++}%-->`);
    } else if (item.marker === 'close-block') {
      out.push(`<!--%-b:${--depth}%-->`);
    } else {
      out.push(`<!--%${item.marker}%-->`);
    }
  });

  return out.join('');
}

/**
  Accomodates the various signatures of `assertEmberishElement` and `assertElement`, which can be any of:

  - element, tagName, attrs, contents
  - element, tagName, contents
  - element, tagName, attrs
  - element, tagName

  TODO: future refactorings should clean up this interface (likely just making all callers pass a POJO)
*/
export function processAssertElementArgs(args: any[]): [SimpleElement, string, any, string | null] {
  let element = args[0];

  if (args.length === 3) {
    if (typeof args[2] === 'string') return [element, args[1], {}, args[2]];
    else return [element, args[1], args[2], null];
  } else if (args.length === 2) {
    return [element, args[1], {}, null];
  } else {
    return [args[0], args[1], args[2], args[3]];
  }
}

export function assertEmberishElement(
  element: SimpleElement,
  tagName: string,
  attrs: Object,
  contents: string
): void;
export function assertEmberishElement(element: SimpleElement, tagName: string, attrs: Object): void;
export function assertEmberishElement(
  element: SimpleElement,
  tagName: string,
  contents: string
): void;
export function assertEmberishElement(element: SimpleElement, tagName: string): void;
export function assertEmberishElement(...args: any[]): void {
  let [element, tagName, attrs, contents] = processAssertElementArgs(args);

  let fullAttrs = assign({ class: classes('ember-view'), id: regex(/^ember\d*$/) }, attrs);

  equalsElement(element, tagName, fullAttrs, contents);
}

export function assertElementShape(
  element: SimpleElement,
  tagName: string,
  attrs: Object,
  contents: string
): void;
export function assertElementShape(element: SimpleElement, tagName: string, attrs: Object): void;
export function assertElementShape(element: SimpleElement, tagName: string, contents: string): void;
export function assertElementShape(element: SimpleElement, tagName: string): void;
export function assertElementShape(...args: any[]): void {
  let [element, tagName, attrs, contents] = processAssertElementArgs(args);

  equalsElement(element, tagName, attrs, contents);
}

const HAS_TYPED_ARRAYS = typeof Uint16Array !== 'undefined';

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
