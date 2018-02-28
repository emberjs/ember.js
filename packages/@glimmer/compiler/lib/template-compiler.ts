import TemplateVisitor, { SymbolTable, Action } from "./template-visitor";
import JavaScriptCompiler, { Template } from "./javascript-compiler";
import { Stack } from "@glimmer/util";
import { assert, expect, Option } from "@glimmer/util";
import { AST, isLiteral, SyntaxError } from '@glimmer/syntax';
import { getAttrNamespace } from './utils';
import { Opaque } from "@glimmer/interfaces";

export interface CompileOptions {
  meta: Opaque;
}

function isTrustedValue(value: any) {
  return value.escaped !== undefined && !value.escaped;
}

export default class TemplateCompiler {
  static compile(ast: AST.Program): Template {
    let templateVisitor = new TemplateVisitor();
    templateVisitor.visit(ast);

    let compiler = new TemplateCompiler();
    let opcodes = compiler.process(templateVisitor.actions);
    return JavaScriptCompiler.process(opcodes, ast['symbols']);
  }

  private templateId = 0;
  private templateIds: number[] = [];
  private symbolStack = new Stack<SymbolTable>();
  private opcodes: any[] = [];
  private includeMeta = false;

  get symbols(): SymbolTable {
    return expect(this.symbolStack.current, 'Expected a symbol table on the stack');
  }

  process(actions: Action[]): Action[] {
    actions.forEach(([name, ...args]) => {
      if (!this[name]) { throw new Error(`Unimplemented ${name} on TemplateCompiler`); }
      (this[name] as any)(...args);
    });
    return this.opcodes;
  }

  startProgram(program: [AST.Program]) {
    this.symbolStack.push(program[0]['symbols']);
    this.opcode('startProgram', program, program);
  }

  endProgram() {
    this.symbolStack.pop();
    this.opcode('endProgram', null);
  }

  startBlock(program: [AST.Program]) {
    this.symbolStack.push(program[0]['symbols']);
    this.templateId++;
    this.opcode('startBlock', program, program);
  }

  endBlock() {
    this.symbolStack.pop();
    this.templateIds.push(this.templateId - 1);
    this.opcode('endBlock', null);
  }

  text([action]: [AST.TextNode]) {
    this.opcode('text', action, action.chars);
  }

  comment([action]: [AST.CommentStatement]) {
    this.opcode('comment', action, action.value);
  }

  openElement([action]: [AST.ElementNode]) {
    let attributes = action.attributes;
    let hasSplat;

    for (let i = 0; i < attributes.length; i++) {
      let attr = attributes[i];
      if (attr.name === '...attributes') {
        hasSplat = attr;
        break;
      }
    }

    if (hasSplat) {
      this.opcode('openSplattedElement', action, action);
    } else {
      this.opcode('openElement', action, action);
    }

    let typeAttr : Option<AST.AttrNode> = null;
    let attrs = action.attributes;
    for (let i = 0; i < attrs.length; i++) {
      if (attrs[i].name === 'type') {
        typeAttr = attrs[i];
        continue;
      }
      this.attribute([attrs[i]]);
    }

    if (typeAttr) {
      this.attribute([typeAttr]);
    }

    for (let i = 0; i < action.modifiers.length; i++) {
      this.modifier([action.modifiers[i]]);
    }
    this.opcode('flushElement', null);
    this.symbolStack.push(action['symbols']);
  }

  closeElement([action]: [AST.ElementNode]) {
    this.symbolStack.pop();
    this.opcode('closeElement', null, action);
  }

  attribute([action]: [AST.AttrNode]) {
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

      if (isStatic && name === '...attributes') {
        this.opcode('attrSplat', action, this.symbols.allocateBlock('attrs'));
      } else if (isStatic) {
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

  modifier([action]: [AST.ElementModifierStatement]) {
    assertIsSimplePath(action.path, action.loc, 'modifier');

    let { path: { parts } } = action;

    this.prepareHelper(action);
    this.opcode('modifier', action, parts[0]);
  }

  mustache([action]: [AST.MustacheStatement]) {
    let { path } = action;

    if (isLiteral(path)) {
      this.mustacheExpression(action);
      this.opcode('append', action, !action.escaped);
    } else if (isYield(path)) {
      let to = assertValidYield(action);
      this.yield(to, action);
    } else if (isPartial(path)) {
      let params = assertValidPartial(action);
      this.partial(params, action);
    } else if (isDebugger(path)) {
      assertValidDebuggerUsage(action);
      this.debugger('debugger', action);
    } else {
      this.mustacheExpression(action);
      this.opcode('append', action, !action.escaped);
    }
  }

  block([action/*, index, count*/]: [AST.BlockStatement]) {
    this.prepareHelper(action);
    let templateId = this.templateIds.pop();
    let inverseId = action.inverse === null ? null : this.templateIds.pop();
    this.opcode('block', action, action.path.parts[0], templateId, inverseId);
  }

  /// Internal actions, not found in the original processed actions

  arg([path]: [AST.PathExpression]) {
    let { parts: [head, ...rest] } = path;
    let symbol = this.symbols.allocateNamed(head);
    this.opcode('get', path, symbol, rest);
  }

  mustacheExpression(expr: AST.MustacheStatement) {
    let { path } = expr;

    if (isLiteral(path)) {
      this.opcode('literal', expr, path.value);
    } else if (isBuiltInHelper(path)) {
      this.builtInHelper(expr as AST.Call);
    } else if (isArg(path)) {
      this.arg([path]);
    } else if (isHelperInvocation(expr)) {
      this.prepareHelper(expr);
      this.opcode('helper', expr, path.parts[0]);
    } else if (path.this) {
      this.opcode('get', expr, 0, path.parts);
    } else if (isLocal(path, this.symbols)) {
      let [head, ...parts] = path.parts;
      this.opcode('get', expr, this.symbols.get(head), parts);
    } else if (isSimplePath(path)) {
      this.opcode('unknown', expr, path.parts[0]);
    } else {
      this.opcode('maybeLocal', expr, path.parts);
    }
  }

  /// Internal Syntax

  yield(to: string, action: AST.MustacheStatement) {
    this.prepareParams(action.params);
    this.opcode('yield', action, this.symbols.allocateBlock(to));
  }

  debugger(_name: string, action: AST.MustacheStatement) {
    this.opcode('debugger', action, this.symbols.getEvalInfo());
  }

  hasBlock(name: string, action: AST.Call) {
    this.opcode('hasBlock', action, this.symbols.allocateBlock(name));
  }

  hasBlockParams(name: string, action: AST.Call) {
    this.opcode('hasBlockParams', action, this.symbols.allocateBlock(name));
  }

  partial(_params: AST.Expression[], action: AST.MustacheStatement) {
    this.prepareParams(action.params);
    this.opcode('partial', action, this.symbols.getEvalInfo());
  }

  builtInHelper(expr: AST.Call) {
    let { path } = expr;
    if (isHasBlock(path)) {
      let name = assertValidHasBlockUsage(expr.path.original, expr);
      this.hasBlock(name, expr);
    } else if (isHasBlockParams(path)) {
      let name = assertValidHasBlockUsage(expr.path.original, expr);
      this.hasBlockParams(name, expr);
    }
  }

  /// Expressions, invoked recursively from prepareParams and prepareHash

  SubExpression(expr: AST.SubExpression) {
    if (isBuiltInHelper(expr.path)) {
      this.builtInHelper(expr);
    } else {
      this.prepareHelper(expr);
      this.opcode('helper', expr, expr.path.parts[0]);
    }
  }

  PathExpression(expr: AST.PathExpression) {
    if (expr.data) {
      this.arg([expr]);
    } else {
      let { symbols } = this;
      let [head] = expr.parts;

      if (expr.this) {
        this.opcode('get', expr, 0, expr.parts);
      } else if (symbols.has(head)) {
        this.opcode('get', expr, symbols.get(head), expr.parts.slice(1));
      } else {
        this.opcode('maybeLocal',expr, expr.parts);
      }
    }
  }

  StringLiteral(action: AST.StringLiteral) {
    this.opcode('literal', null, action.value);
  }

  BooleanLiteral(action: AST.BooleanLiteral) {
    this.opcode('literal', null, action.value);
  }

  NumberLiteral(action: AST.NumberLiteral) {
    this.opcode('literal', null, action.value);
  }

  NullLiteral(action: AST.NullLiteral) {
    this.opcode('literal', null, action.value);
  }

  UndefinedLiteral(action: AST.UndefinedLiteral) {
    this.opcode('literal', null, action.value);
  }

  /// Utilities

  opcode(name: any, action: any, ...args: any[]) {
    let opcode = [name, ...args];
    if (this.includeMeta && action) {
      opcode.push(this.meta(action));
    }

    this.opcodes.push(opcode);
  }

  prepareHelper(expr: AST.Call) {
    assertIsSimplePath(expr.path, expr.loc, 'helper');

    let { params, hash } = expr;

    this.prepareHash(hash);
    this.prepareParams(params);
  }

  prepareParams(params: AST.Expression[]) {
    if (!params.length) {
      this.opcode('literal', null, null);
      return;
    }

    for (let i = params.length - 1; i >= 0; i--) {
      let param = params[i];

      assert(this[param.type], `Unimplemented ${param.type} on TemplateCompiler`);
      (this[param.type] as any)(param);
    }

    this.opcode('prepareArray', null, params.length);
  }

  prepareHash(hash: AST.Hash) {
    let pairs = hash.pairs;

    if (!pairs.length) {
      this.opcode('literal', null, null);
      return;
    }

    for (let i = pairs.length - 1; i >= 0; i--) {
      let { key, value } = pairs[i];

      assert(this[value.type], `Unimplemented ${value.type} on TemplateCompiler`);
      (this[value.type] as any)(value);
      this.opcode('literal', null, key);
    }

    this.opcode('prepareObject', null, pairs.length);
  }

  prepareAttributeValue(value: AST.AttrNode['value']) {
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

  prepareConcatParts(parts: AST.ConcatStatement['parts']) {
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

  attributeMustache([action]: [AST.MustacheStatement]) {
    this.mustacheExpression(action);
  }

  meta(node: AST.BaseNode) {
    let loc = node.loc;
    if (!loc) { return []; }

    let { source, start, end } = loc;
    return [ 'loc', [source || null, [start.line, start.column], [end.line, end.column]] ];
  }
}

function isHelperInvocation(mustache: AST.MustacheStatement): mustache is AST.MustacheStatement & { path: AST.PathExpression } {
  return (mustache.params && mustache.params.length > 0) ||
    (mustache.hash && mustache.hash.pairs.length > 0);
}

function isSimplePath({ parts }: AST.PathExpression): boolean {
  return parts.length === 1;
}

function isLocal({ parts }: AST.PathExpression, symbols: SymbolTable): boolean {
  return symbols && /* parts.length && */ symbols.has(parts[0]);
}

function isYield(path: AST.PathExpression) {
  return path.original === 'yield';
}

function isPartial(path: AST.PathExpression) {
  return path.original === 'partial';
}

function isDebugger(path: AST.PathExpression) {
  return path.original === 'debugger';
}

function isHasBlock(path: AST.PathExpression) {
  return path.original === 'has-block';
}

function isHasBlockParams(path: AST.PathExpression) {
  return path.original === 'has-block-params';
}

function isBuiltInHelper(path: AST.PathExpression) {
  return isHasBlock(path) || isHasBlockParams(path);
}

function isArg(path: AST.PathExpression): boolean {
  return !!path['data'];
}

function assertIsSimplePath(path: AST.PathExpression, loc: AST.SourceLocation, context: string) {
  if (!isSimplePath(path)) {
    throw new SyntaxError(`\`${path.original}\` is not a valid name for a ${context} on line ${loc.start.line}.`, path.loc);
  }
}

function assertValidYield(statement: AST.MustacheStatement): string {
  let { pairs } = statement.hash;

  if ((pairs.length === 1 && pairs[0].key !== 'to') || pairs.length > 1) {
    throw new SyntaxError(`yield only takes a single named argument: 'to'`, statement.loc);
  } else if (pairs.length === 1 && pairs[0].value.type !== 'StringLiteral') {
    throw new SyntaxError(`you can only yield to a literal value`, statement.loc);
  } else if (pairs.length === 0) {
    return 'default';
  } else {
    return (pairs[0].value as AST.StringLiteral).value;
  }
}

function assertValidPartial(statement: AST.MustacheStatement) /* : expr */ {
  let { params, hash, escaped, loc } = statement;

  if (params && params.length !== 1) {
    throw new SyntaxError(`Partial found with no arguments. You must specify a template name. (on line ${loc.start.line})`, statement.loc);
  } else if (hash && hash.pairs.length > 0) {
    throw new SyntaxError(`partial does not take any named arguments (on line ${loc.start.line})`, statement.loc);
  } else if (!escaped) {
    throw new SyntaxError(`{{{partial ...}}} is not supported, please use {{partial ...}} instead (on line ${loc.start.line})`, statement.loc);
  }

  return params;
}

function assertValidHasBlockUsage(type: string, call: AST.Call): string {
  let { params, hash, loc } = call;

  if (hash && hash.pairs.length > 0) {
    throw new SyntaxError(`${type} does not take any named arguments`, call.loc);
  }

  if (params.length === 0) {
    return 'default';
  } else if (params.length === 1) {
    let param = params[0];
    if (param.type === 'StringLiteral') {
      return param.value;
    } else {
      throw new SyntaxError(`you can only yield to a literal value (on line ${loc.start.line})`, call.loc);
    }
  } else {
    throw new SyntaxError(`${type} only takes a single positional argument (on line ${loc.start.line})`, call.loc);
  }
}

function assertValidDebuggerUsage(statement: AST.MustacheStatement) {
  let { params, hash } = statement;

  if (hash && hash.pairs.length > 0) {
    throw new SyntaxError(`debugger does not take any named arguments`, statement.loc);
  }

  if (params.length === 0) {
    return 'default';
  } else {
    throw new SyntaxError(`debugger does not take any positional arguments`, statement.loc);
  }
}
