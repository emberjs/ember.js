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

/**
 * Wraps a template js in a template module to change it into a factory
 * that handles lazy parsing the template and to create per env singletons
 * of the template.
 */
export default function templateFactory({
  id: templateId,
  moduleName,
  block,
}: SerializedTemplateWithLazyBlock): TemplateFactory {
  // TODO(template-refactors): This should be removed in the near future, as it
  // appears that id is unused. It is currently kept for backwards compat reasons.
  let id = templateId || `client-${clientId++}`;

  // TODO: This caches JSON serialized output once in case a template is
  // compiled by multiple owners, but we haven't verified if this is actually
  // helpful. We should benchmark this in the future.
  let parsedBlock: SerializedTemplateBlock;

  let ownerlessTemplate: Template | null = null;
  let templateCache = new WeakMap<object, Template>();

  let factory: TemplateFactoryWithIdAndMeta = (owner?: Owner) => {
    if (parsedBlock === undefined) {
      parsedBlock = JSON.parse(block);
    }

    if (owner === undefined) {
      if (ownerlessTemplate === null) {
        templateCacheCounters.cacheMiss++;
        ownerlessTemplate = new TemplateImpl({
          id,
          block: parsedBlock,
          moduleName,
          owner: null,
        });
      } else {
        templateCacheCounters.cacheHit++;
      }

      return ownerlessTemplate;
    }

    let result = templateCache.get(owner) as Template;

    if (result === undefined) {
      templateCacheCounters.cacheMiss++;
      result = new TemplateImpl({ id, block: parsedBlock, moduleName, owner });
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

  private layout: Option<CompilableProgram> = null;
  private partial: Option<CompilableProgram> = null;
  private wrappedLayout: Option<CompilableProgram> = null;

  constructor(private parsedLayout: Omit<LayoutWithContext, 'asPartial'>) {}

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
    return (this.layout = compilable(
      assign({}, this.parsedLayout, {
        asPartial: false,
      })
    ));
  }

  asPartial(): CompilableProgram {
    if (this.partial) return this.partial;
    return (this.layout = compilable(
      assign({}, this.parsedLayout, {
        asPartial: true,
      })
    ));
  }

  asWrappedLayout(): CompilableProgram {
    if (this.wrappedLayout) return this.wrappedLayout;
    return (this.wrappedLayout = new WrappedBuilder(
      assign({}, this.parsedLayout, {
        asPartial: false,
      })
    ));
  }
}
