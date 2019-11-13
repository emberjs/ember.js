import { Owner } from '@ember/-internals/owner';
import { OwnedTemplateMeta, StaticTemplateMeta } from '@ember/-internals/views';
import { SerializedTemplateWithLazyBlock, Template } from '@glimmer/interfaces';
import { templateFactory } from '@glimmer/opcode-compiler';

export type StaticTemplate = SerializedTemplateWithLazyBlock<StaticTemplateMeta>;
export type OwnedTemplate = Template<OwnedTemplateMeta>;

export function isTemplateFactory(template: OwnedTemplate | Factory): template is Factory {
  return typeof template === 'function';
}

export function id(factory: Factory): string {
  return factory.__id;
}

export function meta(factory: Factory): StaticTemplateMeta {
  return factory.__meta;
}

export let counters = {
  cacheHit: 0,
  cacheMiss: 0,
};

export default function template(json: StaticTemplate): Factory {
  let glimmerFactory = templateFactory(json);
  let cache = new WeakMap<Owner, OwnedTemplate>();

  const meta = glimmerFactory.meta as StaticTemplateMeta;

  let factory = ((owner: Owner) => {
    let result = cache.get(owner);

    if (result === undefined) {
      counters.cacheMiss++;
      // let compiler = owner.lookup<LazyCompiler<StaticTemplateMeta>>(TEMPLATE_COMPILER_MAIN)!;
      result = glimmerFactory.create(Object.assign({ owner }, meta));
      cache.set(owner, result);
    } else {
      counters.cacheHit++;
    }

    return result;
  }) as Factory;

  factory.__id = glimmerFactory.id;
  factory.__meta = meta;

  return factory;
}

export interface Factory {
  __id: string;
  __meta: StaticTemplateMeta;
  (owner: Owner): OwnedTemplate;
}
