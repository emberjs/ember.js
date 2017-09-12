import { Dict, Option } from "@glimmer/interfaces";
import { ComponentCapabilities, ParsedLayout } from "@glimmer/opcode-compiler";
import { SerializedTemplateWithLazyBlock, SerializedTemplateBlock, TemplateMeta } from "@glimmer/wire-format";
import { precompile } from "@glimmer/compiler";

export type Attrs = Dict<any>;
export type AttrsDiff = { oldAttrs: Option<Attrs>, newAttrs: Attrs };

export interface StaticComponentState {
  capabilities: ComponentCapabilities;
}

export abstract class GenericStaticComponentState implements StaticComponentState {
  abstract capabilities: ComponentCapabilities;

  constructor(public name: string, public ComponentClass: any, public layout: Option<number>) {
  }

  toJSON() {
    return { GlimmerDebug: `<component ${this.name}>` };
  }
}

export class GenericComponentManager {
  getCapabilities(state: GenericStaticComponentState): ComponentCapabilities {
    return state.capabilities;
  }
}

export function createTemplate(templateSource: string, meta: TemplateMeta = {}): ParsedLayout {
  let wrapper: SerializedTemplateWithLazyBlock<TemplateMeta> = JSON.parse(precompile(templateSource, { meta }));
  let block: SerializedTemplateBlock = JSON.parse(wrapper.block);

  return { block, referrer: meta };
}
