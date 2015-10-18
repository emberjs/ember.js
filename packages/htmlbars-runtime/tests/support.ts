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
  Frame,
  AttributeSyntax,
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
import { LITERAL, Dict, dict, assign } from 'htmlbars-util';

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

  registerGlimmerComponent(name: string, Component: ComponentClass, layout: string): TestComponentDefinition {
    let definition = glimmerComponentDefinition(Component, compile(layout));
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
        let template = block ? block.templates._default : null;
        return (<CurlyComponent>CurlyComponent.build(key, { default: template, inverse: null, hash })).withArgs(args);
      }
    }

    return super.statement(statement);
  }

  hasHelper(scope, helperName) {
    return helperName.length === 1 && helperName[0] in this.helpers;
  }

  lookupHelper(scope, helperName) {
    let helper = this.helpers[helperName[0]];
    if (!helper) throw new Error(`Helper for ${helperName.join('.')} not found.`);
    return new ConstReference(this.helpers[helperName[0]]);
  }

  getComponentDefinition(scope, name: string[], syntax: ComponentSyntax): ComponentDefinition {
    return this.components[name[0]];
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

interface TestComponentDefinition extends ComponentDefinition {
  hooks: HookIntrospection
}

export function curlyComponentDefinition(Component: ComponentClass, layout: Template): TestComponentDefinition {
  return {
    class: Component,

    rootElementAttrs(component: any, attrs: AttributeSyntax[]): AttributeSyntax[] {
      return [];
    },

    creationObjectForAttrs(Component: ComponentClass, attrs: Object): Object {
      return attrs;
    },

    setupLayoutScope(scope: Scope, layout: Template, yielded: Template) {
      if (yielded) {
        scope.bindLocal(LITERAL('hasBlock'), true);
        if (yielded.arity) {
          scope.bindLocal(LITERAL('hasBlockParams'), true);
        }
      }
    },

    updateObjectFromAttrs(component: any, attrs: Object) {
      for (let prop in attrs) {
        set(component, prop, attrs[prop]);
      }
    },

    allowedForSyntax(component: Component, syntax: StatementSyntax): boolean {
      return !(syntax instanceof ComponentSyntax);
    },

    hooks: new HookIntrospection(hooks),
    layout
  };
}

export function glimmerComponentDefinition(Component: ComponentClass, layout: Template): TestComponentDefinition {
  return {
    class: Component,

    rootElementAttrs(component: any, attrs: AttributeSyntax[], layoutFrame: Frame, invokeFrame: Frame): AttributeSyntax[] {
      return attrs.map(attr => attr.asEvaluated(invokeFrame));
    },

    creationObjectForAttrs(Component: ComponentClass, attrs: Object): Object {
      return { attrs };
    },

    setupLayoutScope(scope: Scope, layout: Template, yielded: Template) {
      if (!yielded.isEmpty) {
        scope.bindLocal(LITERAL('hasBlock'), true);
        if (yielded.arity) {
          scope.bindLocal(LITERAL('hasBlockParams'), true);
        }
      }
    },

    updateObjectFromAttrs(component: any, attrs: Object) {
      set(component, 'attrs', attrs);
    },

    allowedForSyntax(component: Component, syntax: StatementSyntax): boolean {
      return syntax instanceof ComponentSyntax;
    },

    hooks: new HookIntrospection(hooks),
    layout
  };
}

class CurlyComponent extends ComponentSyntax {
  private args: ParamsAndHash;

  withArgs(args: ParamsAndHash): CurlyComponent {
    this.args = args;
    return this;
  }

  evaluate(stack: ElementStack, frame: Frame): Morph {
    let { path: ref, hash, templates } = this;
    let definition = frame.getComponentDefinition(ref.path(), this);

    let layout = definition.layout.clone();
    layout.statements.unshift(builders.openElement('div'));
    layout.statements.push(builders.closeElement());

    definition = assign({}, definition);
    definition.layout = layout;

    let template = templates._default;
    let attrs = this.hash;

    return stack.createContentMorph(ComponentMorph, { definition, attrs, template }, frame);
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