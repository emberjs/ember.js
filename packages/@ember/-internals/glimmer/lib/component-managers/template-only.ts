import { OwnedTemplateMeta } from '@ember/-internals/views';
import { ComponentCapabilities } from '@glimmer/interfaces';
import { CONSTANT_TAG } from '@glimmer/reference';
import {
  ComponentDefinition,
  Invocation,
  NULL_REFERENCE,
  WithStaticLayout,
} from '@glimmer/runtime';
import RuntimeResolver from '../resolver';
import { OwnedTemplate } from '../template';
import AbstractManager from './abstract';

const CAPABILITIES: ComponentCapabilities = {
  dynamicLayout: false,
  dynamicTag: false,
  prepareArgs: false,
  createArgs: false,
  attributeHook: false,
  elementHook: false,
  createCaller: true,
  dynamicScope: true,
  updateHook: true,
  createInstance: true,
};

export default class TemplateOnlyComponentManager extends AbstractManager<null, OwnedTemplate>
  implements WithStaticLayout<null, OwnedTemplate, OwnedTemplateMeta, RuntimeResolver> {
  getLayout(template: OwnedTemplate): Invocation {
    const layout = template.asLayout();
    return {
      handle: layout.compile(),
      symbolTable: layout.symbolTable,
    };
  }

  getCapabilities(): ComponentCapabilities {
    return CAPABILITIES;
  }

  create(): null {
    return null;
  }

  getSelf() {
    return NULL_REFERENCE;
  }

  getTag() {
    return CONSTANT_TAG;
  }

  getDestructor() {
    return null;
  }
}

const MANAGER = new TemplateOnlyComponentManager();

export class TemplateOnlyComponentDefinition
  implements ComponentDefinition<OwnedTemplate, TemplateOnlyComponentManager> {
  manager = MANAGER;
  constructor(public state: OwnedTemplate) {}
}
