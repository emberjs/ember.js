import type {
  CompilableProgram,
  LayoutWithContext,
  Nullable,
  Owner,
  SerializedTemplateBlock,
  Template,
  TemplateFactory,
  TemplateOk,
} from '@glimmer/interfaces';
import { assign } from '@glimmer/util/lib/object-utils';

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
}

export interface TemplateWithIdAndReferrer extends TemplateOk {
  id: string;
  referrer: {
    moduleName: string;
    owner: Owner | null;
  };
}

export interface SerializedTemplateWithOps {
  id?: Nullable<string>;
  block: SerializedTemplateBlock;
  moduleName: string;
  scope?: (() => Record<string, unknown>) | undefined | null;
  isStrictMode: boolean;
}

/**
 * Creates a template factory from a block whose opcodes are already objects.
 * Compiled templates import this through `@ember/template-factory/modular`.
 * The factory creates per owner singletons of the template.
 */
export default function templateFactory({
  id: templateId,
  moduleName,
  block: parsedBlock,
  scope,
  isStrictMode,
}: SerializedTemplateWithOps): TemplateFactory {
  // TODO(template-refactors): This should be removed in the near future, as it
  // appears that id is unused. It is currently kept for backwards compat reasons.
  let id = templateId || `client-${clientId++}`;

  let ownerlessTemplate: Template | null = null;
  let templateCache = new WeakMap<object, Template>();

  let factory: TemplateFactoryWithIdAndMeta = (owner?: Owner) => {
    if (owner === undefined) {
      if (ownerlessTemplate === null) {
        templateCacheCounters.cacheMiss++;
        ownerlessTemplate = new TemplateImpl({
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
      result = new TemplateImpl({ id, block: parsedBlock, moduleName, owner, scope, isStrictMode });
      templateCache.set(owner, result);
    } else {
      templateCacheCounters.cacheHit++;
    }

    return result;
  };

  factory.__id = id;
  factory.__meta = { moduleName };

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
