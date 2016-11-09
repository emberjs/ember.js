import TemplateVisitor, { SymbolTable } from "./template-visitor";
import JavaScriptCompiler, { Template } from "./javascript-compiler";
import { getAttrNamespace } from "glimmer-util";
import { assert } from "glimmer-util";
import { TemplateMeta } from "glimmer-wire-format";

export interface CompileOptions<T extends TemplateMeta> {
  meta?: T;
}

function isTrustedValue(value) {
  return value.escaped !== undefined && !value.escaped;
}

export default class TemplateCompiler<T extends TemplateMeta> {
  static compile<T>(options: CompileOptions<T>, ast): Template<T> {
    let templateVisitor = new TemplateVisitor();
    templateVisitor.visit(ast);

    let compiler = new TemplateCompiler(options);
    let opcodes = compiler.process(templateVisitor.actions);
    return JavaScriptCompiler.process<T>(opcodes, options.meta);
  }

  private options: CompileOptions<T>;
  private templateId = 0;
  private templateIds: number[] = [];
  private symbols: SymbolTable = null;
  private opcodes: any[] = [];
  private includeMeta = false;

  constructor(options: CompileOptions<T>) {
    this.options = options || {};
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
    this.symbols = program[0].symbols;
    this.templateId++;
    this.opcode('startBlock', program, program);
  }

  endBlock() {
    this.symbols = null;
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
    this.opcode('flushElement', null);
  }

  closeElement() {
    this.opcode('closeElement', null);
  }

  attribute([action]) {
    let { name, value } = action;

    let namespace = getAttrNamespace(name);

    let isStatic = this.prepareAttributeValue(value);

    if (name.charAt(0) === '@') {
      // Arguments
      if (isStatic) {
        this.opcode('staticArg', action, name);
      } else if (action.value.type === 'MustacheStatement') {
        this.opcode('dynamicArg', action, name);
      } else {
        this.opcode('dynamicArg', action, name);
      }
    } else {
      let isTrusting = isTrustedValue(value);

      if (isStatic) {
        this.opcode('staticAttr', action, name, namespace);
      } else if (isTrusting) {
        this.opcode('trustingAttr', action, name, namespace);
      } else if (action.value.type === 'MustacheStatement') {
        this.opcode('dynamicAttr', action, name);
      } else {
        this.opcode('dynamicAttr', action, name, namespace);
      }
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
      this.yield(to, action);
    } else if (isPartial(action)) {
      let params = assertValidPartial(action);
      this.partial(params, action);
    } else {
      this.mustacheExpression(action);
      this.opcode('append', action, !action.escaped);
    }
  }

  block([action/*, index, count*/]) {
    this.prepareHelper(action);
    let templateId = this.templateIds.pop();
    let inverseId = action.inverse === null ? null : this.templateIds.pop();
    this.opcode('block', action, action.path.parts, templateId, inverseId);
  }

  /// Internal actions, not found in the original processed actions

  arg([path]) {
    let { parts } = path;
    this.opcode('arg', path, parts);
  }

  mustacheExpression(expr) {
    if (isBuiltInHelper(expr)) {
      this.builtInHelper(expr);
    } else if (isLiteral(expr)) {
      this.opcode('literal', expr, expr.path.value);
    } else if (isArg(expr)) {
      this.arg([expr.path]);
    } else if (isHelperInvocation(expr)) {
      this.prepareHelper(expr);
      this.opcode('helper', expr, expr.path.parts);
    } else if (isSelfGet(expr) || isLocalVariable(expr, this.symbols)) {
      this.opcode('get', expr, expr.path.parts);
    } else {
      this.opcode('unknown', expr, expr.path.parts);
    }
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

  partial(params, action) {
    this.prepareParams(action.params);
    this.opcode('partial', action);
  }

  builtInHelper(expr) {
    if (isHasBlock(expr)) {
      let name = assertValidHasBlockUsage(expr.path.original, expr);
      this.hasBlock(name, expr);
    } else if (isHasBlockParams(expr)) {
      let name = assertValidHasBlockUsage(expr.path.original, expr);
      this.hasBlockParams(name, expr);
    }
  }

  /// Expressions, invoked recursively from prepareParams and prepareHash

  SubExpression(expr) {
    if (isBuiltInHelper(expr)) {
      this.builtInHelper(expr);
    } else {
      this.prepareHelper(expr);
      this.opcode('helper', expr, expr.path.parts);
    }
  }

  PathExpression(expr) {
    if (expr.data) {
      this.arg([expr]);
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
      this.opcode('literal', null, null);
      return;
    }

    for (let i = params.length - 1; i >= 0; i--) {
      let param = params[i];

      assert(this[param.type], `Unimplemented ${param.type} on TemplateCompiler`);
      this[param.type](param);
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
        this.prepareConcatParts(value.parts);
        this.opcode('concat', value);
        return false;
    }
  }

  prepareConcatParts(parts) {
    for (let i = parts.length - 1; i >= 0; i--) {
      let part = parts[i];

      if (part.type === 'MustacheStatement') {
        this.attributeMustache([part]);
      } else if (part.type === 'TextNode') {
        this.opcode('literal', null, part.chars);
      }
    }

    this.opcode('prepareArray', null, parts.length);
  }

  attributeMustache([action]) {
    this.mustacheExpression(action);
  }

  meta(node) {
    let loc = node.loc;
    if (!loc) { return []; }

    let { source, start, end } = loc;
    return [ 'loc', [source || null, [start.line, start.column], [end.line, end.column]] ];
  }
}

function isHelperInvocation(mustache) {
  return (mustache.params && mustache.params.length > 0) ||
    (mustache.hash && mustache.hash.pairs.length > 0);
}

function isSelfGet(mustache) {
  let { parts } = mustache.path;
  return parts[0] === null;
}

function isLocalVariable(mustache, symbols) {
  let { parts } = mustache.path;
  return parts.length === 1 && symbols && symbols.hasLocalVariable(parts[0]);
}

function isYield({ path }) {
  return path.original === 'yield';
}

function isPartial({ path }) {
  return path.original === 'partial';
}

function isArg({ path }) {
  return path.data;
}

function isLiteral({ path }) {
  return path.type === 'StringLiteral'
      || path.type === 'BooleanLiteral'
      || path.type === 'NumberLiteral'
      || path.type === 'NullLiteral'
      || path.type === 'UndefinedLiteral';
}

function isHasBlock({ path }) {
  return path.original === 'has-block';
}

function isHasBlockParams({ path }) {
  return path.original === 'has-block-params';
}

function isBuiltInHelper(expr) {
  return isHasBlock(expr)
      || isHasBlockParams(expr);
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

function assertValidPartial({ params, hash, escaped, loc }) /* : expr */ {
  if (params && params.length !== 1) {
    throw new Error(`Partial found with no arguments. You must specify a template name. (on line ${loc.start.line})`);
  } else if (hash && hash.pairs.length > 0) {
    throw new Error(`partial does not take any named arguments (on line ${loc.start.line})`);
  } else if (!escaped) {
    throw new Error(`{{{partial ...}}} is not supported, please use {{partial ...}} instead (on line ${loc.start.line})`);
  }

  return params;
}

function assertValidHasBlockUsage(type, { params, hash, loc }): string {
  if (hash && hash.pairs.length > 0) {
    throw new Error(`${type} does not take any named arguments`);
  }

  if (params.length === 0) {
    return 'default';
  } else if (params.length === 1) {
    if (params[0].type === 'StringLiteral') {
      return params[0].value;
    } else {
      throw new Error(`you can only yield to a literal value (on line ${loc.start.line})`);
    }
  } else {
    throw new Error(`${type} only takes a single positional argument (on line ${loc.start.line})`);
  }
}
