import { InternedString, Slice } from 'glimmer-util';

import {
  Templates,
  Args
} from '../syntax/core';

import {
  EvaluatedNamedArgs,
} from '../compiled/expressions/args';

import {
  Attribute as AttributeSyntax
} from '../syntax';

import { Layout } from '../compiled/blocks';
import { ComponentParts } from '../compiler';

import { VM } from '../vm';

import Environment from '../environment';
import SymbolTable from '../symbol-table';

export interface ComponentClass {
  new (attrs: Object): Component;
}

export interface Component {
  attrs: Object;
}

export interface ComponentHooks {
  begin(Component);
  commit(Component);

  didReceiveAttrs(Component);
  didUpdateAttrs(Component);

  didInsertElement(Component);

  willRender(Component);
  willUpdate(Component);
  didRender(Component);
  didUpdate(Component);
}

export interface ComponentDefinitionOptions {
  templates: Templates;
  attrs: EvaluatedNamedArgs;
  tag: InternedString;
}

export interface ComponentHooks {
  begin(Component: Component);
  commit(Component: Component);

  didReceiveAttrs(Component: Component);
  didUpdateAttrs(Component: Component);

  didInsertElement(Component: Component);

  willRender(Component: Component);
  willUpdate(Component: Component);
  didRender(Component: Component);
  didUpdate(Component: Component);
}

class NullHooks implements ComponentHooks {
  begin() {};
  commit() {};

  didReceiveAttrs() {};
  didUpdateAttrs() {};

  didInsertElement() {};

  willRender() {};
  willUpdate() {};
  didRender() {};
  didUpdate() {};
}

const NULL_HOOKS = new NullHooks();

export interface CompileComponentOptions {
  syntax: Slice<AttributeSyntax>;
  args: Args;
  locals: InternedString[];
  named: InternedString[];
}

export abstract class ComponentDefinition {
  public hooks: ComponentHooks;
  public ComponentClass: ComponentClass;
  public layout: Layout;

  didCreateElement(vm: VM) {}

  constructor(hooks: ComponentHooks, ComponentClass: ComponentClass, layout: Layout) {
    this.hooks = hooks || NULL_HOOKS;
    this.ComponentClass = ComponentClass;
    this.layout = layout;
  }

  abstract compile(options: { layout: Layout, env: Environment, symbolTable: SymbolTable }): ComponentParts;
}