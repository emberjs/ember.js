// import { RegionMorph, EmptyInsertion } from "./region";
import { Morph, TemplateMorph, HasParentNode, clear } from '../morph';
import { ChainableReference, ConstReference } from 'htmlbars-reference';
import { assert } from "htmlbars-util";
import Template, { EvaluatedParamsAndHash, Templates } from '../template';
import { ElementStack } from '../builder';
import { Helper, Frame, Scope } from '../environment';
import { RenderResult } from '../render';
import { VM } from '../vm';

export interface BlockHelperOptions {
  helper: ConstReference<Helper>,
  args: EvaluatedParamsAndHash,
  templates: Templates
}

export class BlockHelperMorph extends TemplateMorph {
  private helper: ConstReference<Helper>;
  private args: EvaluatedParamsAndHash;
  private templates: Templates;
  private group: Group;

  init({ helper, args, templates }: BlockHelperOptions) {
    this.helper = helper;
    this.args = args;
    this.templates = templates;
  }

  append(stack: ElementStack, vm: VM<any>) {
    this.willAppend(stack);
    let helper = this.helper.value();
    let { params, hash } = this.args.value();
    let { default: _default, inverse } = this.templates;
    let group = this.group = new Group(this, stack, vm, _default, inverse);
    helper(params, hash, group);

    group.commitAppend(stack);
  }

  update() {
    let helper = this.helper.value();
    let { params, hash } = this.args.value();
    helper(params, hash, this.group);

    this.group.commitUpdate();
  }

  protected setupScope(attrs: any) {
    this.frame.childScope().init(attrs);
  }

  protected updateScope(attrs: any) {
    this.frame.scope().update(attrs);
  }
}

class Group {
  public template: YieldableTemplate;
  public inverse: YieldableTemplate;
  private stack: ElementStack;
  private comment: Comment = null;
  private morph: BlockHelperMorph;
  public vm: VM<any>;

  constructor(morph: BlockHelperMorph, stack: ElementStack, vm: VM<any>, template: Template, inverse: Template) {
    this.template = new YieldableTemplate(template, morph, this);
    this.inverse = new YieldableTemplate(inverse, morph, this);
    this.stack = stack;
    this.morph = morph;
    this.vm = vm;
  }

  commit(): boolean {
    let templateRendered = this.template.commit();
    let inverseRendered = this.inverse.commit();

    return templateRendered || inverseRendered;
  }

  commitAppend(stack: ElementStack) {
    let rendered = this.commit();
    this.vm = null;
    if (!rendered) this.morph.didBecomeEmpty();
  }

  commitUpdate() {
    let rendered = this.commit();
    if (!rendered) this.morph.didBecomeEmpty();
  }

  appendTemplate(template: Template, attrs: Object) {
    this.morph.appendTemplate(template, this.vm, attrs);
  }

  updateTemplate(template: Template, attrs: Object) {
    this.morph.updateTemplate(template, attrs);
  }
}

class YieldableTemplate  {
  private template: Template;
  private morph: TemplateMorph;
  private group: Group;
  private rendered = false;
  private updating = false;

  constructor(template: Template, morph: TemplateMorph, group: Group) {
    this.template = template;
    this.morph = morph;
    this.group = group;
  }

  get arity() {
    return this.template.arity;
  }

  commit(): boolean {
    this.updating = true;
    let rendered = this.rendered;
    this.rendered = false;
    return rendered;
  }

  append(blockArguments: any[]=null, self: any=undefined) {
    let localNames = this.template.locals;
    this.group.appendTemplate(this.template, { self, localNames, blockArguments });
  }

  update(blockArguments: any[]=null, self: any=undefined) {
    let localNames = this.template.locals;
    this.group.updateTemplate(this.template, { self, localNames, blockArguments });
  }

  yield(blockArguments: any[]=null, self: any=undefined) {
    if (!this.template) return;

    this.rendered = true;

    if (this.updating) {
      this.update(blockArguments, self);
    } else {
      this.append(blockArguments, self);
    }
  }
}