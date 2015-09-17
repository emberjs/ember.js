import { RegionMorph, EmptyInsertion } from "./region";
import { HelperParamsReference } from "../reference";
import { assert } from "../../htmlbars-util";

export class SimpleBlockMorph extends RegionMorph {
  init({ template }) {
    super.init();
    this._template = template;
    this._lastResult = null;
    this._yieldableBlock = null;
  }

  append() {
    this._lastResult = this._template.renderIn(this, this._frame);
  }

  update(strategy) {
    this._lastResult.revalidateWith(this._frame, strategy);
  }
}

export class ScopedBlockMorph extends RegionMorph {
  init({ template, self, blockArguments }) {
    super.init();
    this._template = template;
    this._self = self;
    this._blockArguments = blockArguments;
  }

  append() {
    this._lastResult = this._template.renderIn(this, this._frame);
  }
}

export class BlockHelperMorph extends RegionMorph {
  init({ path, params, templates }) {
    super.init();
    let _frame = this._frame;

    this._params = HelperParamsReference.fromStatements({ params, frame: _frame });
    this._group = new YieldableTemplates(templates, { morph: this, frame: _frame, blockKind: appendBlock });
    this._helper = _frame.lookupHelper(path);
  }

  _invokeHelper() {
    let { params, hash } = this._params.value();
    let _group = this._group;

    _group.begin();
    this._helper.call(undefined, params, hash, { template: _group.default, inverse: _group.inverse });
    _group.commit();

    return _group.rendered;
  }

  render() {
    let rendered = this._invokeHelper();
    if (!rendered) this._region.replace(new EmptyInsertion());
  }
}

class YieldableTemplates {
  constructor({ _default: defaultTemplate, _inverse: inverseTemplate }, { morph, frame, blockKind }) { // jshint ignore:line
    this.default = blockKind({ morph, frame, template: defaultTemplate, group: this });
    this.inverse = blockKind({ morph, frame, template: inverseTemplate, group: this });
    this.rendered = false;
  }

  begin() {
    this.rendered = false;
  }

  commit() {
    this.blockKind = updateBlock;
  }
}

class YieldableTemplate {
  constructor(template, morph, frame, group) {
    this._template = template;
    this._morph = morph;
    this._frame = frame;
    this._group = group;
  }

  render() {
    this._group.rendered = true;
    this._morph.renderTemplate(this._template);
  }
}

class YieldableTemplateWithoutLocals extends YieldableTemplate {
  append(self, blockArguments) {
    assert(!blockArguments, "This template doesn't have locals, so you can't yield block arguments to it");
    if (self !== undefined) {
      this._frame.childScope().bindSelf(self);
    }
  }

  update(self, blockArguments) {
    assert(!blockArguments, "This template doesn't have locals, so you can't yield block arguments to it");
    if (self !== undefined) {
      this._frame.scope().updateSelf(self);
    }
  }
}

class YieldableTemplateWithLocals extends YieldableTemplate {
  append(self, blockArguments) {
    let scope = this._frame.childScope(this._template.locals);
    if (self !== undefined) { scope.bindSelf(self); }
    scope.bindLocals(blockArguments);
  }

  update(self, blockArguments) {
    let scope = this._frame.scope();
    if (self !== undefined) { scope.updateSelf(self); }
    scope.updateLocals(blockArguments);
  }
}

function appendBlock({ morph, frame, template, group }) {
  if (!template) return null; // TODO: specialize better
  let Type = template.arity ? YieldableTemplateWithLocals : YieldableTemplateWithoutLocals;
  let block = morph.yieldableBlock = new Type(template, morph, frame, group);

  return {
    arity: template.arity,
    yield(blockArguments, self) {
      block.append(self, blockArguments);
      block.render();
    }
  };
}

function updateBlock(template, morph) {
  if (!template) return null; // TODO: specialize better
  let block = morph.yieldableBlock;

  return {
    arity: template.arity,
    yield(blockArguments, self) {
      block.update(self, blockArguments);
      block.render();
    }
  };
}


export class ListBlockMorph {

}
