import type {
  CompilableProgram,
  Initializable,
  LayoutWithContext,
  Nullable,
  Owner,
  SerializedTemplateBlock,
  SerializedTemplateWithLazyBlock,
  Template,
  TemplateFactory,
  TemplateOk,
} from '@glimmer/interfaces';
import { assign } from '@glimmer/util';
import { compile as gxtRuntimeCompile } from '@lifeart/gxt/runtime-compiler';

import { compilable } from './compilable-template';
import { WrappedBuilder } from './wrapped-component';

let clientId = 0;

export let templateCacheCounters = {
  cacheHit: 0,
  cacheMiss: 0,
};

// These interfaces are for backwards compatibility, some addons use these intimate APIs
export interface TemplateFactoryWithIdAndMeta extends TemplateFactory {
  __id?: string;
  __meta?: { moduleName: string };
  /** GXT integration: marks this factory as having a GXT-compiled version */
  __gxt?: boolean;
  /** GXT integration: lazily returns the GXT-compiled template function */
  __gxtFn?: () => Function;
}

export interface TemplateWithIdAndReferrer extends TemplateOk {
  id: string;
  referrer: {
    moduleName: string;
    owner: Owner | null;
  };
}

// Augmented serialized format: glimmer bytecode + GXT source (for strict-mode templates)
type AugmentedSerializedTemplate = SerializedTemplateWithLazyBlock & {
  gxtSource?: string;
};

/**
 * Wraps a template js in a template module to change it into a factory
 * that handles lazy parsing the template and to create per env singletons
 * of the template.
 *
 * When the serialized template includes a `gxtSource` field (set by our
 * modified precompile for strict-mode templates), the factory is also
 * marked with `__gxt = true` and `__gxtFn` so that the modern
 * `renderComponent` API can delegate to GXT's renderer instead of the
 * glimmer bytecode VM.  The standard `asLayout()` path continues to work
 * for the classic ClassicRootState / routing path.
 */
export default function templateFactory({
  id: templateId,
  moduleName,
  block,
  scope,
  isStrictMode,
  gxtSource,
}: AugmentedSerializedTemplate): TemplateFactory {
  // TODO(template-refactors): This should be removed in the near future, as it
  // appears that id is unused. It is currently kept for backwards compat reasons.
  let id = templateId || `client-${clientId++}`;

  // TODO: This caches JSON serialized output once in case a template is
  // compiled by multiple owners, but we haven't verified if this is actually
  // helpful. We should benchmark this in the future.
  let parsedBlock: Initializable<SerializedTemplateBlock>;

  let ownerlessTemplate: Template | null = null;
  let templateCache = new WeakMap<object, Template>();

  // Lazily-compiled GXT template function (shared across all Template instances)
  let gxtCompiledFn: Function | null = null;
  const getGXTFnFromFactory = gxtSource != null
    ? () => {
        if (gxtCompiledFn === null) {
          const scopeValues = scope ? scope() : {};
          gxtCompiledFn = (gxtRuntimeCompile as unknown as Function)(gxtSource, {
            moduleName,
            scopeValues,
            flags: {
              IS_GLIMMER_COMPAT_MODE: true,
              WITH_EMBER_INTEGRATION: true,
              WITH_HELPER_MANAGER: true,
              WITH_MODIFIER_MANAGER: true,
              WITH_CONTEXT_API: true,
              TRY_CATCH_ERROR_HANDLING: true,
            },
          });
        }
        return gxtCompiledFn!;
      }
    : null;

  function makeTemplate(parsedLayout: LayoutWithContext): TemplateImpl {
    const t = new TemplateImpl(parsedLayout);
    if (getGXTFnFromFactory !== null) {
      (t as any).__gxtFn = getGXTFnFromFactory;
    }
    return t;
  }

  let factory: TemplateFactoryWithIdAndMeta = (owner?: Owner) => {
    if (parsedBlock === undefined) {
      parsedBlock = JSON.parse(block) as SerializedTemplateBlock;
    }

    if (owner === undefined) {
      if (ownerlessTemplate === null) {
        templateCacheCounters.cacheMiss++;
        ownerlessTemplate = makeTemplate({
          id,
          block: parsedBlock,
          moduleName,
          owner: null,
          scope,
          isStrictMode,
        });
      } else {
        templateCacheCounters.cacheHit++;
      }

      return ownerlessTemplate;
    }

    let result = templateCache.get(owner);

    if (result === undefined) {
      templateCacheCounters.cacheMiss++;
      result = makeTemplate({ id, block: parsedBlock, moduleName, owner, scope, isStrictMode });
      templateCache.set(owner, result);
    } else {
      templateCacheCounters.cacheHit++;
    }

    return result;
  };

  factory.__id = id;
  factory.__meta = { moduleName };

  // GXT augmentation: mark the factory with __gxt and attach the shared
  // getGXTFn so that the renderer can find it via factory.__gxtFn().
  if (getGXTFnFromFactory !== null) {
    factory.__gxt = true;
    factory.__gxtFn = getGXTFnFromFactory;
  }

  return factory;
}

class TemplateImpl implements TemplateWithIdAndReferrer {
  readonly result = 'ok';

  private layout: Nullable<CompilableProgram> = null;
  private wrappedLayout: Nullable<CompilableProgram> = null;

  constructor(private parsedLayout: LayoutWithContext) {}

  get moduleName() {
    return this.parsedLayout.moduleName;
  }

  get id() {
    return this.parsedLayout.id;
  }

  // TODO(template-refactors): This should be removed in the near future, it is
  // only being exposed for backwards compatibility
  get referrer() {
    return {
      moduleName: this.parsedLayout.moduleName,
      owner: this.parsedLayout.owner,
    };
  }

  asLayout(): CompilableProgram {
    if (this.layout) return this.layout;
    return (this.layout = compilable(assign({}, this.parsedLayout), this.moduleName));
  }

  asWrappedLayout(): CompilableProgram {
    if (this.wrappedLayout) return this.wrappedLayout;
    return (this.wrappedLayout = new WrappedBuilder(
      assign({}, this.parsedLayout),
      this.moduleName
    ));
  }
}
