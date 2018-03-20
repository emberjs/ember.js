import TemplateVisitor, { Action } from "./template-visitor";
import JavaScriptCompiler, { Template } from "./javascript-compiler";
import { assert, Option } from "@glimmer/util";
import { AST, isLiteral, SyntaxError } from '@glimmer/syntax';
import { getAttrNamespace } from './utils';
import { Opaque } from "@glimmer/interfaces";
import { SymbolAllocator, InOp as SymbolInOp, OutOp as SymbolOutOp } from "./allocate-symbols";

export interface CompileOptions {
  meta: Opaque;
}

function isTrustedValue(value: any) {
  return value.escaped !== undefined && !value.escaped;
}

export const THIS = 0;

export default class TemplateCompiler {
  static compile(ast: AST.Program): Template {
    let templateVisitor = new TemplateVisitor();
    templateVisitor.visit(ast);

    let compiler = new TemplateCompiler();
    let opcodes: SymbolInOp[] = compiler.process(templateVisitor.actions);
    let symbols: SymbolOutOp[] = new SymbolAllocator(opcodes).process();

    return JavaScriptCompiler.process(symbols, ast['symbols']);
  }

  private templateId = 0;
  private templateIds: number[] = [];
  private opcodes: SymbolInOp[] = [];
  private includeMeta = false;

  process(actions: Action[]): SymbolInOp[] {
    actions.forEach(([name, ...args]) => {
      if (!this[name]) { throw new Error(`Unimplemented ${name} on TemplateCompiler`); }
      (this[name] as any)(...args);
    });
    return this.opcodes;
  }

  startProgram([program]: [AST.Program]) {
    this.opcode(['startProgram', program], program);
  }

  endProgram() {
    this.opcode(['endProgram', null], null);
  }

  startBlock([program]: [AST.Program]) {
    this.templateId++;
    this.opcode(['startBlock', program], program);
  }

  endBlock() {
    this.templateIds.push(this.templateId - 1);
    this.opcode(['endBlock', null], null);
  }

  text([action]: [AST.TextNode]) {
    this.opcode(['text', action.chars], action);
  }

  comment([action]: [AST.CommentStatement]) {
    this.opcode(['comment', action.value], action);
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
      this.opcode(['openSplattedElement', action], action);
    } else {
      this.opcode(['openElement', action], action);
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
    this.opcode(['flushElement', action], null);
  }

  closeElement([action]: [AST.ElementNode]) {
    this.opcode(['closeElement', action], action);
  }

  attribute([action]: [AST.AttrNode]) {
    let { name, value } = action;

    let namespace = getAttrNamespace(name);

    let isStatic = this.prepareAttributeValue(value);

    if (name.charAt(0) === '@') {
      // Arguments
      if (isStatic) {
        this.opcode(['staticArg', name], action);
      } else if (action.value.type === 'MustacheStatement') {
        this.opcode(['dynamicArg', name], action);
      } else {
        this.opcode(['dynamicArg', name], action);
      }
    } else {
      let isTrusting = isTrustedValue(value);

      if (isStatic && name === '...attributes') {
        this.opcode(['attrSplat', null], action);
      } else if (isStatic) {
        this.opcode(['staticAttr', [name, namespace]], action);
      } else if (isTrusting) {
        this.opcode(['trustingAttr', [name, namespace]], action);
      } else if (action.value.type === 'MustacheStatement') {
        this.opcode(['dynamicAttr', [name, null]], action);
      } else {
        this.opcode(['dynamicAttr', [name, namespace]], action);
      }
    }
  }

  modifier([action]: [AST.ElementModifierStatement]) {
    assertIsSimplePath(action.path, action.loc, 'modifier');

    let { path: { parts } } = action;

    this.prepareHelper(action);
    this.opcode(['modifier', parts[0]], action);
  }

  mustache([action]: [AST.MustacheStatement]) {
    let { path } = action;

    if (isLiteral(path)) {
      this.mustacheExpression(action);
      this.opcode(['append', !action.escaped], action);
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
      this.opcode(['append', !action.escaped], action);
    }
  }

  block([action/*, index, count*/]: [AST.BlockStatement]) {
    this.prepareHelper(action);
    let templateId = this.templateIds.pop()!;
    let inverseId = action.inverse === null ? null : this.templateIds.pop()!;
    this.opcode(['block', [action.path.parts[0], templateId, inverseId]], action);
  }

  /// Internal actions, not found in the original processed actions

  arg([path]: [AST.PathExpression]) {
    let { parts: [head, ...rest] } = path;
    this.opcode(['get', [`@${head}`, rest]], path);
  }

  mustacheExpression(expr: AST.MustacheStatement) {
    let { path } = expr;

    if (isLiteral(path)) {
      this.opcode(['literal', path.value], expr);
    } else if (isBuiltInHelper(path)) {
      this.builtInHelper(expr as AST.Call);
    } else if (isArg(path)) {
      this.arg([path]);
    } else if (isHelperInvocation(expr)) {
      this.prepareHelper(expr);
      this.opcode(['helper', path.parts[0]], expr);
    } else if (path.this) {
      this.opcode(['get', [0, path.parts]], expr);
    } else {
      let [head, ...parts] = path.parts;
      this.opcode(['maybeGet', [head, parts]], expr);
    }

    // } else if (isLocal(path, this.symbols)) {
    //   let [head, ...parts] = path.parts;
    //   this.opcode(['get', [head, parts]], expr);
    // } else if (isSimplePath(path)) {
    //   this.opcode(['unknown', path.parts[0]], expr);
    // } else {
    //   this.opcode(['maybeLocal', path.parts], expr);
    // }
  }

  /// Internal Syntax

  yield(to: string, action: AST.MustacheStatement) {
    this.prepareParams(action.params);
    this.opcode(['yield', to], action);
  }

  debugger(_name: string, action: AST.MustacheStatement) {
    this.opcode(['debugger', null], action);
  }

  hasBlock(name: string, action: AST.Call) {
    this.opcode(['hasBlock', name], action);
  }

  hasBlockParams(name: string, action: AST.Call) {
    this.opcode(['hasBlockParams', name], action);
  }

  partial(_params: AST.Expression[], action: AST.MustacheStatement) {
    this.prepareParams(action.params);
    this.opcode(['partial', null], action);
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
      this.opcode(['helper', expr.path.parts[0]], expr);
    }
  }

  PathExpression(expr: AST.PathExpression) {
    if (expr.data) {
      this.arg([expr]);
    } else {
      let [head, ...rest] = expr.parts;

      if (expr.this) {
        this.opcode(['get', [0, expr.parts]], expr);
      } else {
        this.opcode(['get', [head, rest]], expr);
      }
    }
  }

  StringLiteral(action: AST.StringLiteral) {
    this.opcode(['literal', action.value], action);
  }

  BooleanLiteral(action: AST.BooleanLiteral) {
    this.opcode(['literal', action.value], action);
  }

  NumberLiteral(action: AST.NumberLiteral) {
    this.opcode(['literal', action.value], action);
  }

  NullLiteral(action: AST.NullLiteral) {
    this.opcode(['literal', action.value], action);
  }

  UndefinedLiteral(action: AST.UndefinedLiteral) {
    this.opcode(['literal', action.value], action);
  }

  /// Utilities

  opcode<O extends SymbolInOp>(opcode: O, action: Option<AST.BaseNode> = null) {
    // TODO: This doesn't really work
    if (this.includeMeta && action) {
      (opcode as any).push(this.meta(action));
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
      this.opcode(['literal', null], null);
      return;
    }

    for (let i = params.length - 1; i >= 0; i--) {
      let param = params[i];

      assert(this[param.type], `Unimplemented ${param.type} on TemplateCompiler`);
      (this[param.type] as any)(param);
    }

    this.opcode(['prepareArray', params.length], null);
  }

  prepareHash(hash: AST.Hash) {
    let pairs = hash.pairs;

    if (!pairs.length) {
      this.opcode(['literal', null], null);
      return;
    }

    for (let i = pairs.length - 1; i >= 0; i--) {
      let { key, value } = pairs[i];

      assert(this[value.type], `Unimplemented ${value.type} on TemplateCompiler`);
      (this[value.type] as any)(value);
      this.opcode(['literal', key], null);
    }

    this.opcode(['prepareObject', pairs.length], null);
  }

  prepareAttributeValue(value: AST.AttrNode['value']) {
    // returns the static value if the value is static

    switch (value.type) {
      case 'TextNode':
        this.opcode(['literal', value.chars], value);
        return true;
      case 'MustacheStatement':
        this.attributeMustache([value]);
        return false;
      case 'ConcatStatement':
        this.prepareConcatParts(value.parts);
        this.opcode(['concat', null], value);
        return false;
    }
  }

  prepareConcatParts(parts: AST.ConcatStatement['parts']) {
    for (let i = parts.length - 1; i >= 0; i--) {
      let part = parts[i];

      if (part.type === 'MustacheStatement') {
        this.attributeMustache([part]);
      } else if (part.type === 'TextNode') {
        this.opcode(['literal', part.chars], null);
      }
    }

    this.opcode(['prepareArray', parts.length], null);
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
