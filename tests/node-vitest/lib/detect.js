// The side-effect probe behind the tree-shakability test. Given a built module
// file, it decides whether importing that module does anything observable. The
// test's worker (./find-side-effects.mjs) runs it over a preserveModules build;
// ./why.js reuses `probeSurvivingCode` to explain a flagged file. This is the
// sole copy of this machinery and is intentionally not wired into
// rollup.config.mjs (whose own tree-shaking uses an inline `moduleSideEffects`
// callback).
import { createRequire } from 'node:module';
import { rollup } from 'rollup';

const require = createRequire(import.meta.url);
const { transformAsync } = require('@babel/core');

/**
 * Rollup can't know that the classic object-model is lazy:
 * - `Mixin.create()` / `SomeClass.extend()` only build definitions, they don't
 *   touch anything outside the values they return.
 * - `.reopen()` / `.reopenClass()` mutate their receiver, but when the
 *   receiver is defined in the same file, dropping the whole file drops the
 *   mutation along with it — so the file is still safe to omit when unused.
 *   Reopening an *imported* value (e.g. ember-testing's RSVP/Application
 *   extensions) is a real cross-module side-effect and stays flagged.
 * - `decorateMethodV2` / `decorateFieldV2` (decorator-transforms runtime,
 *   emitted into class static blocks) only mutate the class being defined.
 * - descriptor factories (`computed`, `alias`, `service`, ...) only build
 *   descriptor objects.
 * - registration helpers like `setClassicDecorator` or
 *   `setInternalComponentManager` associate metadata with the values they are
 *   given; when every argument is file-local, nobody can observe the
 *   association unless they import this file's bindings.
 * - top-level variable declarations only initialize file-local bindings, so
 *   every call/new inside their initializers is droppable along with the
 *   binding (this covers e.g. module-level `new Cache(...)` instances, whose
 *   constructor names are mangled in shared chunks and can't be matched by
 *   name).
 * - top-level class declarations likewise only define a file-local class;
 *   what runs at module evaluation (the `extends` expression, static blocks,
 *   static field initializers) is droppable along with the class.
 * - a top-level expression statement whose effects all land on globals or
 *   file-local values (e.g. `Object.setPrototypeOf(LocalClass.prototype,
 *   Array.prototype)`, `LIBRARIES.registerCoreLibrary('Ember', VERSION)`)
 *   can't be observed from outside the file, so it is droppable. Read-only
 *   references to imports don't count as effects; what disqualifies a
 *   statement is assigning into an imported value, calling an imported
 *   function or a method on an imported receiver (e.g. RSVP wiring,
 *   cross-chunk opcode registration), or passing an imported value as the
 *   target of a known global mutator like `Object.assign`.
 * - the same goes for bare top-level blocks (the dev-build residue of
 *   `if (DEBUG) { ... }`, e.g. `{ Object.seal(TargetActionSupport); }`),
 *   as long as nothing in them has a cross-file effect or throws.
 *
 * This babel plugin marks those calls as `#__PURE__` (and deletes the
 * local-only statements, which annotations can't express) so the side-effect
 * probe below can tree-shake through them. It only runs inside the probe,
 * never on published output.
 */
export function annotatePureClassicCalls() {
  const alwaysPure = new Set(['create', 'extend']);
  const pureWhenLocal = new Set(['reopen', 'reopenClass']);
  const pureFunctions = new Set([
    'decorateMethodV2',
    'decorateFieldV2',
    'computed',
    'alias',
    'tracked',
    'service',
    'inject',
    'dependentKeyCompat',
    // the @ember/object/computed macros all just build descriptor objects
    'and',
    'bool',
    'collect',
    'deprecatingAlias',
    'empty',
    'equal',
    'filter',
    'filterBy',
    'gt',
    'gte',
    'intersect',
    'lt',
    'lte',
    'map',
    'mapBy',
    'match',
    'max',
    'min',
    'none',
    'not',
    'notEmpty',
    'oneWay',
    'or',
    'readOnly',
    'reads',
    'setDiff',
    'sort',
    'sum',
    'union',
    'uniq',
    'uniqBy',
  ]);
  // helpers that associate metadata keyed by one of their arguments (the
  // index in this map); when the key value is file-local, the association
  // can only ever be looked up through this file's bindings, so it is
  // unobservable unless the file is imported. The other arguments are merely
  // stored, which is no more observable than reading them. Rollup's output
  // preserves these local names even in shared chunks, so matching by name
  // is reliable.
  const pureWhenKeyArgIsLocal = new Map([
    ['setClassicDecorator', 0],
    ['setHelperManager', 1],
    ['setInternalHelperManager', 1],
    ['setComponentTemplate', 1],
    ['setComponentManager', 1],
    ['setInternalComponentManager', 1],
    ['setModifierManager', 1],
    ['setInternalModifierManager', 1],
    ['internalHelper', 0],
    ['debugFreeze', 0],
    ['setProxy', 0],
    ['addListener', 0],
    ['removeListener', 0],
  ]);

  // functions that run their callback argument on the spot (used for
  // module-eval warm-ups); the callback body is what gets judged
  const invokesCallbackInline = new Set(['runInDebug', 'track']);

  function isImportBinding(binding) {
    return (
      binding.path.isImportSpecifier() ||
      binding.path.isImportDefaultSpecifier() ||
      binding.path.isImportNamespaceSpecifier()
    );
  }

  function receiverIsLocal(path, object) {
    // a call result (e.g. `EmberObject.extend({}).reopen({})`) is a value
    // created in this file
    if (object.type === 'CallExpression') return true;
    if (object.type !== 'Identifier') return false;
    let binding = path.scope.getBinding(object.name);
    return Boolean(binding) && !isImportBinding(binding);
  }

  // `Object`/`Reflect` helpers that mutate their first argument
  const globalMutators = new Set([
    'assign',
    'defineProperty',
    'defineProperties',
    'setPrototypeOf',
    'freeze',
    'seal',
    'set',
    'deleteProperty',
  ]);

  // walk e.g. `a.b().c` down to `a`
  function baseIdentifier(node) {
    let current = node;
    for (;;) {
      if (current.type === 'MemberExpression' || current.type === 'OptionalMemberExpression') {
        current = current.object;
      } else if (
        current.type === 'CallExpression' ||
        current.type === 'OptionalCallExpression' ||
        current.type === 'NewExpression'
      ) {
        current = current.callee;
      } else {
        break;
      }
    }
    return current.type === 'Identifier' ? current : null;
  }

  function isImported(path, node) {
    let base = baseIdentifier(node);
    if (!base) return false;
    let binding = path.scope.getBinding(base.name);
    return Boolean(binding) && isImportBinding(binding);
  }

  function hasCrossFileEffect(statementPath) {
    let found = false;
    function fail(path) {
      found = true;
      path.stop();
    }
    function checkCall(path) {
      let { callee, arguments: args } = path.node;
      // calls the rules above already declare pure can't be cross-file effects
      if (callee.type === 'Identifier' && pureFunctions.has(callee.name)) return;
      if (callee.type === 'Identifier' && pureWhenKeyArgIsLocal.has(callee.name)) {
        let key = args[pureWhenKeyArgIsLocal.get(callee.name)];
        if (key && key.type !== 'SpreadElement' && !isImported(path, key)) return;
      }
      // these invoke their callback immediately and are otherwise inert
      // (track's frame push/pop is transient and its tag is discarded), so
      // the callback body — judged by the traversal below, see the Function
      // visitor — is the only thing that matters
      if (callee.type === 'Identifier' && invokesCallbackInline.has(callee.name)) return;
      if (
        callee.type === 'MemberExpression' &&
        !callee.computed &&
        callee.property.type === 'Identifier' &&
        alwaysPure.has(callee.property.name)
      ) {
        return;
      }
      if (isImported(path, callee)) return fail(path);
      // `Object.assign(imported, ...)` mutates its argument, not its receiver
      if (
        callee.type === 'MemberExpression' &&
        !callee.computed &&
        callee.object.type === 'Identifier' &&
        (callee.object.name === 'Object' || callee.object.name === 'Reflect') &&
        !statementPath.scope.getBinding(callee.object.name) &&
        callee.property.type === 'Identifier' &&
        globalMutators.has(callee.property.name) &&
        args[0] &&
        isImported(path, args[0])
      ) {
        return fail(path);
      }
    }
    statementPath.traverse({
      Function(fnPath) {
        // a deferred function body only runs (if ever) after module
        // evaluation; an immediately-invoked one runs now and its body
        // counts, as do callbacks of inline invokers like runInDebug/track
        let parent = fnPath.parentPath;
        let isIife = parent.isCallExpression() && parent.node.callee === fnPath.node;
        let isInlineCallback =
          parent.isCallExpression() &&
          parent.node.callee.type === 'Identifier' &&
          invokesCallbackInline.has(parent.node.callee.name) &&
          parent.node.arguments[0] === fnPath.node;
        if (!isIife && !isInlineCallback) fnPath.skip();
      },
      AssignmentExpression(path) {
        if (isImported(path, path.node.left)) fail(path);
      },
      UpdateExpression(path) {
        if (isImported(path, path.node.argument)) fail(path);
      },
      UnaryExpression(path) {
        if (path.node.operator === 'delete' && isImported(path, path.node.argument)) fail(path);
      },
      CallExpression: checkCall,
      OptionalCallExpression: checkCall,
      NewExpression: checkCall,
      TaggedTemplateExpression(path) {
        if (isImported(path, path.node.tag)) fail(path);
      },
      // a throw at module evaluation is observable even when nothing imports
      // the file's bindings
      ThrowStatement: fail,
    });
    return found;
  }

  function annotate(path) {
    if (path.node.leadingComments?.some((c) => /[@#]__PURE__/.test(c.value))) return;
    path.addComment('leading', '#__PURE__');
  }

  function isTopLevel(path) {
    let parent = path.parentPath;
    if (parent.isProgram()) return true;
    return (
      (parent.isExportNamedDeclaration() || parent.isExportDefaultDeclaration()) &&
      parent.parentPath.isProgram()
    );
  }

  // calls inside nested function bodies run later (if ever), not at module
  // evaluation, so they must keep their real semantics
  const annotateEvalTimeCalls = {
    Function(fnPath) {
      fnPath.skip();
    },
    CallExpression: annotate,
    NewExpression: annotate,
  };

  return {
    name: 'annotate-pure-classic-calls',
    visitor: {
      CallExpression(path) {
        let { callee } = path.node;
        if (callee.type === 'Identifier' && pureFunctions.has(callee.name)) {
          annotate(path);
          return;
        }
        if (callee.type !== 'MemberExpression' || callee.computed) return;
        if (callee.property.type !== 'Identifier') return;
        let method = callee.property.name;
        let isPure =
          alwaysPure.has(method) ||
          (pureWhenLocal.has(method) && receiverIsLocal(path, callee.object));
        if (isPure) annotate(path);
      },
      VariableDeclaration(path) {
        if (!isTopLevel(path)) return;
        path.traverse(annotateEvalTimeCalls);
      },
      ClassDeclaration(path) {
        if (!isTopLevel(path)) return;
        path.traverse(annotateEvalTimeCalls);
      },
      ExpressionStatement(path) {
        if (!path.parentPath.isProgram()) return;
        if (hasCrossFileEffect(path)) return;
        path.remove();
      },
      BlockStatement(path) {
        if (!path.parentPath.isProgram()) return;
        if (hasCrossFileEffect(path)) return;
        path.remove();
      },
    },
  };
}

const entryId = '\0side-effect-probe-entry';

/**
 * Re-bundles a built file by itself (every import externalized) and returns
 * whatever code survives tree-shaking. An empty result means importing the
 * file does nothing observable, i.e. it is side-effect free.
 */
export async function probeSurvivingCode(file) {
  let bundle;
  try {
    bundle = await rollup({
      input: entryId,
      treeshake: {
        moduleSideEffects: 'no-external',
        /**
         * The few property accesses that remain after the above
         * tree-shaking (e.g. reading Mixin.prototype.reopen) are not
         * effectful, so they shouldn't force a whole file into the
         * sideEffects list.
         */
        propertyReadSideEffects: false,
      },
      onwarn() {},
      plugins: [
        {
          name: 'side-effect-probe',
          resolveId(source, importer) {
            if (source === entryId) return entryId;
            if (importer === file) return { id: source, external: true };
            return null;
          },
          load(id) {
            if (id === entryId) return `import ${JSON.stringify(file)};`;
          },
          async transform(code, id) {
            if (id !== file) return null;
            let result = await transformAsync(code, {
              configFile: false,
              babelrc: false,
              plugins: [annotatePureClassicCalls],
            });
            return { code: result.code, map: null };
          },
        },
      ],
    });
    let { output } = await bundle.generate({ format: 'es' });
    return output[0].code;
  } finally {
    if (bundle) await bundle.close();
  }
}

export async function hasNoSideEffects(file) {
  let code = await probeSurvivingCode(file);
  return code.trim() === '';
}
