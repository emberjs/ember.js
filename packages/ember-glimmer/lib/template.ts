import { TemplateOptions } from '@glimmer/opcode-compiler';
import {
  Template,
  templateFactory,
  TemplateFactory,
} from '@glimmer/runtime';
import { SerializedTemplateWithLazyBlock } from '@glimmer/wire-format';
import { Owner } from 'ember-utils';
import { OwnedTemplateMeta, StaticTemplateMeta } from 'ember-views';
import { CREATE } from 'container';

export type StaticTemplate = SerializedTemplateWithLazyBlock<StaticTemplateMeta>;
export type OwnedTemplate = Template<OwnedTemplateMeta>;

export default function template(json: StaticTemplate): Factory {
  return new FactoryWrapper(templateFactory(json));
}

export interface Injections {
  options: TemplateOptions<OwnedTemplateMeta>;
  [key: string]: any;
}

export interface Factory {
  id: string;
  meta: StaticTemplateMeta;
  [CREATE]({ properties, owner }: { properties: Injections, owner: Owner }): OwnedTemplate;
}

class FactoryWrapper implements Factory {
  public id: string;
  public meta: StaticTemplateMeta;

  constructor(public factory: TemplateFactory<StaticTemplateMeta>) {
    this.id = factory.id;
    this.meta = factory.meta;
  }

  [CREATE]({ properties, owner }: { properties: Injections, owner: Owner }): OwnedTemplate {
    return this.factory.create(properties.options, { owner });
  }
}
