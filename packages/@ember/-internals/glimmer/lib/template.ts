import { getOwner } from '@ember/-internals/owner';
import { OwnedTemplateMeta, StaticTemplateMeta } from '@ember/-internals/views';
import { Template } from '@glimmer/interfaces';
import { LazyCompiler, templateFactory, TemplateFactory } from '@glimmer/opcode-compiler';
import { SerializedTemplateWithLazyBlock } from '@glimmer/wire-format';

export type StaticTemplate = SerializedTemplateWithLazyBlock<StaticTemplateMeta>;
export type OwnedTemplate = Template<OwnedTemplateMeta>;

export default function template(json: StaticTemplate): Factory {
  return new FactoryWrapper(templateFactory(json));
}

export interface Injections {
  compiler: LazyCompiler<StaticTemplateMeta>;
  [key: string]: any;
}

export interface Factory {
  id: string;
  meta: StaticTemplateMeta;
  create(injections: Injections): OwnedTemplate;
}

class FactoryWrapper implements Factory {
  public id: string;
  public meta: StaticTemplateMeta;

  constructor(public factory: TemplateFactory<StaticTemplateMeta>) {
    this.id = factory.id;
    this.meta = factory.meta;
  }

  create(injections: Injections): OwnedTemplate {
    const owner = getOwner(injections);
    return this.factory.create(injections.compiler, { owner });
  }
}
