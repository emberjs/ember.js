import {
  ATTRIBUTE_SYNTAX,
  Block,
  Scope,
  Helper,
  Template,
  DOMHelper,
  Environment,
  Component,
  AppendingComponent,
  ComponentClass,
  ComponentDefinition,
  ComponentDefinitionOptions,
  StatementSyntax,
  AttributeSyntax,
  OpenElement,
  BlockSyntax,
  ParamsAndHash,
  EvaluatedHash,
  ElementStack,
  Frame,
  ContentMorph,
  Templates,
  MorphList
} from 'htmlbars-runtime';

import {
  compileSpec
} from 'htmlbars-compiler';

import {
  Meta,
  ConstReference,
  setProperty as set
} from 'htmlbars-reference';

import {
  LITERAL,
  InternedString,
  Dict,
  dict
} from 'htmlbars-util';

import EmberObject from 'htmlbars-object';

export function compile(template: string) {
  let spec = compileSpec(template, { disableComponentGeneration: true });
  return Template.fromSpec(JSON.parse(spec));
}

abstract class DemoAppendingComponent extends AppendingComponent {
  protected setupLayoutScope(scope: Scope<DemoScopeOptions>, component: Component) {
    super.setupLayoutScope(scope, component);
    scope.bindHostOptions({ component });

    let template = this.templates && this.templates.default;

    if (this.templateIsPresent(template)) {
      scope.bindLocal(LITERAL('hasBlock'), true);

      if (template.arity > 0) scope.bindLocal(LITERAL('hasBlockParams'), true);
    }
  }

  protected augmentBlockScope(blockScope: Scope<DemoScopeOptions>, parentScope: Scope<DemoScopeOptions>, component: Component) {
    blockScope.bindHostOptions({ component });
  }

  abstract update(component: Component, hash: EvaluatedHash);
  protected abstract createComponent(attrs: Dict<any>, parentScope: Scope<any>): Component;
  protected abstract templateIsPresent(template: Template): boolean;
}

class GlimmerAppendingComponent extends DemoAppendingComponent {
  protected attributes: Template = null;

  begin(stack: ElementStack, { frame, templates, hash, tag }: ComponentDefinitionOptions) {
    this.attributes = templates && templates.attributes;
    super.begin(stack, { frame, templates, hash, tag });
  }

  protected createComponent(attrs: Dict<any>, parentScope: Scope<DemoScopeOptions>): Component {
    let parentOptions = parentScope.getHostOptions();
    let parentComponent = parentOptions && parentOptions.component;
    return new this.ComponentClass({ attrs, parentView: parentComponent });
  }

  protected layoutWithAttrs(invokeFrame: Frame) {
    let attrSyntax = this.attributes && <AttributeSyntax[]>this.attributes.statements;
    let outers = attrSyntax && attrSyntax.map(s => s.asEvaluated(invokeFrame));
    let identity = this.tag;

    return templateWithAttrs(this.layout, { identity, outers });
  }

  protected templateIsPresent(template: Template): boolean {
    return template && !template.isEmpty;
  }

  update(component: Component, hash: EvaluatedHash) {
    set(component, 'attrs', hash.value());
  }
}

interface TemplateWithAttrsOptions {
  defaults?: AttributeSyntax[];
  outers?: AttributeSyntax[];
  identity?: InternedString;
}

function templateWithAttrs(template: Template, { defaults, outers, identity }: TemplateWithAttrsOptions): Template {
  let out = [];

  let statements = template.statements;
  let i = 0;
  for (let l=statements.length; i<l; i++) {
    let item = statements[i];

    if (item.type === 'open-element') {
      let tag = <OpenElement>item;
      if (tag.tag === identity) out.push(tag.toIdentity());
      else out.push(tag);
      break;
    } else if (item.type === 'open-primitive-element') {
      out.push(item);
      break;
    }

    out.push(item);
  }

  i++;
  let seen = dict<boolean>();
  let attrs = [];

  if (outers) {
    outers.forEach(attr => {
      seen[attr.name] = true;
      attrs.push(attr);
    });
  }

  out.push(...attrs);

  for (let l=statements.length; i<l; i++) {
    let item = statements[i];
    if (item.type === 'add-class') {
      out.push(item);
    } else if (item[ATTRIBUTE_SYNTAX]) {
      if (!seen[(<AttributeSyntax>item).name]) {
        out.push(item);
        seen[(<AttributeSyntax>item).name] = true;
      }
    } else {
      break;
    }
  }

  if (defaults) {
    defaults.forEach(item => {
      if (item.type !== 'add-class' && seen[item.name]) return;
      out.push(item);
    });
  }

  out.push(...statements.slice(i));

  return Template.fromStatements(out);
}

interface DemoScopeOptions {
  component: Component;
}

class DemoScope extends Scope<DemoScopeOptions> {
  private hostOptions: DemoScopeOptions = null;

  child(localNames: InternedString[]): DemoScope {
    return new DemoScope(this, this.meta, localNames);
  }

  bindHostOptions(options: DemoScopeOptions) {
    this.hostOptions = options;
  }

  getHostOptions(): DemoScopeOptions {
    return this.hostOptions || (this.parent && this.parent.getHostOptions());
  }
}

export class DemoEnvironment extends Environment<DemoScopeOptions> {
  private helpers = {};
  private components = dict<ComponentDefinition>();

  constructor(doc: HTMLDocument=document) {
    super(new DOMHelper(doc), Meta);
  }

  registerHelper(name, helper) {
    this.helpers[name] = helper;
  }

  registerComponent(name: string, Component: ComponentClass, layout: Template) {
    this.components[name] = new ComponentDefinition(null, Component, layout, GlimmerAppendingComponent);
  }

  createRootScope(): DemoScope {
    return new DemoScope(null, this.meta, []);
  }

  statement<Options>(statement: StatementSyntax): StatementSyntax {
    if (statement.type === 'block') {
      let block = <BlockSyntax>statement;
      if (block.path.length === 1 && block.path[0] === 'each') {
        return new EachSyntax({ args: block.args, templates: block.templates });
      }
    }

    return super.statement(statement);
  }

  hasHelper(scope, helperName) {
    return helperName.length === 1 && helperName[0] in this.helpers;
  }

  lookupHelper(scope, helperName) {
    return new ConstReference(this.helpers[helperName[0]]);
  }

  getComponentDefinition(scope, name: string[]): ComponentDefinition {
    return this.components[name[0]];
  }
}

export let EmberComponent = EmberObject.extend();

export class MyComponent implements Component {
  public attrs: Object;

  constructor(attrs: Object) {
    this.attrs = attrs;
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