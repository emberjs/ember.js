import { Dict, Maybe, Option, RenderResult, Helper } from '@glimmer/interfaces';
import { ASTPluginBuilder } from '@glimmer/syntax';
import { bump, isConstTagged } from '@glimmer/validator';
import { clearElement, dict, expect, assign } from '@glimmer/util';
import { SimpleElement, SimpleNode } from '@simple-dom/interface';
import {
  ComponentBlueprint,
  ComponentKind,
  ComponentTypes,
  CURLY_TEST_COMPONENT,
  GLIMMER_TEST_COMPONENT,
} from './components';
import { assertElementShape, assertEmberishElement } from './dom/assertions';
import { normalizeInnerHTML } from './dom/normalize';
import { assertElement, toInnerHTML } from './dom/simple-utils';
import { UserHelper } from './helpers';
import { TestModifierConstructor } from './modifiers';
import RenderDelegate from './render-delegate';
import { equalTokens, isServerMarker, NodesSnapshot, normalizeSnapshot } from './snapshot';
import { UpdatableRootReference } from './reference';

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

  registerPartial(name: string, content: string): void {
    this.delegate.registerPartial(name, content);
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
    try {
      QUnit.assert.ok(true, `Rendering ${template} with ${JSON.stringify(properties)}`);
    } catch {
      // couldn't stringify, possibly has a circular dependency
    }

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
    try {
      QUnit.assert.ok(true, `rerender ${JSON.stringify(properties)}`);
    } catch {
      // couldn't stringify, possibly has a circular dependency
    }

    this.setProperties(properties);

    let self = this.delegate.getSelf(this.context);

    if (!isConstTagged(self)) {
      (self as UpdatableRootReference).forceUpdate(this.context);
    }

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

    result.destroy();
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

  protected assertHTML(html: string, elementOrMessage?: SimpleElement | string, message?: string) {
    if (typeof elementOrMessage === 'object') {
      equalTokens(elementOrMessage || this.element, html, message ? `${html} (${message})` : html);
    } else {
      equalTokens(this.element, html, elementOrMessage ? `${html} (${elementOrMessage})` : html);
    }
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
