import {
  LazyConstants,
  Program
} from '@glimmer/program';
import {
  Template,
  templateFactory,
  TemplateFactory,
} from '@glimmer/runtime';
import {
  EagerOpcodeBuilder,
  OpcodeBuilderConstructor,
  Macros
} from '@glimmer/opcode-compiler';
import { OWNER } from 'ember-utils';

import RuntimeResolver from './resolver';
import CompileTimeLookup from './compile-time-lookup';

export interface Container {
  lookup<T>(name: string): T;
  factoryFor<T>(name: string): T;
  buildChildEngineInstance<T>(name: string): T;
  hasRegistration(name: string, options?: any): boolean;
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
  }>) {
    this.id = factory.id;
    this.meta = factory.meta;
  }

  create(props: any): OwnedTemplate {
    const owner = props[OWNER];
    const resolver = new RuntimeResolver(owner);
    return this.factory.create({
      program: new Program(new LazyConstants(resolver)),
      macros: new Macros(),
      lookup: new CompileTimeLookup(resolver),
      Builder: EagerOpcodeBuilder as OpcodeBuilderConstructor
    }, { owner });
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
