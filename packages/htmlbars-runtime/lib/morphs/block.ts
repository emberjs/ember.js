// import { RegionMorph, EmptyInsertion } from "./region";
import { Morph, ContentMorph, HasParentNode, clear } from '../morph';
import { HelperParamsReference } from "../reference";
import { ChainableReference, ConstReference } from 'htmlbars-reference';
import { assert } from "htmlbars-util";
import Template, { EvaluatedParamsAndHash, Templates } from '../template';
import { ElementStack } from '../builder';
import { Helper, Frame } from '../environment';
import { RenderResult } from '../render';

// export class SimpleBlockMorph extends RegionMorph {
//   init({ template }) {
//     super.init();
//     this._template = template;
//     this._lastResult = null;
//     this._yieldableBlock = null;
//   }

//   append() {
//     this._lastResult = this._template.evaluate(this, this._frame);
//   }

//   update(strategy) {
//     this._lastResult.revalidateWith(this._frame, strategy);
//   }
// }

// export class ScopedBlockMorph extends RegionMorph {
//   init({ template, self, blockArguments }) {
//     super.init();
//     this._template = template;
//     this._self = self;
//     this._blockArguments = blockArguments;
//   }

//   append() {
//     this._lastResult = this._template.evaluate(this, this._frame);
//   }
// }

export interface BlockHelperOptions {
  helper: ConstReference<Helper>,
  args: EvaluatedParamsAndHash,
  templates: Templates
}

export class BlockHelperMorph extends ContentMorph<BlockHelperOptions> {
  private helper: ConstReference<Helper>;
  private args: EvaluatedParamsAndHash;
  private templates: Templates;
  private group: Group;

  init({ helper, args, templates }: BlockHelperOptions) {
    this.helper = helper;
    this.args = args;
    this.templates = templates;
  }

  firstNode() {
    return this.group.lastResult.firstNode();
  }

  lastNode() {
    return this.group.lastResult.lastNode();
  }

  append(stack: ElementStack) {
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
  public lastResult: RenderResult = null;
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

    if (!rendered) {
      this.comment = stack.appendComment('');
    }
  }

  commitUpdate() {
    let rendered = this.commit();

    if (this.lastResult && this.comment) {
      this.comment.parentNode.removeChild(this.comment);
      this.comment = null;
    } else if (!rendered && !this.comment) {
      let dom = this.morph.frame.dom();

      let comment = dom.createComment('');
      // if we didn't render this time, and we don't have
      // a comment, that means we rendered last time.
      let nextSibling = clear(this.lastResult);
      this.lastResult = null;

      dom.insertBefore(this.morph.parentNode, comment, nextSibling)
      this.comment = comment;
    }
  }

  renderTemplate(template: Template) {
    if (this.lastResult) {
      this.lastResult.renderTemplate(template);
    } else {
      this.lastResult = template.evaluate(this.morph, this.morph.frame);
    }
  }
}

class YieldableTemplate  {
  private template: Template;
  private morph: Morph<any>;
  private group: Group;
  private rendered = false;
  private updating = false;

  constructor(template: Template, morph: Morph<any>, group: Group) {
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

    this.group.lastResult = this.template.evaluate(this.morph, this.morph.frame);
  }

  update(blockArguments: any[]=null, self: any=undefined) {
    this.group.renderTemplate(this.template);
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

// class YieldableTemplates {
//   constructor({ _default: defaultTemplate, _inverse: inverseTemplate }, { morph, frame, blockKind }) { // jshint ignore:line
//     this.default = blockKind({ morph, frame, template: defaultTemplate, group: this });
//     this.inverse = blockKind({ morph, frame, template: inverseTemplate, group: this });
//     this.rendered = false;
//   }

//   begin() {
//     this.rendered = false;
//   }

//   commit() {
//     this.blockKind = updateBlock;
//   }
// }

// class YieldableTemplate {
//   constructor(template, morph, frame, group) {
//     this._template = template;
//     this._morph = morph;
//     this._frame = frame;
//     this._group = group;
//   }

//   render() {
//     this._group.rendered = true;
//     this._morph.renderTemplate(this._template);
//   }
// }

// class YieldableTemplateWithoutLocals extends YieldableTemplate {
//   append(self, blockArguments) {
//     assert(!blockArguments, "This template doesn't have locals, so you can't yield block arguments to it");
//     if (self !== undefined) {
//       this._frame.childScope().bindSelf(self);
//     }
//   }

//   update(self, blockArguments) {
//     assert(!blockArguments, "This template doesn't have locals, so you can't yield block arguments to it");
//     if (self !== undefined) {
//       this._frame.scope().updateSelf(self);
//     }
//   }
// }

// class YieldableTemplateWithLocals extends YieldableTemplate {
//   append(self, blockArguments) {
//     let scope = this._frame.childScope(this._template.locals);
//     if (self !== undefined) { scope.bindSelf(self); }
//     scope.bindLocals(blockArguments);
//   }

//   update(self, blockArguments) {
//     let scope = this._frame.scope();
//     if (self !== undefined) { scope.updateSelf(self); }
//     scope.updateLocals(blockArguments);
//   }
// }

// function appendBlock({ morph, frame, template, group }) {
//   if (!template) return null; // TODO: specialize better
//   let Type = template.arity ? YieldableTemplateWithLocals : YieldableTemplateWithoutLocals;
//   let block = morph.yieldableBlock = new Type(template, morph, frame, group);

//   return {
//     arity: template.arity,
//     yield(blockArguments, self) {
//       block.append(self, blockArguments);
//       block.render();
//     }
//   };
// }

// function updateBlock(template, morph) {
//   if (!template) return null; // TODO: specialize better
//   let block = morph.yieldableBlock;

//   return {
//     arity: template.arity,
//     yield(blockArguments, self) {
//       block.update(self, blockArguments);
//       block.render();
//     }
//   };
// }


// export class ListBlockMorph {

// }
