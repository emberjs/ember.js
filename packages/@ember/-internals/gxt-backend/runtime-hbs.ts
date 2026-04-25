/**
 * Runtime-compatible hbs tagged template function
 *
 * Provides a runtime version of the hbs template tag that uses
 * the GXT runtime compiler. Used when templates wrapped in functions
 * cannot be compiled at build time.
 */

// Use direct paths to avoid circular alias resolution
// @ts-ignore - direct path import
import {
  compileTemplate as gxtCompileTemplate,
  createTemplateFactory as gxtCreateTemplateFactory,
  setupGlobalScope,
  isGlobalScopeReady,
} from '@lifeart/gxt/runtime-compiler';

// @ts-ignore - direct path import
import {
  createRoot as gxtCreateRoot,
  setParentContext as gxtSetParentContext,
} from '@lifeart/gxt';

// Install Ember wrappers on globalThis (idempotent)
import { installEmberWrappers } from './ember-gxt-wrappers';

// Ensure global scope is set up
if (!isGlobalScopeReady()) {
  setupGlobalScope();
}

// Install Ember wrappers on globalThis after GXT sets up its globals
installEmberWrappers();

// Cache for compiled templates to avoid recompilation
const templateCache = new Map<string, any>();

/**
 * Transform `{{outlet}}` to `<ember-outlet />` so that GXT compiles it as a
 * custom element. The GXT AST pass for outlets does not run inside the runtime
 * compiler path (it treats `{{outlet}}` as a default slot yield), so we
 * pre-process the source string here to mirror what the build-time plugin
 * does (see packages/demo/compat/gxt-template-compiler-plugin.mjs).
 */
function transformOutletInSource(code: string): string {
  const isIdent = (ch: string | undefined) => !!ch && /[A-Za-z0-9_$]/.test(ch);
  const skipWS = (c: string, i: number) => {
    while (i < c.length && (c[i] === ' ' || c[i] === '\t' || c[i] === '\n' || c[i] === '\r')) i++;
    return i;
  };
  let r = '';
  let i = 0;
  while (i < code.length) {
    if (code[i] === '{' && code[i + 1] === '{') {
      const j = skipWS(code, i + 2);
      if (code.startsWith('outlet', j)) {
        const afterWord = j + 6;
        // Make sure "outlet" is a standalone word (not e.g. "outletName")
        if (!isIdent(code[afterWord])) {
          const k = skipWS(code, afterWord);
          if (code[k] === '}' && code[k + 1] === '}') {
            r += '<ember-outlet />';
            i = k + 2;
            continue;
          }
        }
      }
    }
    r += code[i];
    i++;
  }
  return r;
}

const GXT_COMPILE_FLAGS = {
  IS_GLIMMER_COMPAT_MODE: true,
  WITH_EMBER_INTEGRATION: true,
  WITH_HELPER_MANAGER: true,
  WITH_MODIFIER_MANAGER: true,
  WITH_CONTEXT_API: true,
  TRY_CATCH_ERROR_HANDLING: false,
} as const;

/**
 * Runtime hbs tagged template function
 *
 * Creates an Ember-compatible template factory that uses the GXT runtime compiler.
 */
export function hbs(strings: TemplateStringsArray, ...values: any[]): any {
  // Reconstruct the template string
  let templateString = strings[0];
  for (let i = 0; i < values.length; i++) {
    templateString += String(values[i]) + strings[i + 1];
  }

  // Check cache first
  const cached = templateCache.get(templateString);
  if (cached) return cached;

  // Pre-process {{outlet}} → <ember-outlet /> because the runtime GXT
  // compiler does not run the build-time outlet AST pass; without this,
  // {{outlet}} is treated as a default-slot yield and emits empty markers.
  const preprocessed = transformOutletInSource(templateString);

  // Compile using GXT runtime compiler (curly component / PascalCase
  // transforms run in the compiler's AST passes)
  const compilationResult = gxtCompileTemplate(preprocessed, {
    moduleName: 'runtime-hbs',
    flags: GXT_COMPILE_FLAGS,
  });

  if (compilationResult.errors?.length > 0) {
    console.warn('[runtime-hbs] Compilation warnings:', compilationResult.errors);
  }

  // Helper to convert any result item to a Node
  const itemToNode = (item: any): Node | null => {
    if (item instanceof Node) return item;
    if (typeof item === 'string') return document.createTextNode(item);
    if (typeof item === 'number' || typeof item === 'boolean')
      return document.createTextNode(String(item));
    if (item && typeof item === 'object' && '$nodes' in item) {
      const frag = document.createDocumentFragment();
      for (const n of (item as any).$nodes || []) {
        const node = itemToNode(n);
        if (node) frag.appendChild(node);
      }
      return frag.childNodes.length > 0 ? frag : null;
    }
    return null;
  };

  // Create an Ember-compatible template factory
  const templateFactory = {
    __gxtCompiled: true,
    __gxtRuntimeCompiled: true,
    moduleName: 'runtime-hbs',
    _templateFn: compilationResult.templateFn,
    _code: compilationResult.code,
    id: `runtime-hbs-${Date.now()}-${Math.random().toString(36).slice(2)}`,

    toString() {
      return `[runtime-hbs template: ${templateString.slice(0, 50)}...]`;
    },

    render(context: any, parentElement: Element | null) {
      if (!parentElement) {
        console.warn('[runtime-hbs] No parent element provided for render');
        return { nodes: [] };
      }

      try {
        // Use shared GXT root context to avoid multiple roots fighting
        // over the parent context when modules are deduplicated
        let gxtRoot = (globalThis as any).__gxtRootContext;
        if (!gxtRoot) {
          gxtRoot = gxtCreateRoot(document);
          (globalThis as any).__gxtRootContext = gxtRoot;
        }
        gxtSetParentContext(gxtRoot);

        let result = compilationResult.templateFn.call(context);

        const nodes: Node[] = [];
        const appendNode = (node: Node) => {
          if (node instanceof DocumentFragment) {
            for (const child of Array.from(node.childNodes)) {
              nodes.push(child);
              parentElement.appendChild(child);
            }
          } else {
            nodes.push(node);
            parentElement.appendChild(node);
          }
        };

        if (Array.isArray(result)) {
          for (const item of result) {
            const node = itemToNode(item);
            if (node) appendNode(node);
          }
        } else {
          const node = itemToNode(result);
          if (node) appendNode(node);
        }

        return { nodes, ctx: context };
      } catch (err: any) {
        // Rethrow assertion/validation errors so they propagate to test harnesses
        if (
          err &&
          (err.message?.includes('Assertion Failed') ||
            err.message?.includes('Custom modifier managers must have'))
        ) {
          throw err;
        }
        console.error(
          '[runtime-hbs] Render error:',
          err instanceof Error ? err.message : String(err)
        );
        return { nodes: [], ctx: context };
      }
    },
  };

  templateCache.set(templateString, templateFactory);
  return templateFactory;
}

// Re-export GXT compiler functions for compatibility
export { gxtCompileTemplate as compileTemplate };
export { gxtCreateTemplateFactory as createTemplateFactory };
export { setupGlobalScope, isGlobalScopeReady };

export default hbs;
