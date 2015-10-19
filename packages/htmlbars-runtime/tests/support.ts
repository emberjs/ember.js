import {
  Environment,
  DOMHelper,
  StatementSyntax,
  ParamsAndHash,
  ElementStack,
  Morph,
  ContentMorph,
  MorphList,
  MorphListOptions,
  Template,
  Templates,
  Block,
  Inline,
  Unknown,
  Hash,
  EvaluatedHash,
  Frame,
  HelperSyntax,
  AttributeSyntax,
  DynamicAttr,
  StaticAttr,
  AddClass,
  EvaluatedRef,
  GetSyntax,
  ElementSyntax,
  ValueSyntax,
  RefSyntax,
  ComponentMorph,
  ComponentSyntax,
  ComponentClass,
  ComponentDefinition,
  ComponentHooks,
  Component,
  Scope,
  builders
} from "htmlbars-runtime";
import { compile } from "htmlbars-compiler";
import { LITERAL, Dict, InternedString, dict, assign } from 'htmlbars-util';

import { Meta, ConstReference, ChainableReference, setProperty as set } from "htmlbars-reference";

export class TestEnvironment extends Environment {
  private helpers = {};
  private components = dict<ComponentDefinition>();

  constructor(doc: HTMLDocument=document) {
    super(new DOMHelper(doc), Meta);
  }

  registerHelper(name, helper) {
    this.helpers[name] = helper;
  }

  registerComponent(name: string, definition: ComponentDefinition) {
    this.components[name] = definition;
  }

  registerCurlyComponent(name: string, Component: ComponentClass, layout: string): TestComponentDefinition {
    let definition = curlyComponentDefinition(Component, compile(layout));
    this.registerComponent(name, definition);
    return definition;
  }

  registerEmberishComponent(name: string, Component: ComponentClass, layout: string): TestComponentDefinition {
    let definition = new EmberishComponentDefinition(Component, hooks, compile(layout));
    this.registerComponent(name, definition);
    return definition;
  }

  registerGlimmerComponent(name: string, Component: ComponentClass, layout: string): TestComponentDefinition {
    let definition = glimmerComponentDefinition(Component, compile(layout));
    this.registerComponent(name, definition);
    return definition;
  }

  registerEmberishGlimmerComponent(name: string, Component: ComponentClass, layout: string): TestComponentDefinition {
    let definition = EmberishGlimmerComponentDefinition.build(name, Component, hooks, compile(layout));
    this.registerComponent(name, definition);
    return definition;
  }

  statement<Options>(statement: StatementSyntax): StatementSyntax {
    let type = statement.type;
    let block = type === 'block' ? <Block>statement : null;
    let inline = type === 'inline' ? <Inline>statement : null;
    let unknown = type === 'unknown' ? <Unknown>statement : null;

    let hash: Hash, args: ParamsAndHash;

    if (block || inline) {
      args = (block || inline).args;
      hash = args.hash;
    } else if (unknown) {
      args = ParamsAndHash.empty();
      hash = Hash.empty();
    }

    let key: string, isSimple: boolean;

    if (block || inline) {
      isSimple = (<Block | Inline>statement).path.length === 1;
      key = (<Block | Inline>statement).path[0];
    } else if (unknown) {
      isSimple = unknown.ref.path().length === 1;
      key = unknown.ref.path()[0];
    }

    if (block && isSimple && key === 'each') {
      return new EachSyntax({ args: block.args, templates: block.templates });
    }

    if (isSimple) {
      let definition = this.components[key];

      if (definition) {
        let template = block ? block.templates.default : null;
        let inverse = block ? block.templates.inverse : null;
        return (<CurlyComponent>CurlyComponent.build(key, { default: template, inverse, hash })).withArgs(args);
      }
    }

    return super.statement(statement);
  }

  hasHelper(scope, helperName) {
    return helperName.length === 1 && helperName[0] in this.helpers;
  }

  lookupHelper(scope: Scope, helperParts: string[]) {
    let helperName = helperParts[0];

    if (helperName === 'hasBlock') return new ConstReference(hasBlock(scope));
    if (helperName === 'hasBlockParams') return new ConstReference(hasBlockParams(scope));

    let helper = this.helpers[helperName];

    if (!helper) throw new Error(`Helper for ${helperParts.join('.')} not found.`);
    return new ConstReference(this.helpers[helperName]);
  }

  getComponentDefinition(scope, name: string[], syntax: ComponentSyntax): ComponentDefinition {
    return this.components[name[0]];
  }
}

function hasBlock(scope: Scope) {
  return function([name]: [InternedString]) {
    return !!scope.getBlock(name || LITERAL('default'));
  }
}

function hasBlockParams(scope: Scope) {
  return function([name]: [InternedString]) {
    let block = scope.getBlock(name || LITERAL('default'));
    if (!block) return false;
    return !!block.template.arity;
  }
}

const hooks: ComponentHooks = {
  begin() {},
  commit() {},

  didReceiveAttrs(component) {
    if (typeof component.didReceiveAttrs === 'function') component.didReceiveAttrs();
  },

  didInsertElement(component) {
    if (typeof component.didInsertElement === 'function') component.didInsertElement();
  },

  didRender(component) {
    if (typeof component.didRender === 'function') component.didRender();
  },

  willRender(component) {
    if (typeof component.willRender === 'function') component.willRender();
  },

  willUpdate(component) {
    if (typeof component.willUpdate === 'function') component.willUpdate();
  },

  didUpdate(component) {
    if (typeof component.didUpdate === 'function') component.didUpdate();
  },

  didUpdateAttrs(component) {
    if (typeof component.didUpdateAttrs === 'function') component.didUpdateAttrs();
  }
};

export class HookIntrospection implements ComponentHooks {
  private inner: ComponentHooks;
  public hooks: { [index: string]: Component[] } = {};

  constructor(hooks: ComponentHooks) {
    this.inner = hooks;
  }

  begin(component: Component) {
    this.hooks = {};
    this.inner.begin(component)
  }

  commit(component: Component) {
    this.inner.commit(component);
  }

  didReceiveAttrs(component: Component) {
    this.initialize('didReceiveAttrs').push(component);
    this.inner.didReceiveAttrs(component);
  }

  didUpdateAttrs(component: Component) {
    this.initialize('didUpdateAttrs').push(component);
    this.inner.didUpdateAttrs(component);
  }

  didInsertElement(component: Component) {
    this.initialize('didInsertElement').push(component);
    this.inner.didInsertElement(component);
  }

  willRender(component: Component) {
    this.initialize('willRender').push(component);
    this.inner.willRender(component);
  }

  willUpdate(component: Component) {
    this.initialize('willUpdate').push(component);
    this.inner.willUpdate(component);
  }

  didRender(component: Component) {
    this.initialize('didRender').push(component);
    this.inner.didRender(component);
  }

  didUpdate(component: Component) {
    this.initialize('didUpdate').push(component);
    this.inner.didUpdate(component);
  }

  private initialize(name: string) {
    return (this.hooks[name] = this.hooks[name] || []);
  }
}

abstract class TestComponentDefinition implements ComponentDefinition {
  public hooks: HookIntrospection;
  public class: ComponentClass;
  public layout: Template;

  constructor(klass: ComponentClass, hooks: ComponentHooks, layout: Template) {
    this['class'] = klass;
    this.hooks = new HookIntrospection(hooks);
    this.layout = layout;
  }

  rootElement(component: any, element: Element) {
    component.element = element;
  }

  abstract rootElementAttrs(component: any, outer: EvaluatedHash, attrs: AttributeSyntax[], layoutFrame: Frame, invokeFrame: Frame): AttributeSyntax[];
  abstract creationObjectForAttrs(Component: ComponentClass, attrs: Object): Object;
  abstract setupLayoutScope(scope: Scope, layout: Template, yielded: Template);
  abstract updateObjectFromAttrs(component: any, attrs: Object);

  allowedForSyntax(component: Component, syntax: StatementSyntax): boolean {
    return !(syntax instanceof ComponentSyntax);
  }
}

class CurlyComponentDefinition extends TestComponentDefinition {
  rootElementAttrs(component: any, outer: EvaluatedHash, attrs: AttributeSyntax[], ...args): AttributeSyntax[] {
    return [];
  }

  creationObjectForAttrs(Component: ComponentClass, attrs: Object): Object {
    return attrs;
  }

  updateObjectFromAttrs(component: any, attrs: Object) {
    for (let prop in attrs) {
      set(component, prop, attrs[prop]);
    }
  }

  setupLayoutScope(scope: Scope, layout: Template, yielded: Template) {
    if (yielded) {
      scope.bindLocal(LITERAL('hasBlock'), true);
      if (yielded.arity) {
        scope.bindLocal(LITERAL('hasBlockParams'), true);
      }
    }
  }

}

class GlimmerComponentDefinition extends TestComponentDefinition {
  rootElementAttrs(component: any, outer: EvaluatedHash, attrs: AttributeSyntax[], layoutFrame: Frame, invokeFrame: Frame): AttributeSyntax[] {
    return attrs.map(attr => attr.asEvaluated(invokeFrame));
  }

  creationObjectForAttrs(Component: ComponentClass, attrs: Object): Object {
    return { attrs };
  }

  updateObjectFromAttrs(component: any, attrs: Object) {
    set(component, 'attrs', attrs);
  }

  setupLayoutScope(scope: Scope, layout: Template, yielded: Template) {
    if (!yielded.isEmpty) {
      scope.bindLocal(LITERAL('hasBlock'), true);
      if (yielded.arity) {
        scope.bindLocal(LITERAL('hasBlockParams'), true);
      }
    }
  }
}

let uuid = 1;

class EmberishGlimmerComponentDefinition extends GlimmerComponentDefinition {
  static build(name: InternedString, Component: ComponentClass, hooks: ComponentHooks, layout: Template) {
    let foundIndex;
    let syntax = <ComponentSyntax>layout.statements.find((syntax, i) => {
      if (syntax.type !== 'component') return false;
      let component = <ComponentSyntax>syntax;
      let path = component.path.path();
      foundIndex = i;
      return path.length === 1 && path[0] === name;
    });

    if (syntax) {
      layout = layout.clone();
      layout.statements.splice(foundIndex, 1, new ElementSyntax(name, syntax.hash, syntax.templates.default))
    }

    return new this(Component, hooks, layout);
  }

  rootElementAttrs(component: any, outerAttrs: EvaluatedHash, rawAttrs: AttributeSyntax[], layoutFrame: Frame, invokeFrame: Frame): AttributeSyntax[] {
    debugger;
    let sawAttrs = dict();
    let attrs = rawAttrs.map(attr => {
      sawAttrs[attr.name] = true;
      return attr.asEvaluated(invokeFrame);
    });

    let outerClass = outerAttrs.at(LITERAL('class'));
    if (outerClass) {
      attrs.push(AddClass.build(new EvaluatedRef(outerClass)));
    }

    attrs.push(AddClass.build(ValueSyntax.build('ember-view')));

    if (!sawAttrs['id']) {
      attrs.push(StaticAttr.build('id', `ember${uuid++}`));
    }

    return attrs;
  }

  creationObjectForAttrs(Component: ComponentClass, attrs: Object): Object {
    return { attrs };
  }

  updateObjectFromAttrs(component: any, attrs: Object) {
    set(component, 'attrs', attrs);
  }
}

class EmberishComponentDefinition extends CurlyComponentDefinition {
  rootElementAttrs(component: Component, outer: EvaluatedHash, attrs: AttributeSyntax[], layoutFrame: Frame): AttributeSyntax[] {
    let rawBindings = component['attributeBindings'];

    return rawBindings.map(b => {
      let [value, key] = b.split(':');
      return DynamicAttr.build(key || value, new EvaluatedRef(GetSyntax.build(value).evaluate(layoutFrame)));
    });
  }
}

export function curlyComponentDefinition(Component: ComponentClass, layout: Template): TestComponentDefinition {
  return new CurlyComponentDefinition(Component, hooks, layout);
}

export function glimmerComponentDefinition(Component: ComponentClass, layout: Template): TestComponentDefinition {
  return new GlimmerComponentDefinition(Component, hooks, layout);
}

class CurlyComponent extends ComponentSyntax {
  private args: ParamsAndHash;
  private inverse: Template;

  withArgs(args: ParamsAndHash): CurlyComponent {
    this.args = args;
    return this;
  }

  withInverse(inverse: Template): CurlyComponent {
    this.inverse = inverse;
    return this;
  }

  evaluate(stack: ElementStack, frame: Frame): Morph {
    let { path: ref, hash, templates } = this;
    let definition = frame.getComponentDefinition(ref.path(), this);

    let layout = definition.layout.clone();
    layout.statements.unshift(builders.openElement('div'));
    layout.statements.push(builders.closeElement());

    definition = new (<typeof CurlyComponentDefinition>definition.constructor)(definition['class'], definition.hooks, layout);

    return stack.createContentMorph(ComponentMorph, { definition, attrs: hash, templates }, frame);
  }
}

type EachOptions = { args: ParamsAndHash };

class EachSyntax implements StatementSyntax {
  type = "each-statement";

  private args: ParamsAndHash;
  private templates: Templates;
  public isStatic = false;

  constructor({ args, templates }: { args: ParamsAndHash, templates: Templates }) {
    this.args = args;
    this.templates = templates;
  }

  prettyPrint() {
    return `#each ${this.args.prettyPrint()}`;
  }

  evaluate(stack: ElementStack, frame: Frame): ContentMorph {
    let list = this.args.params.evaluate(frame).nth(0);
    let key = this.args.hash.evaluate(frame).at(LITERAL('key'));
    return stack.createContentMorph(MorphList, { key, reference: list, templates: this.templates }, frame);
  }
}

export function equalsElement(element, tagName, attributes, content) {
  QUnit.push(element.tagName === tagName.toUpperCase(), element.tagName.toLowerCase(), tagName, `expect tagName to be ${tagName}`);

  let expectedAttrs: Dict<Matcher> = dict<Matcher>();

  let expectedCount = 0;
  for (let prop in attributes) {
    expectedCount++;
    let expected = attributes[prop];

    let matcher: Matcher = typeof expected === 'object' && MATCHER in expected ? expected : equals(expected);
    expectedAttrs[prop] = expected;

    QUnit.push(attributes[prop].match(element.getAttribute(prop)), matcher.fail(element.getAttribute(prop)), matcher.fail(element.getAttribute(prop)), `Expected element's ${prop} attribute ${matcher.expected()}`);
  }

  let actualAttributes = {};
  for (let i = 0, l = element.attributes.length; i < l; i++) {
    actualAttributes[element.attributes[i].name] = element.attributes[i].value;
  }

  QUnit.push(element.attributes.length === expectedCount, element.attributes.length, expectedCount, `Expected ${expectedCount} attributes; got ${element.outerHTML}`);

  QUnit.push(element.innerHTML === content, element.innerHTML, content, `The element had '${content}' as its content`);
}

interface Matcher {
  "3d4ef194-13be-4ccf-8dc7-862eea02c93e": boolean;
  match(actual): boolean;
  fail(actual): string;
  expected(): string;
}

export const MATCHER = "3d4ef194-13be-4ccf-8dc7-862eea02c93e";

export function equals(expected) {
  return {
    "3d4ef194-13be-4ccf-8dc7-862eea02c93e": true,
    match(actual) {
      return expected === actual;
    },

    expected() {
      return `to equal ${expected}`;
    },

    fail(actual) {
      return `${actual} did not equal ${expected}`;
    }
  };

}

export function regex(r) {
  return {
    "3d4ef194-13be-4ccf-8dc7-862eea02c93e": true,
    match(v) {
      return r.test(v);
    },
    expected() {
      return `to match ${r}`;
    },
    fail(actual) {
      return `${actual} did not match ${r}`;
    }
  };
}

export function classes(expected) {
  return {
    "3d4ef194-13be-4ccf-8dc7-862eea02c93e": true,
    match(actual) {
      return expected.split(' ').sort().join(' ') === actual.split(' ').sort().join(' ');
    },
    expected() {
      return `to include '${expected}'`;
    },
    fail(actual) {
      return `'${actual}'' did not match '${expected}'`;
    }
  }
}