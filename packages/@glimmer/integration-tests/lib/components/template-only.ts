import { WithStaticLayout, ComponentCapabilities, Template } from '@glimmer/interfaces';
import { TestComponentDefinitionState } from './test-component';
import { expect } from '@glimmer/util';
import { Reference, NULL_REFERENCE } from '@glimmer/reference';

export class TemplateOnlyComponentManager
  implements WithStaticLayout<null, TestComponentDefinitionState> {
  getCapabilities(state: TestComponentDefinitionState): ComponentCapabilities {
    return state.capabilities;
  }

  getDebugName(state: TestComponentDefinitionState) {
    return state.name;
  }

  getStaticLayout({ template }: TestComponentDefinitionState): Template {
    return expect(template, 'expected component layout');
  }

  getSelf(): Reference {
    return NULL_REFERENCE;
  }

  didRenderLayout() {}

  getDestroyable(): null {
    return null;
  }
}
