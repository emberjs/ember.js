import TemplateVisitor from "./template-visitor";
import { assert } from "./utils";
import { getAttrNamespace } from "htmlbars-util";
import { isHelper } from "htmlbars-syntax";
import { struct, types } from "htmlbars-util";

type Statement = any;

class Template {
  statements: Statement[] = null;
  locals: string[] = null;
  meta: Object = null;
  arity: number = null;
}

type RawExpression = string | number | boolean;
type Expression = RawExpression | RawExpression[];

class JavaScriptCompiler {
  static process(opcodes): Template[] {
    let compiler = new JavaScriptCompiler(opcodes);
    compiler.process();
    return compiler.templates;
  }

  private opcodes: any[];
  private output: any[];
  private expressions: Expression[];
  private templates: any[];
  private locals: string[] = null;

  constructor(opcodes) {
    this.opcodes = opcodes;
    this.output = [];
    this.expressions = [];
    this.templates = [];
  }

  process() {
    this.opcodes.forEach(([opcode, ...args]) => {
      if (!this[opcode]) { throw new Error(`unimplemented ${opcode} on JavaScriptCompiler`); }
      this[opcode](...args);
    });
  }

  /// Nesting

  startProgram([program]) {
    this.locals = program.blockParams;
  }

  endProgram() {
    let template = new Template();
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

  text(content: string) {
    this.push('text', content);
  }

  append(trusted: boolean) {
    this.push('append', this.popExpression(), trusted);
  }

  comment(value: string) {
    this.push('comment', value);
  }

  modifier(path: string) {
    let params = this.popExpression();
    let hash = this.popExpression();

    this.push('modifier', path, params, hash);
  }

  block(path: string, template: number, inverse: number) {
    let params = this.popExpression();
    let hash = this.popExpression();

    this.push('block', path, params, hash, template, inverse);
  }

  component(tag: string, template: number) {
    let attrs = this.popExpression();
    this.push('component', tag, attrs, template);
  }

  openElement(tag: string, blockParams: string[]) {
    this.push('openElement', tag, blockParams);
  }

  closeElement() {
    this.push('closeElement');
  }

  addClass(name: string) {
    let value = this.popExpression();
    this.push('addClass', value);
  }

  staticAttr(name: string, namespace: string) {
    let value = this.popExpression();
    this.push('staticAttr', name, value, namespace);
  }

  dynamicAttr(name: string, namespace: string) {
    let value = this.popExpression();
    this.push('dynamicAttr', name, value, namespace);
  }

  dynamicProp(name: string) {
    let value = this.popExpression();
    this.push('dynamicProp', name, value);
  }

  /// Expressions

  literal(value: any) {
    this.pushValue(value);
  }

  unknown(path: string, unsafe: boolean = null) {
    this.pushExpression('unknown', path);
  }

  get(path: string) {
    this.pushExpression('get', path);
  }

  concat() {
    this.pushExpression('concat', this.popExpression());
  }

  helper(path: string) {
    let params = this.popExpression();
    let hash = this.popExpression();

    this.pushExpression('helper', path, params, hash);
  }

  /// Stack Management Opcodes

  pushLiteral(literal: any) {
    this.pushValue(literal);
  }

  prepareArray(size: number) {
    let values = [];

    for (let i = 0; i < size; i++) {
      values.push(this.popExpression());
    }

    this.pushValue(values);
  }

  prepareObject(size: number) {
    assert(this.expressions.length >= size, `Expected ${size} expressions on the stack, found ${this.expressions.length}`);

    let pairs = [];

    for (let i = 0; i < size; i++) {
      pairs.push(this.popExpression(), this.popExpression());
    }

    this.pushValue(pairs);
  }

  /// Utilities

  push(name: string, ...args: Expression[]) {
    while (args[args.length - 1] === null) {
      args.pop();
    }

    this.output.push([name, ...args]);
  }

  pushExpression(name: string, ...args: Expression[]) {
    let expr = [name, ...args];
    this.expressions.push(<any>[name, ...args]);
  }

  pushValue(val: any) {
    this.expressions.push(val);
  }

  popExpression(): Expression {
    assert(this.expressions.length, "No expression found on stack");
    return this.expressions.pop();
  }
}

export default class TemplateCompiler {
  static compile(options, ast) {
    let templateVisitor = new TemplateVisitor();
    templateVisitor.visit(ast);

    let compiler = new TemplateCompiler(options);
    let opcodes = compiler.process(templateVisitor.actions);
    return JavaScriptCompiler.process(opcodes);
  }

  private options: Object;
  private templateId = 0;
  private templateIds: number[] = [];
  private templates: any[] = [];
  private childTemplates: any[] = [];
  private opcodes: any[] = [];
  private includeMeta = false;

  constructor(options: Object = {}) {
    this.options = options;
  }

  process(actions): any[] {
    actions.forEach(([name, ...args]) => {
      if (!this[name]) { throw new Error(`Unimplemented ${name} on TemplateCompiler`); }
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
    this.opcode('openElement', action, action.tag, action.blockParams);

    action.attributes.forEach(attr => this.attribute([attr]));
    action.modifiers.forEach(modifier => this.modifier([modifier]));
  }

  closeElement() {
    this.opcode('closeElement', null);
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

  attribute([action]) {
    let { name, value } = action;

    let namespace = getAttrNamespace(name);

    let isStatic = this.prepareAttributeValue(value);

    // REFACTOR TODO: escaped?
    if (name === 'class') {
      this.opcode('addClass', action);
    } else if (isStatic) {
      this.opcode('staticAttr', action, name, namespace);
    } else if (action.value.type === 'MustacheStatement') {
      this.opcode('dynamicProp', action, name);
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
    if (isHelper(action)) {
      this.SubExpression(action);
    } else {
      this.ambiguous([action]);
    }

    this.opcode('append', action, !action.escaped);
  }

  block([action/*, index, count*/]) {
    this.prepareHelper(action);
    let templateId = this.templateIds.pop();
    let inverseId = action.inverse === null ? null : this.templateIds.pop();
    this.opcode('block', action, action.path.parts, templateId, inverseId);
  }

  /// Internal actions, not found in the original processed actions

  attributeMustache([action]) {
    let { path } = action;
    if (isHelper(action)) {
      this.prepareHelper(action);
      this.opcode('helper', action, path.parts);
    } else if (path.type === 'PathExpression') {
      this.opcode('get', action, path.parts);
    } else {
      this.opcode('literal', action, path.value);
    }
  }

  ambiguous([action]) {
    this.opcode('unknown', action, action.path.parts);
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
        assert(this[param.type], `Unimplemented ${param.type} on TemplateCompiler`);
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

      assert(this[value.type], `Unimplemented ${value.type} on TemplateCompiler`);
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