// Decorators in gxt-compiled modules import decorator-transforms' runtime.
//
// Shipped next to the Vite preset of the gxt-native package (`vite/`), and used
// by the repo's own Vite configs around `@lifeart/gxt/compiler`.
//
// The gxt compiler lowers decorators (`@tracked`, `@action`, `@service`, …) in
// the modules it compiles (.gjs / .gts, and .js / .ts with a build-time
// `precompileTemplate`) with decorator-transforms in its default "globals"
// runtime: the output calls `dt7948.<fn>(…)` on a global that nothing in an app
// installs, so the app dies with "dt7948 is not defined". A stock Ember app
// (Embroider / Vite) configures decorator-transforms with
// `runtime: { import: … }` instead, so each module imports the runtime it
// calls. `importDecoratorRuntime` gives gxt's output that shape: a module that
// calls the global gets a module-scoped `dt7948` binding, imported from
// decorator-transforms' runtime module (whose exports are exactly the functions
// the global holds), and nothing reads the global any more. The import is
// resolved from the compiled module like any of its imports, so the app lists
// `decorator-transforms` as an Embroider app does, and its babel pass for
// plain .js shares the same runtime module.
//
// A gxt compiler that already imports the runtime leaves no call on the global
// and passes through unchanged.
import { parseAst } from 'vite';

/** The runtime module the compiled code imports. */
export const DECORATOR_RUNTIME = 'decorator-transforms/runtime';

// decorator-transforms' globals-runtime identifier (its `global-id` module):
// with `runtime: "globals"` every call it emits is `dt7948.<fn>(…)`.
const GLOBAL_ID = 'dt7948';

/**
 * A gxt compiler transform result (`{ code, map }`, a string, null / undefined,
 * or a promise of one) with the decorator runtime imported when its code calls
 * the `dt7948` global.
 */
export function importDecoratorRuntime(result, runtime = DECORATOR_RUNTIME) {
  if (result && typeof result.then === 'function') {
    return result.then((resolved) => importDecoratorRuntime(resolved, runtime));
  }
  const code = typeof result === 'string' ? result : result?.code;
  if (typeof code !== 'string' || !callsGlobalRuntime(code)) return result;
  // Appended: an import declaration is hoisted, and every existing line keeps
  // its source-map position.
  const withImport = `${code}\nimport * as ${GLOBAL_ID} from ${JSON.stringify(runtime)};\n`;
  return typeof result === 'string' ? withImport : { ...result, code: withImport };
}

/**
 * The given Vite plugin(s) (`@lifeart/gxt/compiler`'s), with every `transform`
 * result passed through `importDecoratorRuntime`.
 */
export function withDecoratorRuntime(plugins, runtime = DECORATOR_RUNTIME) {
  return [plugins].flat().map((plugin) => {
    if (!plugin || !plugin.transform) return plugin;
    const hook = plugin.transform;
    const handler = typeof hook === 'function' ? hook : hook.handler;
    function transform(...args) {
      return importDecoratorRuntime(handler.apply(this, args), runtime);
    }
    return {
      ...plugin,
      transform: typeof hook === 'function' ? transform : { ...hook, handler: transform },
    };
  });
}

// True when the module reads `dt7948.<fn>` and does not declare `dt7948` itself.
function callsGlobalRuntime(code) {
  if (!code.includes(GLOBAL_ID)) return false;
  const program = parseAst(code);
  if (program.body.some(declaresGlobalId)) return false;
  const pending = [program];
  while (pending.length > 0) {
    const node = pending.pop();
    if (
      node.type === 'MemberExpression' &&
      node.object.type === 'Identifier' &&
      node.object.name === GLOBAL_ID
    ) {
      return true;
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) {
        for (const child of value) if (child && typeof child.type === 'string') pending.push(child);
      } else if (value && typeof value.type === 'string') {
        pending.push(value);
      }
    }
  }
  return false;
}

function declaresGlobalId(statement) {
  switch (statement.type) {
    case 'ImportDeclaration':
      return statement.specifiers.some((specifier) => specifier.local.name === GLOBAL_ID);
    case 'VariableDeclaration':
      return statement.declarations.some(
        (declarator) => declarator.id.type === 'Identifier' && declarator.id.name === GLOBAL_ID
      );
    case 'FunctionDeclaration':
    case 'ClassDeclaration':
      return statement.id?.name === GLOBAL_ID;
    case 'ExportNamedDeclaration':
    case 'ExportDefaultDeclaration':
      return Boolean(statement.declaration) && declaresGlobalId(statement.declaration);
    default:
      return false;
  }
}
