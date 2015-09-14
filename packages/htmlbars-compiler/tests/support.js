import { Environment } from "../htmlbars-runtime/hooks";
import { BaseReference, Reference } from "../htmlbars-runtime/reference";

export class TestBaseReference extends BaseReference {
  get(key) {
    return new TestPropertyReference(this._value, key);
  }
}

export class TestPropertyReference extends Reference {
  constructor(object, key) {
    super();
    this._object = object;
    this._key = key;
    this._lastValue = null;
  }

  isDirty() {
    return this._object[this._key] !== this._lastValue;
  }

  value() {
    return this._object[this._key];
  }
}

export class TestEnvironment extends Environment {
  constructor(options) {
    super(options);
    this._helpers = {};
  }

  registerHelper(name, helper) {
    this._helpers[name] = helper;
  }

  hasHelper(scope, helperName) {
    return helperName.length === 1 && helperName[0] in this._helpers;
  }

  lookupHelper(scope, helperName) {
    return this._helpers[helperName[0]];
  }
}

/*
class SyntaxExtension {
  matches() {
    throw new Error("matches() unimplemented for syntax extension");
  }

  // produces the new piece of syntax
  convert() { }
}

class BlockIfExtension extends SyntaxExtension {
  matches(sexp) {
    if (sexp[0] !== 'block') return;
    return sexp[1].length === 1 && sexp[1][0] === 'if';
  }

  convert(sexp) {
    let [,,...rest] = sexp;

    return ['ember-if', ...rest];
  }
}

class BlockIf extends DynamicExpression {
  static fromSpec(node, children) {
    let [, params, templateId, inverseId] = node;

    return new BlockIf({
      condition: new Ref(path),
      templates: templatesFromSpec(templateId, inverseId, children);
    });
  }

  constructor({ condition, params, templates }) {
    this._condition = condition;
    this._templates = templates;
  }

  evaluate(stack) {
    return stack.createMorph(BlockIfMorph, { condition: this._condition, templates: this_templates });
  }
}

class BlockIfMorph extends RegionMorph {
  static specialize(statement) {
    let { _templates: { template, inverse } } = statement;

    if (template && inverse) return BlockIfMorph;
    if (template) return ConsequentBlockIfMorph;
    if (inverse) return AlternateBlockIfMorph;
  }

  init({ condition, params, templates }) {
    super.init()
    this._condition = condition.evaluate(this._frame);
    this._templates = templates;
    this._lastValue = null;
  }

  append() {
    let { _condition, _templates: { template, inverse } } = this;
    let condition = this._lastValue = _condition.value();
    this._render(condition);
  }

  update() {
    let condition = _condition.value();
    if (condition === this._lastValue) return;

    this._region.clear();
    this._render(condition);
  }

  _render(condition) {
    let { _templates } = this;
    let selection = condition ? _templates.template : _templates.inverse;
    this._region.sync(selection.renderIn(this, this._frame));
  }
}

class ConsequentBlockIfMorph extends BlockIfMorph {
  append() {
    let { _condition, _templates: { template } } = this;
    let condition = this._lastValue = _condition.value();
    if (condition) this._render();
    else this._region.append(new EmptyInsertion())
  }

  update() {
    let condition = _condition.value();
    if (condition === this._lastValue) return;

    if (condition) this._render();
    else this._region.clear();
  }

  _render() {
    this._region.sync(template.renderIn(this, this._frame));
  }
}
*/
