// import { RegionMorph, EmptyInsertion } from "./region";
import { Morph, HasParentNode } from '../morph';
import { HelperParamsReference } from "../reference";
import { ChainableReference, ConstReference } from 'htmlbars-reference';
import { assert } from "htmlbars-util";
import Template, { EvaluatedParamsAndHash, Templates } from '../template';
import { ElementStack } from '../builder';
import { Helper, Frame } from '../environment';

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

export class BlockHelperMorph extends Morph<BlockHelperOptions> {
  private helper: ConstReference<Helper>;
  private args: EvaluatedParamsAndHash;
  private templates: Templates;

  init({ helper, args, templates }: BlockHelperOptions) {
    this.helper = helper;
    this.args = args;
    this.templates = templates;
  }

  append(stack: ElementStack) {
    let helper = this.helper.value();
    let { params, hash } = this.args.value();
    let { _default, _inverse } = this.templates;
    let group = new Group(this, _default, _inverse);
    helper(params, hash, group);

    if (!group._rendered) {
      stack.appendComment('');
    }
  }

  update() {

  }

  // render() {
  //   let rendered = this._invokeHelper();
  //   if (!rendered) this._region.replace(new EmptyInsertion());
  // }
}

class Group {
  public template: YieldableTemplate;
  public inverse: YieldableTemplate;
  public _rendered: boolean = false;

  constructor(morph: Morph<any>, template: Template, inverse: Template) {
    this.template = new YieldableTemplate(template, morph, this);
    this.inverse = new YieldableTemplate(inverse, morph, this);
  }
}

class YieldableTemplate  {
  private template: Template;
  private morph: Morph<any>;
  private group: Group;

  constructor(template: Template, morph: Morph<any>, group: Group) {
    this.template = template;
    this.morph = morph;
    this.group = group;
  }

  yield(blockArguments: any[]=null, self: any=undefined) {
    this.group._rendered = true;

    if (blockArguments || self) {
      let childScope = this.morph.frame.childScope(blockArguments);
      if (self !== undefined) childScope.bindSelf(self);
    }

    this.template.evaluate(this.morph, this.morph.frame);
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
