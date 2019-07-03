import { privatize as P } from '@ember/-internals/container';
import { Owner } from '@ember/-internals/owner';
import { OwnedTemplateMeta, StaticTemplateMeta } from '@ember/-internals/views';
import { Template } from '@glimmer/interfaces';
import { LazyCompiler, templateFactory } from '@glimmer/opcode-compiler';
import { SerializedTemplateWithLazyBlock } from '@glimmer/wire-format';

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

const TEMPLATE_COMPILER_MAIN = P`template-compiler:main`;

export default function template(json: StaticTemplate): Factory {
  let glimmerFactory = templateFactory(json);
  let cache = new WeakMap<Owner, OwnedTemplate>();

  let factory = ((owner: Owner) => {
    let result = cache.get(owner);

    if (result === undefined) {
      counters.cacheMiss++;
      let compiler = owner.lookup<LazyCompiler<StaticTemplateMeta>>(TEMPLATE_COMPILER_MAIN)!;
      result = glimmerFactory.create(compiler, { owner });
      cache.set(owner, result);
    } else {
      counters.cacheHit++;
    }

    return result;
  }) as Factory;

  factory.__id = glimmerFactory.id;
  factory.__meta = glimmerFactory.meta;

  return factory;
}

export interface Factory {
  __id: string;
  __meta: StaticTemplateMeta;
  (owner: Owner): OwnedTemplate;
}
