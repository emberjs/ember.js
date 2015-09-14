import TemplateVisitor from "./template-visitor";
import { assert } from "./utils";
import { getAttrNamespace } from "../htmlbars-util";
import { isHelper } from "../htmlbars-syntax/utils";
import { struct } from "../htmlbars-util/object-utils";
import * as types from "../htmlbars-util/object-utils";

class NewJavaScriptCompiler {
  static process(opcodes) {
    let compiler = new NewJavaScriptCompiler(opcodes);
    compiler.process();
    return compiler.templates;
  }

  constructor(opcodes) {
    this.opcodes = opcodes;
    this.output = [];
    this.expressions = [];
    this.templates = [];
  }

  process() {
    this.opcodes.forEach(([opcode, ...args]) => {
      if (!this[opcode]) { throw new Error(`unimplemented ${opcode} on NewJavaScriptCompiler`); }
      this[opcode](...args);
    });
  }

  /// Nesting

  startProgram([program]) {
    this.locals = program.blockParams;
  }

  endProgram() {
    let template = {};
    // REFACTOR TODO: meta
    if (this.locals.length) {
      template.locals = this.locals;
      this.locals = [];
    }

    template.statements = this.output;
    this.output = [];

    this.templates.push(template);
  }

  /// Statements

  text(content) {
    this.push('text', content);
  }

  comment(value) {
    this.push('comment', value);
  }

  unknown(path, unsafe) {
    this.push('unknown', path, unsafe || null);
  }

  modifier(path) {
    let params = this.popExpression();
    let hash = this.popExpression();

    this.push('modifier', path, params, hash);
  }

  inline(path, unsafe) {
    let params = this.popExpression();
    let hash = this.popExpression();

    this.push('inline', path, params, hash, unsafe || null);
  }

  block(path, template, inverse) {
    let params = this.popExpression();
    let hash = this.popExpression();

    this.push('block', path, params, hash, template, inverse);
  }

  component(tag, template) {
    let attrs = this.popExpression();
    this.push('component', tag, attrs, template);
  }

  openElement(tag) {
    this.push('openElement', tag);
  }

  closeElement() {
    this.push('closeElement');
  }

  staticAttr(name, namespace) {
    let value = this.popExpression();
    this.push('staticAttr', name, value, namespace);
  }

  dynamicAttr(name, namespace) {
    let value = this.popExpression();
    this.push('dynamicAttr', name, value, namespace);
  }

  /// Expressions

  literal(value) {
    this.pushValue(value);
  }

  get(path) {
    this.pushExpression('get', path);
  }

  concat() {
    this.pushExpression('concat', this.popExpression());
  }

  helper(path) {
    let params = this.popExpression();
    let hash = this.popExpression();

    this.pushExpression('helper', path, params, hash);
  }

  /// Stack Management Opcodes

  pushLiteral(literal) {
    this.pushValue(literal);
  }

  prepareArray(size) {
    let values = [];

    for (let i = 0; i < size; i++) {
      values.push(this.popExpression());
    }

    this.pushValue(values);
  }

  prepareObject(size) {
    assert(this.expressions.length >= size, `Expected ${size} expressions on the stack, found ${this.expressions.length}`);

    let pairs = [];

    for (let i = 0; i < size; i++) {
      pairs.push(this.popExpression(), this.popExpression());
    }

    this.pushValue(pairs);
  }

  /// Utilities

  push(name, ...args) {
    while (args[args.length - 1] === null) {
      args.pop();
    }

    this.output.push([name, ...args]);
  }

  pushExpression(name, ...args) {
    this.expressions.push([name, ...args]);
  }

  pushValue(val) {
    this.expressions.push(val);
  }

  popExpression() {
    assert(this.expressions.length, "No expression found on stack");
    return this.expressions.pop();
  }

}
export class NewTemplateCompiler {
  static compile(options, ast) {
    let templateVisitor = new TemplateVisitor();
    templateVisitor.visit(ast);

    let compiler = new NewTemplateCompiler(options);
    let opcodes = compiler.process(templateVisitor.actions);
    return NewJavaScriptCompiler.process(opcodes);
  }

  constructor(options) {
    this.options = options || {};
    this.templateId = 0;
    this.templateIds = [];
    this.templates = [];
    this.childTemplates = [];
    this.opcodes = [];
    this.includeMeta = false;
  }

  process(actions) {
    actions.forEach(([name, ...args]) => {
      if (!this[name]) { throw new Error(`Unimplemented ${name} on NewTemplateCompiler`); }
      this[name](...args);
    });
    return this.opcodes;
  }

  startProgram(program) {
    this.templateId++;
    this.opcode('startProgram', program, program);
  }

  endProgram() {
    this.templateIds.push(this.templateId - 1);
    this.opcode('endProgram', null);
  }

  text([action]) {
    this.opcode('text', action, action.chars);
  }

  comment([action]) {
    this.opcode('comment', action, action.value);
  }

  openElement([action]) {
    this.opcode('openElement', action, action.tag);

    action.attributes.forEach(attr => this.attribute([attr]));
    action.modifiers.forEach(modifier => this.modifier([modifier]));
  }

  closeElement() {
    this.opcode('closeElement', null);
  }

  attribute([action]) {
    let { name, value } = action;
    let namespace = getAttrNamespace(name);

    let isStatic = this.prepareAttributeValue(value);

    // REFACTOR TODO: escaped?
    if (isStatic) {
      this.opcode('staticAttr', action, name, namespace);
    } else {
      this.opcode('dynamicAttr', action, name, namespace);
    }
  }

  modifier([action]) {
    let { path } = action;

    this.prepareHelper(action);
    this.opcode('modifier', action, path.parts);
  }

  mustache([action]) {
    let { path, escaped } = action;
    if (isHelper(action)) {
      this.prepareHelper(action);
      this.opcode('inline', action, path.parts, !escaped);
    } else {
      this.opcode('unknown', action, path.parts, !escaped);
    }
  }

  block([action/*, index, count*/]) {
    this.prepareHelper(action);
    let templateId = this.templateIds.pop();
    let inverseId = action.inverse === null ? null : this.templateIds.pop();
    this.opcode('block', action, action.path.parts, templateId, inverseId);
  }

  component([action]) {
    let { attributes, tag } = action;

    attributes.forEach(({ name, value }) => {
      this.prepareAttributeValue(value);
      this.opcode('pushLiteral', name, name);
    });

    this.opcode('prepareObject', null, attributes.length);

    this.opcode('component', action, tag, this.templateIds.pop());
  }

  /// Internal actions, not found in the original processed actions

  attributeMustache([action]) {
    let { path } = action;
    if (isHelper(action)) {
      this.prepareHelper(action);
      this.opcode('helper', action, path.parts);
    } else {
      this.opcode('get', action, path.parts);
    }
  }

  /// Expressions, invoked recursively from prepareParams and prepareHash

  SubExpression(expr) {
    this.prepareHelper(expr);
    this.opcode('helper', expr, expr.path.parts);
  }

  PathExpression(expr) {
    this.opcode('get', expr, expr.parts);
  }

  StringLiteral(action) {
    this.opcode('pushLiteral', null, action.value);
  }

  BooleanLiteral(action) {
    this.opcode('pushLiteral', null, action.value);
  }

  NumberLiteral(action) {
    this.opcode('pushLiteral', null, action.value);
  }

  NullLiteral(action) {
    this.opcode('pushLiteral', null, action.value);
  }

  UndefinedLiteral(action) {
    this.opcode('pushLiteral', null, action.value);
  }

  /// Utilities

  opcode(name, action, ...args) {
    let opcode = [name, ...args];
    if (this.includeMeta && action) {
      opcode.push(this.meta(action));
    }

    this.opcodes.push(opcode);
  }

  prepareHelper({ params, hash }) {
    this.prepareHash(hash);
    this.prepareParams(params);
  }

  preparePath(path) {
    this.opcode('pushLiteral', path, path.parts);
  }

  prepareParams(params) {
    if (!params.length) {
      this.opcode('pushLiteral', null,null);
      return;
    }

    for (var i = params.length - 1; i >= 0; i--) {
      var param = params[i];

      if (param.type === 'MustacheStatement') {
        this.attributeMustache([param]);
      } else {
        assert(this[param.type], `Unimplemented ${param.type} on NewTemplateCompiler`);
        this[param.type](param);
      }
    }

    this.opcode('prepareArray', null, params.length);
  }

  prepareHash(hash) {
    var pairs = hash.pairs;

    if (!pairs.length) {
      this.opcode('pushLiteral', null, null);
      return;
    }

    for (var i = pairs.length - 1; i >= 0; i--) {
      var key = pairs[i].key;
      var value = pairs[i].value;

      assert(this[value.type], `Unimplemented ${value.type} on NewTemplateCompiler`);
      this[value.type](value);
      this.opcode('pushLiteral', null, key);
    }

    this.opcode('prepareObject', null, pairs.length);
  }

  prepareAttributeValue(value) {
    // returns the static value if the value is static

    switch (value.type) {
      case 'TextNode':
        this.opcode('literal', value, value.chars);
        return true;
      case 'MustacheStatement':
        this.attributeMustache([value]);
        return false;
      case 'ConcatStatement':
        this.prepareParams(value.parts);
        this.opcode('concat', value);
        return false;
    }
  }

  meta(node) {
    let loc = node.loc;
    if (!loc) { return []; }

    let { source, start, end } = loc;
    return [ 'loc', [source || null, [start.line, start.column], [end.line, end.column]] ];
  }
}

export let Template = struct({
  meta: types.OBJECT,
  arity: types.NUMBER,
  locals: types.ARRAY,
  templates: types.ARRAY
});

