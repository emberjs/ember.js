import { VersionedPathReference } from '@glimmer/reference';
import { CompiledDynamicProgram, ComponentDefinition, NULL_REFERENCE } from '@glimmer/runtime';
import { Opaque } from '@glimmer/util';
import Environment from '../environment';
import { OwnedTemplate, WrappedTemplateFactory } from '../template';
import AbstractManager from './abstract';

class TemplateOnlyComponentLayoutCompiler {
  static id = 'template-only';

  constructor(public template: WrappedTemplateFactory) {
  }

  compile(builder: any) {
    // TODO: use fromLayout
    builder.wrapLayout(this.template);
  }
}

export default class TemplateOnlyComponentManager extends AbstractManager<null> {
  create(): null {
    return null;
  }

  getSelf(): VersionedPathReference<Opaque> {
    return NULL_REFERENCE;
  }

  getDestructor() {
    return null;
  }
}

const MANAGER = new TemplateOnlyComponentManager();

export class TemplateOnlyComponentDefinition extends ComponentDefinition<null> {
  constructor(name: string, public template: OwnedTemplate) {
    super(name, MANAGER, null);
  }
}
