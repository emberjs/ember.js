/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return -- babel's types are not a dependency of this package */
import type * as ASTv1 from '@glimmer/syntax/lib/v1/nodes-v1';

import type { ImportInfo } from './generate';

import { generate } from './generate';

export interface CodegenBabelPluginOptions {
  /**
   * Parses a template into ASTv1. (`preprocess` from `@glimmer/syntax`, or
   * `_preprocess` from `ember-source/ember-template-compiler`)
   */
  preprocess: (source: string, options: { strictMode: boolean }) => unknown;

  /**
   * Where the runtime helpers are imported from.
   */
  runtimeModule?: string;

  /**
   * Make compiled templates renderable by the VM too (e.g. as route
   * templates), via `${runtimeModule}/vm`.
   */
  vmInterop?: boolean;

  /**
   * JavaScript globals that templates may use without importing them.
   */
  isGlobal?: (name: string) => boolean;
}

/**
 * With `vmInterop`, these come from `${runtimeModule}/vm`.
 */
const VM_RUNTIME = new Set(['outlet', 'setTemplate', 'template']);

/**
 * The modules that `content-tag` (gjs/gts) and authors use for `template()`.
 */
const TEMPLATE_MODULES = new Set(['@ember/template-compiler', '@ember/template-compiler/runtime']);

function importedName(specifier: any): string {
  return specifier.imported.type === 'StringLiteral'
    ? specifier.imported.value
    : specifier.imported.name;
}

interface State {
  codegen: {
    imports: Map<string, Map<string, string>>;
    hoisted: string[];
    templates: number;
  };
}

/**
 * EXPERIMENTAL: compiles `template(...)` calls from strict-mode (gjs/gts)
 * modules directly to DOM operations, in place.
 *
 * Template-scoped values are resolved by JavaScript itself: the compiled
 * template is emitted where the `template()` call was, so it simply closes
 * over the module's bindings.
 */
export function codegenBabelPlugin(babel: any, options: CodegenBabelPluginOptions) {
  let t = babel.types;
  let runtimeModule = options.runtimeModule ?? '@glimmer/dom';
  let vmInterop = options.vmInterop ?? false;
  let moduleFor = (name: string) =>
    vmInterop && VM_RUNTIME.has(name) ? `${runtimeModule}/vm` : runtimeModule;

  let compileTemplate = (path: any, state: State) => {
    let callee = path.get('callee');
    if (!callee.isIdentifier()) return;

    let binding = path.scope.getBinding(callee.node.name);
    if (!binding || binding.kind !== 'module' || !binding.path.isImportSpecifier()) return;
    if (!TEMPLATE_MODULES.has(binding.path.parent.source.value)) return;
    if (importedName(binding.path.node) !== 'template') return;

    let [source, templateOptions] = path.node.arguments;
    let text: string;

    if (t.isTemplateLiteral(source) && source.expressions.length === 0) {
      text = source.quasis[0].value.cooked;
    } else if (t.isStringLiteral(source)) {
      text = source.value;
    } else {
      throw path.buildCodeFrameError('template() must be called with a static string');
    }

    let component: unknown = null;
    if (templateOptions && t.isObjectExpression(templateOptions)) {
      for (let property of templateOptions.properties) {
        if (t.isObjectProperty(property) && t.isIdentifier(property.key, { name: 'component' })) {
          component = property.value;
        }
      }
    }

    let program = path.scope.getProgramParent();
    let { imports } = state.codegen;

    let local = (module: string, name: string) => {
      let names = imports.get(module);
      if (!names) imports.set(module, (names = new Map()));
      let existing = names.get(name);
      if (existing) return existing;
      let id: string = program.generateUid(name.replace(/\W/gu, '_'));
      names.set(name, id);
      return id;
    };

    let importOf = (name: string): ImportInfo | undefined => {
      let found = path.scope.getBinding(name);
      if (!found || found.kind !== 'module') return undefined;
      let module = found.path.parent.source.value as string;
      if (found.path.isImportSpecifier()) return { module, name: importedName(found.path.node) };
      if (found.path.isImportDefaultSpecifier()) return { module, name: 'default' };
      return undefined;
    };

    let ast = options.preprocess(text, { strictMode: true }) as ASTv1.Template;

    let { hoisted, expression } = generate(ast, {
      isLexical: (name) => Boolean(path.scope.getBinding(name)),
      importOf,
      runtime: (name) => local(moduleFor(name), name),
      importBinding: local,
      prefix: `${state.codegen.templates++}_`,
      vmInterop,
      ...(options.isGlobal ? { isGlobal: options.isGlobal } : {}),
    });

    state.codegen.hoisted.push(...hoisted);

    let replacement = babel.template.expression.ast(expression, { placeholderPattern: false });

    if (component) {
      replacement = t.callExpression(t.identifier(local(moduleFor('setTemplate'), 'setTemplate')), [
        component,
        replacement,
      ]);
    }

    path.replaceWith(replacement);
  };

  let addImports = (path: any, state: State) => {
    let { imports, hoisted } = state.codegen;
    if (imports.size === 0) return;

    let declarations = [...imports].map(([module, names]) =>
      t.importDeclaration(
        [...names].map(([name, local]) =>
          t.importSpecifier(t.identifier(local), t.identifier(name))
        ),
        t.stringLiteral(module)
      )
    );

    let statements = hoisted.flatMap((code) =>
      babel.template.statements.ast(code, { placeholderPattern: false })
    );

    path.unshiftContainer('body', [...declarations, ...statements]);

    // The `template` import is no longer used.
    path.scope.crawl();
    for (let statement of path.get('body')) {
      if (!statement.isImportDeclaration()) continue;
      if (!TEMPLATE_MODULES.has(statement.node.source.value)) continue;

      for (let specifier of statement.get('specifiers')) {
        let binding = path.scope.getBinding(specifier.node.local.name);
        if (binding && !binding.referenced) specifier.remove();
      }

      if (statement.node.specifiers.length === 0) statement.remove();
    }
  };

  return {
    name: 'glimmer-codegen',
    // Everything happens in `pre` (rather than in a visitor), so that this
    // plugin compiles `template()` before other template plugins see it
    // (babel-plugin-ember-template-compilation also does its work in `pre`).
    // List this plugin first.
    pre(this: State, file: any) {
      this.codegen = { imports: new Map(), hoisted: [], templates: 0 };
      file.path.traverse(
        {
          CallExpression: (call: any) => {
            compileTemplate(call, this);
          },
        },
        this
      );
      addImports(file.path, this);
    },
    visitor: {},
  };
}
