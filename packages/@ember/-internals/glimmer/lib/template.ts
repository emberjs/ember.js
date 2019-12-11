import { Owner } from '@ember/-internals/owner';
import { guidFor } from '@ember/-internals/utils';
import { OwnedTemplateMeta, StaticTemplateMeta } from '@ember/-internals/views';
import { SerializedTemplateWithLazyBlock, Template } from '@glimmer/interfaces';
import { templateFactory } from '@glimmer/opcode-compiler';

export type StaticTemplate = SerializedTemplateWithLazyBlock<StaticTemplateMeta>;
export type OwnedTemplate = Template<OwnedTemplateMeta>;

const OWNER_ID_TO_HANDLE = new Map<string, {}>();
const HANDLE_TO_OWNER = new WeakMap<{}, Owner>();

export function getTemplateMetaOwner({ ownerId }: OwnedTemplateMeta): Owner {
  let handle = OWNER_ID_TO_HANDLE.get(ownerId)!;
  return HANDLE_TO_OWNER.get(handle)!;
}

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
    let ownerId = guidFor(owner);

    if (!OWNER_ID_TO_HANDLE.has(ownerId)) {
      let handle = {};
      OWNER_ID_TO_HANDLE.set(ownerId, handle);
      HANDLE_TO_OWNER.set(handle, owner);
    }

    if (result === undefined) {
      counters.cacheMiss++;
      result = glimmerFactory.create(Object.assign({ ownerId }, meta));
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
