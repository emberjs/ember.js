import {
  Template,
  templateFactory,
  TemplateFactory,
} from '@glimmer/runtime';
import { OWNER } from 'ember-utils';

export interface Container {
  lookup<T>(name: string): T;
  factoryFor<T>(name: string): T;
  buildChildEngineInstance<T>(name: string): T;
  hasRegistration(name: string): boolean;
}

export type OwnedTemplate = Template<{
  moduleName: string;
  owner: Container;
}>;

export class WrappedTemplateFactory {
  id: string;
  meta: {
    moduleName: string;
  };

  constructor(public factory: TemplateFactory<{
    moduleName: string;
  }, {
    owner: Container;
  }>) {
    this.id = factory.id;
    this.meta = factory.meta;
  }

  create(props: any): OwnedTemplate {
    let owner = props[OWNER];
    return this.factory.create(props.env, { owner });
  }
}

export default function template(json: any) {
  const factory = templateFactory<{
    moduleName: string;
  }, {
    owner: Container;
  }>(json);
  return new WrappedTemplateFactory(factory);
}
