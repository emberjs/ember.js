import TemplateVisitor from "./template-visitor";
import JavaScriptCompiler from "./javascript-compiler";
import { getAttrNamespace } from "glimmer-util";
import { isHelper } from "glimmer-syntax";
import { assert } from "glimmer-util";

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
    this.opcode('startProgram', program, program);
  }

  endProgram() {
    this.opcode('endProgram', null);
  }

  startBlock(program) {
    this.templateId++;
    this.opcode('startBlock', program, program);
  }

  endBlock() {
    this.templateIds.push(this.templateId - 1);
    this.opcode('endBlock', null);
  }

  text([action]) {
    this.opcode('text', action, action.chars);
  }

  comment([action]) {
    this.opcode('comment', action, action.value);
  }

  openElement([action]) {
    this.opcode('openElement', action, action.tag, action.blockParams);
    for (let i = 0; i < action.attributes.length; i++) {
      this.attribute([action.attributes[i]]);
    }

    for (let i = 0; i < action.modifiers.length; i++) {
      this.modifier([action.modifiers[i]]);
    }
  }

  closeElement() {
    this.opcode('closeElement', null);
  }

  attribute([action]) {
    let { name, value } = action;

    let namespace = getAttrNamespace(name);

    let isStatic = this.prepareAttributeValue(value);

    if (isStatic) {
      this.opcode('staticAttr', action, name, namespace);
    } else if (action.value.type === 'MustacheStatement') {
      assert(name.indexOf(':') === -1, `Namespaced attributes cannot be set as props. Perhaps you meant ${name}="{{title}}"`);
      this.opcode('dynamicProp', action, name);
    } else {
      this.opcode('dynamicAttr', action, name, namespace);
    }
  }

  modifier([action]) {
    let { path: { parts } } = action;

    this.prepareHelper(action);
    this.opcode('modifier', action, parts);
  }

  mustache([action]) {
    if (isYield(action)) {
      let to = assertValidYield(action);
      return this.yield(to, action);
    } else if (isHasBlock(action)) {
      let name = assertValidHasBlock(action);
      this.hasBlock(name, action);
    } else if (isHasBlockParams(action)) {
      let name = assertValidHasBlockParams(action);
      this.hasBlockParams(name, action);
    } else if (action.path.data) {
      this.attr([action.path]);
    } else if (isHelper(action)) {
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
    if (path.data) {
      this.attr([action.path]);
    } else if (isHasBlock(action)) {
      let name = assertValidHasBlock(action);
      this.hasBlock(name, action);
    } else if (isHasBlockParams(action)) {
      let name = assertValidHasBlockParams(action);
      this.hasBlockParams(name, action);
    } else if (isHelper(action)) {
      this.prepareHelper(action);
      this.opcode('helper', action, path.parts);
    } else if (path.type === 'PathExpression') {
      this.opcode('get', action, path.parts);
    } else {
      this.opcode('literal', action, path.value);
    }
  }

  attr([path]) {
    let { parts } = path;
    this.opcode('attr', path, parts);
  }

  ambiguous([action]) {
    this.opcode('unknown', action, action.path.parts);
  }

  /// Internal Syntax

  yield(to: string, action) {
    this.prepareParams(action.params);
    this.opcode('yield', action, to);
  }

  hasBlock(name: string, action) {
    this.opcode('hasBlock', action, name);
  }

  hasBlockParams(name: string, action) {
    this.opcode('hasBlockParams', action, name);
  }

  /// Expressions, invoked recursively from prepareParams and prepareHash

  SubExpression(expr) {
    if (isHasBlock(expr)) {
      let name = assertValidHasBlock(expr);
      this.hasBlock(name, expr);
    } else if (isHasBlockParams(expr)) {
      let name = assertValidHasBlockParams(expr);
      this.hasBlockParams(name, expr);
    } else {
      this.prepareHelper(expr);
      this.opcode('helper', expr, expr.path.parts);
    }
  }

  PathExpression(expr) {
    if (expr.data) {
      this.attr([expr]);
    } else {
      this.opcode('get', expr, expr.parts);
    }
  }

  StringLiteral(action) {
    this.opcode('literal', null, action.value);
  }

  BooleanLiteral(action) {
    this.opcode('literal', null, action.value);
  }

  NumberLiteral(action) {
    this.opcode('literal', null, action.value);
  }

  NullLiteral(action) {
    this.opcode('literal', null, action.value);
  }

  UndefinedLiteral(action) {
    this.opcode('literal', null, action.value);
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
    this.opcode('literal', path, path.parts);
  }

  prepareParams(params) {
    if (!params.length) {
      this.opcode('literal', null,null);
      return;
    }

    for (let i = params.length - 1; i >= 0; i--) {
      let param = params[i];

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
    let pairs = hash.pairs;

    if (!pairs.length) {
      this.opcode('literal', null, null);
      return;
    }

    for (let i = pairs.length - 1; i >= 0; i--) {
      let { key, value } = pairs[i];

      assert(this[value.type], `Unimplemented ${value.type} on TemplateCompiler`);
      this[value.type](value);
      this.opcode('literal', null, key);
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

function isYield({ path }) {
  return path.original === 'yield';
}

function isHasBlock({ path }) {
  return path.original === 'has-block';
}

function isHasBlockParams({ path }) {
  return path.original === 'has-block-params';
}

function assertValidYield({ hash }): string {
  let pairs = hash.pairs;

  if ((pairs.length === 1 && pairs[0].key !== 'to') || pairs.length > 1) {
    throw new Error(`yield only takes a single named argument: 'to'`);
  } else if (pairs.length === 1 && pairs[0].value.type !== 'StringLiteral') {
    throw new Error(`you can only yield to a literal value`);
  } else if (pairs.length === 0) {
    return 'default';
  } else {
    return pairs[0].value.value;
  }
}

function assertValidHasBlock({ params }): string {
  if (params.length === 0) {
    return 'default';
  } else if (params.length === 1) {
    if (params[0].type === 'StringLiteral') {
      return params[0].value;
    } else {
      throw new Error(`you can only yield to a literal value`);
    }
  } else {
    throw new Error(`has-block only takes a single positional argument`);
  }
}

function assertValidHasBlockParams({ params }): string {
  if (params.length === 0) {
    return 'default';
  } else if (params.length === 1) {
    if (params[0].type === 'StringLiteral') {
      return params[0].value;
    } else {
      throw new Error(`you can only yield to a literal value`);
    }
  } else {
    throw new Error(`has-block-params only takes a single positional argument`);
  }
}
