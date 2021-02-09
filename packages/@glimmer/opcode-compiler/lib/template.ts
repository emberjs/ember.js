import {
  CompilableProgram,
  LayoutWithContext,
  Option,
  Owner,
  SerializedTemplateBlock,
  SerializedTemplateWithLazyBlock,
  Template,
  TemplateFactory,
  TemplateOk,
} from '@glimmer/interfaces';
import { assign } from '@glimmer/util';
import { compilable } from './compilable-template';
import { WrappedBuilder } from './wrapped-component';

export let templateCacheCounters = {
  cacheHit: 0,
  cacheMiss: 0,
};

// These interfaces are for backwards compatibility, some addons use these intimate APIs
export interface TemplateFactoryWithMeta extends TemplateFactory {
  __meta?: { moduleName: string };
}

export interface TemplateWithReferrer extends TemplateOk {
  referrer: {
    moduleName: string;
    owner: Owner | null;
  };
}

/**
 * Wraps a template js in a template module to change it into a factory
 * that handles lazy parsing the template and to create per env singletons
 * of the template.
 */
export default function templateFactory({
  moduleName,
  block,
  scope,
  isStrictMode,
}: SerializedTemplateWithLazyBlock): TemplateFactory {
  // TODO: This caches JSON serialized output once in case a template is
  // compiled by multiple owners, but we haven't verified if this is actually
  // helpful. We should benchmark this in the future.
  let parsedBlock: SerializedTemplateBlock;

  let ownerlessTemplate: Template | null = null;
  let templateCache = new WeakMap<object, Template>();

  let factory: TemplateFactoryWithMeta = (owner?: Owner) => {
    if (parsedBlock === undefined) {
      parsedBlock = JSON.parse(block);
    }

    if (owner === undefined) {
      if (ownerlessTemplate === null) {
        templateCacheCounters.cacheMiss++;
        ownerlessTemplate = new TemplateImpl({
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

    let result = templateCache.get(owner) as Template;

    if (result === undefined) {
      templateCacheCounters.cacheMiss++;
      result = new TemplateImpl({ block: parsedBlock, moduleName, owner, scope, isStrictMode });
      templateCache.set(owner, result);
    } else {
      templateCacheCounters.cacheHit++;
    }

    return result;
  };

  factory.__meta = { moduleName };

  return factory;
}

class TemplateImpl implements TemplateWithReferrer {
  readonly result = 'ok';

  private layout: Option<CompilableProgram> = null;
  private partial: Option<CompilableProgram> = null;
  private wrappedLayout: Option<CompilableProgram> = null;

  constructor(private parsedLayout: Omit<LayoutWithContext, 'asPartial'>) {}

  get moduleName() {
    return this.parsedLayout.moduleName;
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
    return (this.layout = compilable(
      assign({}, this.parsedLayout, {
        asPartial: false,
      }),
      this.moduleName
    ));
  }

  asPartial(): CompilableProgram {
    if (this.partial) return this.partial;
    return (this.partial = compilable(
      assign({}, this.parsedLayout, {
        asPartial: true,
      }),
      this.moduleName
    ));
  }

  asWrappedLayout(): CompilableProgram {
    if (this.wrappedLayout) return this.wrappedLayout;
    return (this.wrappedLayout = new WrappedBuilder(
      assign({}, this.parsedLayout, {
        asPartial: false,
      }),
      this.moduleName
    ));
  }
}
