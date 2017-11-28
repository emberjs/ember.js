import {
  Template,
  templateFactory,
  TemplateFactory,
} from '@glimmer/runtime';
import { OWNER, Owner } from 'ember-utils';
import { TemplateMeta } from 'ember-views';

export type OwnedTemplate = Template<TemplateMeta>;

export class WrappedTemplateFactory {
  id: string;
  meta: {
    moduleName: string;
    managerId?: string;
  };

  constructor(public factory: TemplateFactory<{
    moduleName: string;
    managerId?: string;
  }>) {
    this.id = factory.id;
    this.meta = factory.meta;
  }

  create(props: any): OwnedTemplate {
    const owner: Owner = props[OWNER];
    // I'm pretty sure there is only supposed to be one of these
    // injected into all templates.
    return this.factory.create(props.compileOptions, { owner });
  }
}

export default function template(json: any) {
  const factory = templateFactory<{
    moduleName: string;
    managerId?: string;
  }, {
    owner: Owner;
  }>(json);
  return new WrappedTemplateFactory(factory);
}
