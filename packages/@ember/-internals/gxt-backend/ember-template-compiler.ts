/**
 * GXT-compatible ember-template-compiler replacement
 *
 * This module provides runtime template compilation that produces
 * gxt-compatible templates with $nodes structure.
 * Delegates to compile.ts which uses the GXT runtime compiler.
 */

// GXT compile options type
export interface EmberPrecompileOptions {
  moduleName?: string;
  strictMode?: boolean;
  locals?: string[];
  isProduction?: boolean;
  meta?: Record<string, unknown>;
  plugins?: {
    ast?: any[];
  };
  parseOptions?: {
    srcName?: string;
    ignoreStandalone?: boolean;
  };
  customizeComponentName?: (name: string) => string;
}

/**
 * Compile a template string to a gxt-compatible template factory.
 * Delegates to compile.ts which uses the GXT runtime compiler for proper
 * component invocation (e.g., <XBlah /> -> $_c('x-blah', ...)).
 */
import { compileTemplate } from './compile';
import { templateCacheCounters } from '@glimmer/opcode-compiler';
import { ENV } from '@ember/-internals/environment';
import VERSION from 'ember/version';

// Block params named like keywords and block keywords that the scope shadows
// are handled on the template's AST, in compile.ts (`buildGxtLexicalTransforms`
// in ast-transforms.ts).
export function compile(templateString: string, options?: any) {
  return _instrumentFactory(compileTemplate(templateString, options), options);
}

// Wrap a GXT template factory so that `factory(owner)` participates in the
// shared `templateCacheCounters` accounting used by `ember-glimmer runtime
// resolver cache`. The first call for each unique owner is a miss; any
// further call for the same owner is a hit, matching the Glimmer
// opcode-compiler `templateFactory` accounting (a per-owner WeakMap that
// counts exactly once per `factory(owner)` invocation).
//
// The inner factory's return value is also cached per owner so the wrapped
// factory behaves identically on repeated invocations.
//
// The wrapper is published on the bridge (`installCompilePipelinePart`, at
// module bottom) so the GXT-aware `template` shim in `@ember/-internals/glimmer`
// can apply the same accounting to factories from the `precompile`+`template`
// pathway. It lives here because it closes over the `templateCacheCounters`
// import.

function _instrumentFactory(factory: any, compileOptions?: any): any {
  if (!factory || (factory as any).__gxtCountedFactory) return factory;
  const inner = factory;
  const ownerTemplates: WeakMap<object, unknown> = new WeakMap<object, unknown>();
  let ownerlessTemplate: unknown = undefined;
  let ownerlessSeen = false;
  // `{moduleName:'-top-level'}` is the marker that RenderingTestCase.render()
  // stamps on the synthetic template built for each `this.render(...)` call.
  // Glimmer's debug-render-tree re-reads that top-level template during the
  // render transaction, producing one hit per factory. Emulate that once on
  // first invocation so `ember-glimmer runtime resolver cache`'s assertions
  // line up in DEBUG mode. The re-read only happens when the debug render
  // tree is actually enabled (ENV._DEBUG_RENDER_TREE — true under the dev
  // test harness, false in production builds), so the emulated hit must be
  // gated the same way; read lazily at invocation time because tests
  // force-enable the flag in their setup.
  const _isTopLevelMarker = compileOptions?.moduleName === '-top-level';
  const _isTopLevel = () => _isTopLevelMarker && ENV._DEBUG_RENDER_TREE === true;
  // Per-(owner,renderPass) marker so repeated calls within the same render
  // transaction count as cache hits (matching classic Glimmer templateFactory
  // semantics) but calls across render transactions (e.g. runTask toggle
  // flushes) count as a single hit.
  const ownerSeenInPass: WeakMap<object, number> = new WeakMap<object, number>();
  let ownerlessSeenInPass: number | null = null;
  const wrapped: any = function (owner?: any) {
    const currentPass = getGxtRenderer()?.viewUtils.getRenderPassId?.() ?? 0;
    if (owner && typeof owner === 'object') {
      const cached = ownerTemplates.get(owner);
      if (cached !== undefined) {
        const lastPass = ownerSeenInPass.get(owner);
        if (lastPass === currentPass) {
          // Repeated resolution WITHIN the same render pass — record a
          // cache hit, matching classic Glimmer.
          templateCacheCounters.cacheHit++;
        } else {
          // First resolution in this pass — no counter change (the
          // component manager / resolver already cached the Template).
          ownerSeenInPass.set(owner, currentPass);
        }
        return cached;
      }
      templateCacheCounters.cacheMiss++;
      if (_isTopLevel()) templateCacheCounters.cacheHit++;
      const fresh = inner(owner);
      ownerTemplates.set(owner, fresh);
      ownerSeenInPass.set(owner, currentPass);
      return fresh;
    }
    if (ownerlessSeen) {
      if (ownerlessSeenInPass === currentPass) {
        templateCacheCounters.cacheHit++;
      } else {
        ownerlessSeenInPass = currentPass;
      }
      return ownerlessTemplate;
    }
    ownerlessSeen = true;
    ownerlessSeenInPass = currentPass;
    templateCacheCounters.cacheMiss++;
    if (_isTopLevel()) templateCacheCounters.cacheHit++;
    ownerlessTemplate = inner(owner);
    return ownerlessTemplate;
  };
  // Preserve properties stamped onto the original factory (moduleName, id,
  // __gxtCompiled, etc.) and delegate unknown accesses/writes to the
  // underlying factory so callers that mutate the factory in place (e.g.
  // tests that set `factory.name = ...`) keep working.
  Object.setPrototypeOf(wrapped, Object.getPrototypeOf(inner));
  for (const key of Object.getOwnPropertyNames(inner)) {
    if (key === 'length' || key === 'name' || key === 'prototype') continue;
    // `wrapped` is a fresh function whose own properties (`length`, `name`,
    // `prototype`) are skipped above, so every descriptor can be defined.
    const desc = Object.getOwnPropertyDescriptor(inner, key);
    if (desc) {
      Object.defineProperty(wrapped, key, desc);
    }
  }
  wrapped.__gxtCountedFactory = true;
  return wrapped;
}

// Eagerly publish the instrumentation on the bridge so the `template` shim
// sees it even when `template(precompile(...))` is called before any
// `compile()`.
import { getGxtRenderer, installCompilePipelinePart } from './gxt-bridge';
installCompilePipelinePart({
  instrumentFactory: _instrumentFactory,
});

/**
 * Precompile a template string (returns serialized form)
 */
export function precompile(
  templateString: string,
  options: Partial<EmberPrecompileOptions> = {}
): string {
  // For gxt, return a marker that indicates this needs runtime compilation.
  return JSON.stringify({
    __gxtTemplate: true,
    source: templateString,
    moduleName: options.moduleName,
  });
}

// Re-export compileOptions for compatibility
export function compileOptions(options: Partial<EmberPrecompileOptions> = {}) {
  return options;
}

// The public ember-template-compiler API exports these two with a leading
// underscore (packages/ember-template-compiler/lib/public-api.ts).
export function _buildCompileOptions(options: any) {
  return options;
}

export function _transformsFor() {
  return [];
}

export { VERSION };

// Minimal GlimmerSyntax placeholder (no-op implementations)
export const _GlimmerSyntax = {
  preprocess(_template: string) {
    return { body: [] };
  },
  traverse() {},
  print(_ast: any) {
    return '';
  },
};

export const _preprocess = _GlimmerSyntax.preprocess;
export const _print = _GlimmerSyntax.print;
export const _precompile = precompile;

// Default export
export default { compile, precompile, VERSION };
