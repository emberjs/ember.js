/**
 * EXPERIMENTAL: compile a strict-mode template's ASTv1 directly to JavaScript
 * that builds and updates DOM, using the helpers from `@glimmer/dom`.
 *
 * There is no wire format and no VM bytecode: static markup becomes an HTML
 * string that is cloned, and each dynamic part of the template becomes one
 * call to a runtime helper (with thunks for the values it reads).
 *
 * This module only depends on AST *types*, so it can be used with any
 * `preprocess` (e.g. the one exported by ember-template-compiler).
 */
import type * as ASTv1 from '@glimmer/syntax/lib/v1/nodes-v1';

export interface ImportInfo {
  module: string;
  name: string;
}

export interface GenerateOptions {
  /**
   * Is `name` a JavaScript binding that is in scope where the template is
   * defined? (strict mode: this is the only way to reference values)
   */
  isLexical(name: string): boolean;

  /**
   * If `name` is bound by an import, where it was imported from. Used to
   * specialize well-known helpers and modifiers (`on`, `fn`, `hash`, ...).
   */
  importOf?(name: string): ImportInfo | undefined;

  /**
   * Returns the identifier to use for a runtime helper from `@glimmer/dom`.
   */
  runtime(name: string): string;

  /**
   * Returns the identifier to use for a named import (used for built-in
   * keywords that are auto-imported but not specialized).
   */
  importBinding(module: string, name: string): string;

  /**
   * JavaScript globals that strict-mode templates may reference without
   * importing them (e.g. `JSON`, `console`; see RFC 1070).
   */
  isGlobal?(name: string): boolean;

  /**
   * Prefix for generated identifiers (including hoisted declarations), so
   * that several templates can be compiled into one module.
   */
  prefix?: string;

  /**
   * Import `template`/`setTemplate` from `@glimmer/dom/vm`, so that compiled
   * components can be rendered by the VM too (see the babel plugin).
   */
  vmInterop?: boolean;
}

export interface Generated {
  /**
   * Module-level declarations (static HTML) that the expression references.
   */
  hoisted: string[];

  /**
   * An expression that evaluates to the compiled template.
   */
  expression: string;
}

export class CodegenError extends Error {
  constructor(message: string, node?: { loc?: unknown }) {
    let loc = node?.loc as { startPosition?: { line: number; column: number } } | undefined;
    let where = loc?.startPosition
      ? ` (line ${loc.startPosition.line}, column ${loc.startPosition.column})`
      : '';
    super(`${message}${where}`);
    this.name = 'CodegenError';
  }
}

const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'command',
  'embed',
  'hr',
  'img',
  'input',
  'keygen',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

/**
 * Keywords that are part of the template language itself.
 */
const KEYWORDS = new Set([
  'action',
  'component',
  'debugger',
  'each',
  'each-in',
  'has-block',
  'has-block-params',
  'helper',
  'if',
  'in-element',
  'let',
  'log',
  'modifier',
  'mount',
  'mut',
  'outlet',
  'readonly',
  'unbound',
  'unless',
  'yield',
]);

/**
 * Built-ins that strict mode templates may use without importing them.
 */
const AUTO_IMPORTED: Record<string, string> = {
  and: '@ember/helper',
  array: '@ember/helper',
  element: '@ember/helper',
  eq: '@ember/helper',
  fn: '@ember/helper',
  gt: '@ember/helper',
  gte: '@ember/helper',
  hash: '@ember/helper',
  lt: '@ember/helper',
  lte: '@ember/helper',
  neq: '@ember/helper',
  not: '@ember/helper',
  on: '@ember/modifier',
  or: '@ember/helper',
};

/**
 * Imports that we know the semantics of, and compile inline.
 */
const SPECIALIZED: Record<string, Set<string>> = {
  '@ember/helper': new Set([
    'and',
    'array',
    'concat',
    'element',
    'eq',
    'fn',
    'get',
    'gt',
    'gte',
    'hash',
    'lt',
    'lte',
    'neq',
    'not',
    'or',
  ]),
  '@ember/modifier': new Set(['on']),
};

const COMPARISONS: Record<string, string> = {
  eq: '===',
  neq: '!==',
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<=',
};

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/u;

const q = (value: string) => JSON.stringify(value);

function key(name: string): string {
  return IDENTIFIER.test(name) ? name : q(name);
}

function prop(name: string): string {
  return IDENTIFIER.test(name) ? `.${name}` : `[${q(name)}]`;
}

function escapeText(text: string): string {
  return text.replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;');
}

function escapeAttr(text: string): string {
  return text.replace(/&/gu, '&amp;').replace(/"/gu, '&quot;');
}

class Scope {
  #names = new Map<string, string>();

  constructor(readonly parent: Scope | null) {}

  bind(name: string, js: string): void {
    this.#names.set(name, js);
  }

  lookup(name: string): string | undefined {
    return this.#names.get(name) ?? this.parent?.lookup(name);
  }

  child(): Scope {
    return new Scope(this);
  }
}

/**
 * The function body currently being generated. Helper invocations are
 * hoisted into it (right before the statement that uses them), so they are
 * created once per block instance.
 */
interface Body {
  lines: string[];
  scope: Scope;
}

type Slot = ASTv1.ElementNode | ASTv1.MustacheStatement | ASTv1.BlockStatement;

type Op =
  | { kind: 'element'; path: number[]; node: ASTv1.ElementNode }
  | { kind: 'slot'; path: number[]; node: Slot };

class Generator {
  #uid = 0;
  #hoisted: string[] = [];
  #html = new Map<string, string>();

  constructor(readonly options: GenerateOptions) {}

  get hoisted(): string[] {
    return this.#hoisted;
  }

  uid(prefix: string): string {
    return `$_${this.options.prefix ?? ''}${prefix}${++this.#uid}`;
  }

  rt(name: string): string {
    return this.options.runtime(name);
  }

  template(ast: ASTv1.Template): string {
    let scope = new Scope(null);
    let body = this.body(ast.body, scope);
    return `${this.rt('template')}(($_b, $_ctx) => {\nconst $_s = $_ctx.self, $_a = $_ctx.args;\n${body}\n})`;
  }

  /////////////////////////////////////////////////////////////////////////
  // Blocks of content
  /////////////////////////////////////////////////////////////////////////

  /**
   * Generate a function body that renders `statements`, and returns the DOM.
   */
  body(statements: ASTv1.Statement[], scope: Scope): string {
    let body: Body = { lines: [], scope };
    let ops: Op[] = [];
    let markup = this.html(statements, [], ops, body);

    let root = this.uid('r');
    body.lines.push(`const ${root} = ${this.rt('clone')}($_b, ${this.hoistHTML(markup)});`);

    // Resolve every node we need before any helper mutates the DOM.
    let refs = ops.map((op) => {
      let ref = this.uid('n');
      body.lines.push(`const ${ref} = ${this.rt('at')}(${[root, ...op.path].join(', ')});`);
      return ref;
    });

    ops.forEach((op, i) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- same length
      let ref = refs[i]!;
      if (op.kind === 'element') {
        this.elementOps(op.node, ref, body);
      } else {
        this.slot(op.node, ref, body);
      }
    });

    body.lines.push(`return ${root};`);
    return body.lines.join('\n');
  }

  blockFn(block: ASTv1.Block | null | undefined, scope: Scope): string {
    if (!block) return 'undefined';
    return this.blockFnWith(block.body, block.blockParams, scope);
  }

  blockFnWith(
    statements: ASTv1.Statement[],
    params: string[],
    scope: Scope,
    bindParam?: (param: string, index: number, inner: Scope) => void
  ): string {
    let inner = scope.child();
    let names = params.map((name, i) => {
      let id = this.uid('p');
      if (bindParam) {
        bindParam(id, i, inner);
      } else {
        inner.bind(name, `${id}()`);
      }
      return id;
    });

    return `($_b${names.map((n) => `, ${n}`).join('')}) => {\n${this.body(statements, inner)}\n}`;
  }

  hoistHTML(markup: string): string {
    let existing = this.#html.get(markup);
    if (existing) return existing;

    let id = this.uid('t');
    this.#hoisted.push(`const ${id} = ${this.rt('html')}(${q(markup)});`);
    this.#html.set(markup, id);
    return id;
  }

  /**
   * Build the static HTML for a list of statements, recording the dynamic
   * parts (and the child-index path to their node) in `ops`.
   */
  html(statements: ASTv1.Statement[], path: number[], ops: Op[], body: Body): string {
    let out = '';
    let index = 0;
    let text: string | null = null;

    // Adjacent text is merged by the HTML parser, so it must be one node in
    // our model too.
    let flushText = () => {
      if (text) {
        out += escapeText(text);
        index++;
      }
      text = null;
    };

    for (let statement of statements) {
      switch (statement.type) {
        case 'TextNode':
          text = (text ?? '') + statement.chars;
          break;

        case 'MustacheCommentStatement':
          break;

        case 'CommentStatement':
          flushText();
          out += `<!--${statement.value}-->`;
          index++;
          break;

        case 'MustacheStatement': {
          let literal = staticText(statement);
          if (literal !== null) {
            text = (text ?? '') + literal;
            break;
          }
          flushText();
          out += '<!>';
          ops.push({ kind: 'slot', path: [...path, index++], node: statement });
          break;
        }

        case 'BlockStatement':
          flushText();
          out += '<!>';
          ops.push({ kind: 'slot', path: [...path, index++], node: statement });
          break;

        case 'ElementNode':
          flushText();
          if (this.isComponent(statement, body.scope)) {
            out += '<!>';
            ops.push({ kind: 'slot', path: [...path, index++], node: statement });
          } else {
            out += this.element(statement, [...path, index++], ops, body);
          }
          break;
      }
    }

    flushText();
    return out;
  }

  element(node: ASTv1.ElementNode, path: number[], ops: Op[], body: Body): string {
    let { tag } = node;
    let out = `<${tag}`;
    let dynamic = node.modifiers.length > 0;
    let splatted = false;

    for (let attr of node.attributes) {
      if (attr.name === '...attributes') {
        splatted = dynamic = true;
      } else if (attr.value.type === 'TextNode' && !splatted) {
        out +=
          attr.value.chars === ''
            ? ` ${attr.name}`
            : ` ${attr.name}="${escapeAttr(attr.value.chars)}"`;
      } else {
        dynamic = true;
      }
    }

    out += '>';

    // attributes are applied before children are rendered
    if (dynamic) ops.push({ kind: 'element', path, node });

    if (VOID_ELEMENTS.has(tag)) return out;

    let children = this.html(node.children, path, ops, body);

    // The HTML parser drops a newline at the very start of these.
    if ((tag === 'pre' || tag === 'textarea' || tag === 'listing') && children.startsWith('\n')) {
      children = `\n${children}`;
    }

    return `${out}${children}</${tag}>`;
  }

  isComponent(node: ASTv1.ElementNode, scope: Scope): boolean {
    let { head, tail } = node.path;

    if (head.type !== 'VarHead') return true;
    if (tail.length > 0) return true;
    if (scope.lookup(head.name) !== undefined) return true;
    if (this.options.isLexical(head.name)) return true;

    return /^[A-Z]/u.test(head.name);
  }

  /////////////////////////////////////////////////////////////////////////
  // Elements
  /////////////////////////////////////////////////////////////////////////

  elementOps(node: ASTv1.ElementNode, element: string, body: Body): void {
    let splatted = false;

    for (let attr of node.attributes) {
      if (attr.name === '...attributes') {
        splatted = true;
        body.lines.push(`${this.rt('splat')}($_b, ${element}, $_ctx);`);
      } else if (attr.value.type === 'TextNode') {
        // Static attributes after `...attributes` must win over it, so they
        // are applied in order rather than being part of the markup.
        if (splatted) {
          body.lines.push(
            `${this.rt('attr')}($_b, ${element}, ${q(attr.name)}, ${q(attr.value.chars)});`
          );
        }
      } else {
        body.lines.push(
          `${this.rt('attr')}($_b, ${element}, ${q(attr.name)}, () => ${this.attrValue(attr.value, body)});`
        );
      }
    }

    for (let modifier of node.modifiers) {
      this.modifier(modifier, element, body);
    }
  }

  attrValue(value: ASTv1.AttrValue, body: Body): string {
    switch (value.type) {
      case 'TextNode':
        return q(value.chars);
      case 'MustacheStatement':
        return this.mustacheValue(value, body);
      case 'ConcatStatement':
        return `(${[
          '""',
          ...value.parts.map((part) =>
            part.type === 'TextNode'
              ? q(part.chars)
              : `${this.rt('str')}(${this.mustacheValue(part, body)})`
          ),
        ].join(' + ')})`;
    }
  }

  modifier(node: ASTv1.ElementModifierStatement, element: string, body: Body): void {
    let builtin = this.builtin(node.path, body.scope);

    if (builtin === 'on') {
      // missing arguments are reported at runtime, like the `on` modifier does
      let [event, handler] = node.params;

      let options = node.hash.pairs.length
        ? `, { ${node.hash.pairs.map((p) => `${key(p.key)}: ${this.expr(p.value, body)}`).join(', ')} }`
        : '';

      body.lines.push(
        `${this.rt('listen')}($_b, ${element}, ${event ? this.expr(event, body) : 'undefined'}, () => ${handler ? this.expr(handler, body) : 'undefined'}${options});`
      );
      return;
    }

    if (builtin !== null) {
      throw new CodegenError(`\`${builtin}\` cannot be used as a modifier`, node);
    }

    body.lines.push(
      `${this.rt('modifier')}($_b, ${element}, ${this.expr(node.path, body)}, ${this.positional(
        node.params,
        body
      )}, ${this.named(node.hash, body)});`
    );
  }

  /////////////////////////////////////////////////////////////////////////
  // Dynamic content
  /////////////////////////////////////////////////////////////////////////

  slot(node: Slot, anchor: string, body: Body): void {
    switch (node.type) {
      case 'ElementNode': {
        this.componentElement(node, anchor, body);
        return;
      }
      case 'MustacheStatement': {
        this.append(node, anchor, body);
        return;
      }
      case 'BlockStatement': {
        this.block(node, anchor, body);
        return;
      }
    }
  }

  append(node: ASTv1.MustacheStatement, anchor: string, body: Body): void {
    let { path, params, hash } = node;
    let flags = node.trusting ? 2 : 0;

    if (path.type !== 'PathExpression') {
      body.lines.push(
        `${this.rt('content')}($_b, ${anchor}, () => ${this.mustacheValue(node, body)}, ${flags});`
      );
      return;
    }

    let builtin = this.builtin(path, body.scope);

    switch (builtin) {
      case 'yield': {
        let to = hash.pairs.find((p) => p.key === 'to');
        let name = to ? this.staticString(to.value, 'yield to=') : 'default';
        body.lines.push(
          `${this.rt('yieldTo')}($_b, ${anchor}, $_ctx, ${q(name === 'inverse' ? 'else' : name)}, [${params
            .map((p) => `() => ${this.expr(p, body)}`)
            .join(', ')}]);`
        );
        return;
      }

      case 'debugger':
        body.lines.push('debugger;');
        return;

      case 'outlet':
        if (this.options.vmInterop) {
          // The VM renders the route's `<@outlet />` into this spot, in the
          // same render tree as the route (see `@glimmer/dom/vm`).
          body.lines.push(`${this.rt('outlet')}($_b, ${anchor});`);
        } else {
          // Route templates receive their outlet as `@outlet` (the same as
          // ember's own compiler turning `{{outlet}}` into `<@outlet />`).
          body.lines.push(
            `${this.rt('invokeDyn')}($_b, ${anchor}, () => $_a.outlet, {}, null, null);`
          );
        }
        return;

      case 'component': {
        let [definition, ...rest] = params;
        if (!definition) throw new CodegenError('`{{component}}` requires a component', node);
        if (rest.length)
          throw new CodegenError('positional arguments to components are not supported yet', node);

        body.lines.push(
          `${this.rt('invokeDyn')}($_b, ${anchor}, () => ${this.expr(definition, body)}, ${
            this.named(hash, body) ?? '{}'
          }, null, null);`
        );
        return;
      }
    }

    if (builtin === null && (params.length > 0 || hash.pairs.length > 0)) {
      // `{{foo a b=c}}` may invoke a component or a helper; which one depends
      // on what `foo` is.
      let isStatic =
        path.head.type === 'VarHead' &&
        path.tail.length === 0 &&
        body.scope.lookup(path.head.name) === undefined;
      let definition = this.expr(path, body);
      body.lines.push(
        `${this.rt('appendCall')}($_b, ${anchor}, ${isStatic ? definition : `() => ${definition}`}, ${isStatic}, ${this.positional(
          params,
          body
        )}, ${this.named(hash, body)}, ${flags});`
      );
      return;
    }

    if (params.length === 0 && hash.pairs.length === 0 && builtin === null) {
      // `{{foo}}` with a lexical `foo` may be a helper, invoked with no args
      if (
        path.head.type === 'VarHead' &&
        path.tail.length === 0 &&
        body.scope.lookup(path.head.name) === undefined
      ) {
        flags |= 1;
      }
    }

    body.lines.push(
      `${this.rt('content')}($_b, ${anchor}, () => ${this.mustacheValue(node, body)}, ${flags});`
    );
  }

  /**
   * The value of `{{path params hash}}`.
   */
  mustacheValue(node: ASTv1.MustacheStatement, body: Body): string {
    if (node.params.length === 0 && node.hash.pairs.length === 0) {
      if (node.path.type === 'PathExpression' && this.builtin(node.path, body.scope) === null) {
        return this.expr(node.path, body);
      }
      if (node.path.type !== 'PathExpression' && node.path.type !== 'SubExpression') {
        return this.expr(node.path, body);
      }
    }

    return this.call(node.path, node.params, node.hash, node, body);
  }

  block(node: ASTv1.BlockStatement, anchor: string, body: Body): void {
    let { path, params, hash, program, inverse } = node;
    let builtin = path.type === 'PathExpression' ? this.builtin(path, body.scope) : null;
    let { scope } = body;

    switch (builtin) {
      case 'if':
      case 'unless': {
        let [condition] = params;
        if (!condition) throw new CodegenError(`\`${builtin}\` requires a condition`, node);
        let test = `${this.rt('bool')}(${this.expr(condition, body)})`;
        body.lines.push(
          `${this.rt('when')}($_b, ${anchor}, () => ${builtin === 'unless' ? `!${test}` : test}, ${this.blockFn(
            program,
            scope
          )}, ${this.blockFn(inverse, scope)});`
        );
        return;
      }

      case 'each': {
        let [list] = params;
        if (!list) throw new CodegenError('`each` requires a list', node);
        let keyPair = hash.pairs.find((p) => p.key === 'key');
        body.lines.push(
          `${this.rt('each')}($_b, ${anchor}, () => ${this.expr(list, body)}, ${
            keyPair ? this.expr(keyPair.value, body) : 'null'
          }, ${this.blockFn(program, scope)}, ${this.blockFn(inverse, scope)});`
        );
        return;
      }

      case 'each-in': {
        let [object] = params;
        if (!object) throw new CodegenError('`each-in` requires an object', node);
        let item = this.blockFnWith(program.body, ['entry'], scope, (id, _i, inner) => {
          let [k, v] = program.blockParams;
          if (k) inner.bind(k, `${id}()[0]`);
          if (v) inner.bind(v, `${id}()[1]`);
        });
        body.lines.push(
          `${this.rt('each')}($_b, ${anchor}, () => ${this.rt('entries')}(${this.expr(
            object,
            body
          )}), "0", ${item}, ${this.blockFn(inverse, scope)});`
        );
        return;
      }

      case 'let': {
        let inner = scope.child();
        program.blockParams.forEach((name, i) => {
          let value = params[i];
          let id = this.uid('l');
          body.lines.push(
            `const ${id} = ${this.rt('memo')}(() => ${value ? this.expr(value, body) : 'undefined'});`
          );
          inner.bind(name, `${id}()`);
        });
        body.lines.push(
          `${this.rt('scope')}($_b, ${anchor}, ($_b) => {\n${this.body(program.body, inner)}\n});`
        );
        return;
      }

      case 'in-element': {
        let [destination] = params;
        if (!destination) throw new CodegenError('`in-element` requires a destination', node);
        let append = hash.pairs.some((p) => p.key === 'insertBefore');
        body.lines.push(
          `${this.rt('inElement')}($_b, () => ${this.expr(destination, body)}, ${append}, ${this.blockFn(
            program,
            scope
          )});`
        );
        return;
      }

      case 'component': {
        let [definition] = params;
        if (!definition) throw new CodegenError('`{{#component}}` requires a component', node);
        body.lines.push(
          `${this.rt('invokeDyn')}($_b, ${anchor}, () => ${this.expr(definition, body)}, ${
            this.named(hash, body) ?? '{}'
          }, ${this.blocksObject(program, inverse, scope)}, null);`
        );
        return;
      }

      case null:
        break;

      default:
        throw new CodegenError(
          `\`{{#${builtin}}}\` is not supported by the codegen compiler yet`,
          node
        );
    }

    if (params.length > 0) {
      throw new CodegenError('positional arguments to components are not supported yet', node);
    }

    // `{{#Foo}}...{{/Foo}}`: a curly component invocation
    this.invocation(
      path as ASTv1.PathExpression,
      anchor,
      this.named(hash, body) ?? '{}',
      this.blocksObject(program, inverse, scope),
      'null',
      body
    );
  }

  blocksObject(
    program: ASTv1.Block,
    inverse: ASTv1.Block | null | undefined,
    scope: Scope
  ): string {
    let entries = [`default: ${this.blockFn(program, scope)}`];
    if (inverse) entries.push(`else: ${this.blockFn(inverse, scope)}`);
    return `{ ${entries.join(', ')} }`;
  }

  componentElement(node: ASTv1.ElementNode, anchor: string, body: Body): void {
    let named: string[] = [];
    let attrs: ASTv1.AttrNode[] = [];

    for (let attr of node.attributes) {
      if (attr.name.startsWith('@')) {
        named.push(`${key(attr.name.slice(1))}: () => ${this.attrValue(attr.value, body)}`);
      } else {
        attrs.push(attr);
      }
    }

    let attrsFn = 'null';
    if (attrs.length > 0 || node.modifiers.length > 0) {
      // There is no markup for these, so every attribute is applied in order.
      let inner: Body = { lines: [], scope: body.scope };
      for (let attr of attrs) {
        if (attr.name === '...attributes') {
          inner.lines.push(`${this.rt('splat')}($_b, $_el, $_ctx);`);
        } else {
          let value =
            attr.value.type === 'TextNode'
              ? q(attr.value.chars)
              : `() => ${this.attrValue(attr.value, inner)}`;
          inner.lines.push(`${this.rt('attr')}($_b, $_el, ${q(attr.name)}, ${value});`);
        }
      }
      for (let modifier of node.modifiers) {
        this.modifier(modifier, '$_el', inner);
      }
      attrsFn = `($_b, $_el) => {\n${inner.lines.join('\n')}\n}`;
    }

    let blocks = 'null';
    let namedBlocks = node.children.filter(
      (c): c is ASTv1.ElementNode => c.type === 'ElementNode' && c.tag.startsWith(':')
    );

    if (namedBlocks.length > 0) {
      blocks = `{ ${namedBlocks
        .map(
          (b) =>
            `${key(b.tag.slice(1))}: ${this.blockFnWith(
              b.children,
              b.params.map((p) => p.name),
              body.scope
            )}`
        )
        .join(', ')} }`;
    } else if (node.children.length > 0) {
      blocks = `{ default: ${this.blockFnWith(
        node.children,
        node.params.map((p) => p.name),
        body.scope
      )} }`;
    }

    this.invocation(node.path, anchor, `{ ${named.join(', ')} }`, blocks, attrsFn, body);
  }

  invocation(
    path: ASTv1.PathExpression,
    anchor: string,
    named: string,
    blocks: string,
    attrs: string,
    body: Body
  ): void {
    let { head, tail } = path;
    let isStatic =
      head.type === 'VarHead' &&
      tail.length === 0 &&
      body.scope.lookup(head.name) === undefined &&
      this.options.isLexical(head.name);

    if (isStatic) {
      body.lines.push(
        `${this.rt('invoke')}($_b, ${anchor}, ${this.expr(path, body)}, ${named}, ${blocks}, ${attrs});`
      );
    } else {
      body.lines.push(
        `${this.rt('invokeDyn')}($_b, ${anchor}, () => ${this.expr(path, body)}, ${named}, ${blocks}, ${attrs});`
      );
    }
  }

  /////////////////////////////////////////////////////////////////////////
  // Expressions
  /////////////////////////////////////////////////////////////////////////

  /**
   * Which built-in (keyword, or well-known import) does `path` refer to?
   */
  builtin(path: ASTv1.Expression, scope: Scope): string | null {
    if (path.type !== 'PathExpression') return null;

    let { head, tail } = path;
    if (head.type !== 'VarHead' || tail.length > 0) return null;

    let { name } = head;
    if (scope.lookup(name) !== undefined) return null;
    if (KEYWORDS.has(name)) return name;

    if (this.options.isLexical(name)) {
      let info = this.options.importOf?.(name);
      if (info && SPECIALIZED[info.module]?.has(info.name)) return info.name;
      return null;
    }

    return name in AUTO_IMPORTED ? name : null;
  }

  expr(node: ASTv1.Expression, body: Body): string {
    switch (node.type) {
      case 'StringLiteral':
        return q(node.value);
      case 'NumberLiteral':
        return String(node.value);
      case 'BooleanLiteral':
        return String(node.value);
      case 'NullLiteral':
        return 'null';
      case 'UndefinedLiteral':
        return 'undefined';
      case 'SubExpression':
        return this.call(node.path, node.params, node.hash, node, body);
      case 'PathExpression':
        return this.path(node, body);
    }
  }

  path(node: ASTv1.PathExpression, body: Body): string {
    let { head, tail } = node;
    let base: string;

    switch (head.type) {
      case 'ThisHead':
        base = '$_s';
        break;
      case 'AtHead':
        base = `$_a${prop(head.name.replace(/^@/u, ''))}`;
        break;
      case 'VarHead': {
        let local = body.scope.lookup(head.name);
        if (local !== undefined) {
          base = local;
        } else if (this.options.isLexical(head.name)) {
          base = head.name;
        } else if (head.name in AUTO_IMPORTED) {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- checked above
          base = this.options.importBinding(AUTO_IMPORTED[head.name]!, head.name);
        } else if (this.options.isGlobal?.(head.name)) {
          base = head.name;
        } else {
          throw new CodegenError(
            `Attempted to use \`${head.name}\`, but it is not in scope. In strict mode, values must be imported or defined in JavaScript`,
            node
          );
        }
        break;
      }
    }

    return tail.length > 0 ? `${this.rt('get')}(${[base, ...tail.map(q)].join(', ')})` : base;
  }

  positional(params: ASTv1.Expression[], body: Body): string {
    if (params.length === 0) return 'null';
    return `[${params.map((p) => `() => ${this.expr(p, body)}`).join(', ')}]`;
  }

  named(hash: ASTv1.Hash, body: Body): string | null {
    if (hash.pairs.length === 0) return null;
    return `{ ${hash.pairs.map((p) => `${key(p.key)}: () => ${this.expr(p.value, body)}`).join(', ')} }`;
  }

  staticString(node: ASTv1.Expression, what: string): string {
    if (node.type !== 'StringLiteral')
      throw new CodegenError(`${what} must be a string literal`, node);
    return node.value;
  }

  /**
   * `(path params hash)` (or `{{path params hash}}`).
   */
  call(
    path: ASTv1.Expression,
    params: ASTv1.Expression[],
    hash: ASTv1.Hash,
    node: { loc?: unknown },
    body: Body
  ): string {
    let builtin = this.builtin(path, body.scope);
    let arg = (i: number) => {
      let param = params[i];
      return param ? this.expr(param, body) : 'undefined';
    };
    let all = () => params.map((p) => this.expr(p, body));

    switch (builtin) {
      case null:
        break;
      case 'if':
        return `(${this.rt('bool')}(${arg(0)}) ? ${arg(1)} : ${arg(2)})`;
      case 'unless':
        return `(${this.rt('bool')}(${arg(0)}) ? ${arg(2)} : ${arg(1)})`;
      case 'concat':
        return `(${['""', ...all().map((p) => `${this.rt('str')}(${p})`)].join(' + ')})`;
      case 'fn':
        return `((...$_r) => (${arg(0)})(${[...all().slice(1), '...$_r'].join(', ')}))`;
      case 'hash':
        return `({ ${hash.pairs
          .map((p) => `get ${key(p.key)}() { return ${this.expr(p.value, body)}; }`)
          .join(', ')} })`;
      case 'array':
        return `[${all().join(', ')}]`;
      case 'get':
        return `${this.rt('getPath')}(${arg(0)}, ${arg(1)})`;
      case 'eq':
      case 'neq':
      case 'gt':
      case 'gte':
      case 'lt':
      case 'lte':
        return `(${arg(0)} ${COMPARISONS[builtin]} ${arg(1)})`;
      case 'not':
        return `!${this.rt('bool')}(${arg(0)})`;
      case 'and':
      case 'or':
        return `${this.rt(builtin)}(${all()
          .map((p) => `() => ${p}`)
          .join(', ')})`;
      case 'has-block':
      case 'has-block-params':
        return `${this.rt(builtin === 'has-block' ? 'hasBlock' : 'hasBlockParams')}($_ctx${
          params.length ? `, ${arg(0)}` : ''
        })`;
      case 'component':
        return `${this.rt('curry')}(${arg(0)}, ${this.named(hash, body) ?? 'null'})`;
      case 'log':
        return `${this.rt('log')}(${all().join(', ')})`;
      case 'element':
        return `${this.rt('element')}(${arg(0)})`;
      default:
        throw new CodegenError(`\`${builtin}\` is not supported by the codegen compiler yet`, node);
    }

    let positional = this.positional(params, body);
    let named = this.named(hash, body);
    let id = this.uid('h');

    let isStatic =
      path.type === 'PathExpression' &&
      path.head.type === 'VarHead' &&
      path.tail.length === 0 &&
      body.scope.lookup(path.head.name) === undefined;

    if (isStatic) {
      body.lines.push(
        `const ${id} = ${this.rt('helper')}($_b, ${this.expr(path, body)}, ${positional}, ${named});`
      );
    } else {
      body.lines.push(
        `const ${id} = ${this.rt('helperDyn')}($_b, () => ${this.expr(path, body)}, ${positional}, ${named});`
      );
    }

    return `${id}()`;
  }
}

/**
 * `{{"literal"}}` and friends can be part of the static markup.
 */
function staticText(node: ASTv1.MustacheStatement): string | null {
  if (node.trusting || node.params.length > 0 || node.hash.pairs.length > 0) return null;

  let { path } = node;
  switch (path.type) {
    case 'StringLiteral':
      return path.value;
    case 'NumberLiteral':
    case 'BooleanLiteral':
      return String(path.value);
    case 'NullLiteral':
    case 'UndefinedLiteral':
      return '';
    default:
      return null;
  }
}

export function generate(ast: ASTv1.Template, options: GenerateOptions): Generated {
  let generator = new Generator(options);
  let expression = generator.template(ast);
  return { hoisted: generator.hoisted, expression };
}
