// import { RegionMorph, EmptyInsertion } from "./region";
import { Morph, TemplateMorph, HasParentNode, clear } from '../morph';
import { ChainableReference, ConstReference } from 'htmlbars-reference';
import { assert } from "htmlbars-util";
import Template, { EvaluatedParamsAndHash, Templates } from '../template';
import { ElementStack } from '../builder';
import { Helper, Frame } from '../environment';
import { RenderResult } from '../render';

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

  append(stack: ElementStack) {
    super.append(stack);
    let helper = this.helper.value();
    let { params, hash } = this.args.value();
    let { _default, _inverse } = this.templates;
    let group = this.group = new Group(this, _default, _inverse);
    helper(params, hash, group);

    group.commitAppend(stack);
  }

  update() {
    let helper = this.helper.value();
    let { params, hash } = this.args.value();
    helper(params, hash, this.group);

    this.group.commitUpdate();
  }
}

class Group {
  public template: YieldableTemplate;
  public inverse: YieldableTemplate;
  private comment: Comment = null;
  private morph: BlockHelperMorph;

  constructor(morph: BlockHelperMorph, template: Template, inverse: Template) {
    this.template = new YieldableTemplate(template, morph, this);
    this.inverse = new YieldableTemplate(inverse, morph, this);
    this.morph = morph;
  }

  commit(): boolean {
    let templateRendered = this.template.commit();
    let inverseRendered = this.inverse.commit();

    return templateRendered || inverseRendered;
  }

  commitAppend(stack: ElementStack) {
    let rendered = this.commit();
    if (!rendered) this.morph.didBecomeEmpty();
  }

  commitUpdate() {
    let rendered = this.commit();
    if (!rendered) this.morph.didBecomeEmpty();
  }

  appendTemplate(template: Template) {
    this.morph.appendTemplate(template);
  }

  updateTemplate(template: Template) {
    this.morph.updateTemplate(template);
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
    if (blockArguments || self) {
      let childScope = this.morph.frame.childScope(this.template.locals);
      if (self !== undefined) childScope.bindSelf(self);
      if (blockArguments) childScope.bindLocals(blockArguments);
    }

    this.group.appendTemplate(this.template);
  }

  update(blockArguments: any[]=null, self: any=undefined) {
    this.group.updateTemplate(this.template);
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