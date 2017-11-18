import {
  EagerOpcodeBuilder,
  Macros,
  OpcodeBuilderConstructor,
  TemplateOptions
} from '@glimmer/opcode-compiler';
import {
  LazyConstants,
  Program
} from '@glimmer/program';
import {
  Template,
  templateFactory,
  TemplateFactory,
} from '@glimmer/runtime';
import { OWNER, Owner } from 'ember-utils';
import { TemplateMeta } from 'ember-views';
import CompileTimeLookup from './compile-time-lookup';
import RuntimeResolver from './resolver';

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
    const resolver = new RuntimeResolver(owner);
    // I'm pretty sure there is only supposed to be one of these
    // injected into all templates.
    const options: TemplateOptions<{
      moduleName: string;
      managerId?: string;
    }> = {
      program: new Program(new LazyConstants(resolver)),
      macros: new Macros(),
      resolver: new CompileTimeLookup(resolver),
      Builder: EagerOpcodeBuilder as OpcodeBuilderConstructor
    };
    return this.factory.create(options, { owner });
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
