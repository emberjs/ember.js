import { destroy } from '@glimmer/destroyable';
import {
  type ComponentDefinitionState,
  type Dict,
  type DynamicScope,
  type Helper,
  type Maybe,
  type Option,
  type RenderResult,
  type SimpleElement,
  type SimpleNode,
} from '@glimmer/interfaces';
import { inTransaction } from '@glimmer/runtime';
import { type ASTPluginBuilder } from '@glimmer/syntax';
import type { NTuple } from '@glimmer/test-utils';
import { assert, clearElement, dict, expect, isPresent } from '@glimmer/util';
import { dirtyTagFor } from '@glimmer/validator';

import {
  type ComponentBlueprint,
  type ComponentKind,
  type ComponentTypes,
  CURLY_TEST_COMPONENT,
  GLIMMER_TEST_COMPONENT,
} from './components';
import { assertElementShape, assertEmberishElement } from './dom/assertions';
import { assertingElement, toInnerHTML } from './dom/simple-utils';
import { type UserHelper } from './helpers';
import { type TestModifierConstructor } from './modifiers';
import type RenderDelegate from './render-delegate';
import { equalTokens, isServerMarker, type NodesSnapshot, normalizeSnapshot } from './snapshot';

type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;
type Present<T> = Exclude<T, null | undefined>;

export interface IRenderTest {
  readonly count: Count;
  testType: ComponentKind;
  beforeEach?(): void;
  afterEach?(): void;
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
  testType: ComponentKind = 'unknown';

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

  registerPlugin(plugin: ASTPluginBuilder): void {
    this.delegate.registerPlugin(plugin);
  }

  registerHelper(name: string, helper: UserHelper): void {
    this.delegate.registerHelper(name, helper);
  }

  registerInternalHelper(name: string, helper: Helper): void {
    this.delegate.registerInternalHelper(name, helper);
  }

  registerModifier(name: string, ModifierClass: TestModifierConstructor): void {
    this.delegate.registerModifier(name, ModifierClass);
  }

  registerComponent<K extends ComponentKind>(
    type: K,
    name: string,
    layout: string,
    Class?: ComponentTypes[K]
  ): void {
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
      case 'TemplateOnly':
        invocation = this.buildTemplateOnlyComponent(blueprint);
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

    if (testType === 'Glimmer' || testType === 'TemplateOnly') {
      sigil = '@';
      needsCurlies = true;
    }

    return `${Object.keys(args)
      .map((arg) => {
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
      .map((attr) => `${attr}=${attrs[attr]}`)
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

    let componentArgs = this.buildArgs(args);

    if (componentArgs !== '') {
      invocation.push(componentArgs);
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

  private buildTemplateOnlyComponent(blueprint: ComponentBlueprint): string {
    let { layout, name = GLIMMER_TEST_COMPONENT } = blueprint;
    let invocation = this.buildAngleBracketComponent(blueprint);
    this.assert.ok(true, `generated fragment layout as ${layout}`);
    this.delegate.registerComponent('TemplateOnly', this.testType, name, `${layout}`);
    this.assert.ok(true, `generated fragment invocation as ${invocation}`);
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
      invocation.push('{{#component this.componentName');
    } else {
      invocation.push('{{component this.componentName');
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
    html = toInnerHTML(this.element);

    QUnit.assert.pushResult({
      result: html === tag + extra || html === tag + closing + extra,
      actual: html,
      expected: tag + closing + extra,
      message: tagName + ' should be a void element',
    });
  }

  render(template: string | ComponentBlueprint, properties: Dict<unknown> = {}): void {
    try {
      QUnit.assert.ok(true, `Rendering ${template} with ${JSON.stringify(properties)}`);
    } catch {
      // couldn't stringify, possibly has a circular dependency
    }

    if (typeof template === 'object') {
      let blueprint = template;
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

  renderComponent(
    component: ComponentDefinitionState,
    args: Dict<unknown> = {},
    dynamicScope?: DynamicScope
  ): void {
    try {
      QUnit.assert.ok(true, `Rendering ${String(component)} with ${JSON.stringify(args)}`);
    } catch {
      // couldn't stringify, possibly has a circular dependency
    }

    assert(
      !!this.delegate.renderComponent,
      'Attempted to render a component, but the delegate did not implement renderComponent'
    );

    this.renderResult = this.delegate.renderComponent(component, args, this.element, dynamicScope);
  }

  rerender(properties: Dict<unknown> = {}): void {
    try {
      QUnit.assert.ok(true, `rerender ${JSON.stringify(properties)}`);
    } catch {
      // couldn't stringify, possibly has a circular dependency
    }

    this.setProperties(properties);

    let result = expect(this.renderResult, 'the test should call render() before rerender()');

    try {
      result.env.begin();
      result.rerender();
    } finally {
      result.env.commit();
    }
  }

  destroy(): void {
    let result = expect(this.renderResult, 'the test should call render() before destroy()');

    inTransaction(result.env, () => destroy(result));
  }

  protected set(key: string, value: unknown): void {
    this.context[key] = value;
    dirtyTagFor(this.context, key);
  }

  protected setProperties(properties: Dict<unknown>): void {
    for (let key in properties) {
      this.set(key, properties[key]);
    }
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

  protected guard(condition: any, message: string): asserts condition {
    if (condition) {
      this.assert.ok(condition, message);
    } else {
      throw Error(`Guard Failed: message`);
    }
  }

  protected guardWith<T, U extends T, K extends string>(
    desc: { [P in K]: T },
    { condition }: { condition: (value: T) => value is U }
  ): U {
    let [description, value] = Object.entries(desc)[0] as [string, T];

    if (condition(value)) {
      this.assert.ok(
        condition(value),
        `${description} satisfied ${condition.name ?? '{anonymous guard}'}`
      );
      return value;
    } else {
      throw Error(
        `Guard Failed: ${description} didn't satisfy ${condition.name ?? '{anonymous guard}'}`
      );
    }
  }

  protected guardPresent<T, K extends string>(desc: { [P in K]: T }): Present<T> {
    let [description, value] = Object.entries(desc)[0] as [string, T];

    let missing = value === undefined || value === null;

    if (missing) {
      throw Error(`Guard Failed: ${description} was not present (was ${String(value)})`);
    }

    this.assert.ok(!missing, `${description} was present`);

    return value as Present<T>;
  }

  protected guardArray<T extends Maybe<unknown>[], K extends string>(desc: { [P in K]: T }): {
    [K in keyof T]: Present<T[K]>;
  };
  protected guardArray<T, K extends string, N extends number>(
    desc: { [P in K]: Iterable<T> | ArrayLike<T> },
    options: { min: N }
  ): Expand<NTuple<N, Present<T>>>;
  protected guardArray<T, U extends T, K extends string, N extends number>(
    desc: { [P in K]: Iterable<T> | ArrayLike<T> },
    options: { min: N; condition: (value: T) => value is U }
  ): Expand<NTuple<N, U>>;
  protected guardArray<T, K extends string, A extends ArrayLike<T>>(desc: { [P in K]: A }): Expand<
    NTuple<A['length'], Present<T>>
  >;
  protected guardArray<T, K extends string>(desc: {
    [P in K]: Iterable<T> | ArrayLike<T>;
  }): Present<T>[];
  protected guardArray<T, K extends string, U extends T>(
    desc: {
      [P in K]: Iterable<T> | ArrayLike<T>;
    },
    options: { condition: (value: T) => value is U; min?: number }
  ): U[];
  protected guardArray(
    desc: Record<string, Iterable<unknown> | ArrayLike<unknown>>,
    options?: {
      min?: Maybe<number>;
      condition?: (value: unknown) => boolean;
    }
  ): unknown[] {
    let [message, list] = Object.entries(desc)[0] as [string, unknown[]];

    let array: unknown[] = Array.from(list);
    let condition: (value: unknown) => boolean;

    if (typeof options?.min === 'number') {
      if (array.length < options.min) {
        throw Error(
          `Guard Failed: expected to have at least ${options.min} (of ${message}), but got ${array.length}`
        );
      }

      array = array.slice(0, options.min);
      condition = (value) => value !== null && value !== undefined;
      message = `${message}: ${options.min} present elements`;
    } else if (options?.condition) {
      condition = options.condition;
    } else {
      condition = isPresent;
      message = `${message}: all are present`;
    }

    let succeeds = array.every(condition);

    if (succeeds) {
      this.assert.ok(succeeds, message);
    } else {
      throw Error(`Guard Failed: ${message}`);
    }

    return array;
  }

  protected assertHTML(html: string, elementOrMessage?: SimpleElement | string, message?: string) {
    if (typeof elementOrMessage === 'object') {
      equalTokens(elementOrMessage || this.element, html, message ? `${html} (${message})` : html);
    } else {
      equalTokens(this.element, html, elementOrMessage ? `${html} (${elementOrMessage})` : html);
    }
    this.takeSnapshot();
  }

  protected assertComponent(content: string, attrs: Object = {}) {
    let element = assertingElement(this.element.firstChild);

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

    let { oldSnapshot, newSnapshot } = normalizeSnapshot(
      this.snapshot,
      this.takeSnapshot(),
      except
    );

    this.assert.deepEqual(oldSnapshot, newSnapshot, 'DOM nodes are stable');
  }
}

function uniq(arr: any[]) {
  return arr.reduce((accum, val) => {
    if (accum.indexOf(val) === -1) accum.push(val);
    return accum;
  }, []);
}
