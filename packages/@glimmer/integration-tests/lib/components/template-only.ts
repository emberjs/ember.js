import {
  WithStaticLayout,
  RuntimeResolver,
  CompilableProgram,
  ComponentCapabilities,
} from '@glimmer/interfaces';
import { TestComponentDefinitionState } from './test-component';
import { unwrapTemplate } from '@glimmer/util';
import { Reference, NULL_REFERENCE } from '@glimmer/reference';

export class TemplateOnlyComponentManager
  implements WithStaticLayout<null, TestComponentDefinitionState, RuntimeResolver> {
  getCapabilities(state: TestComponentDefinitionState): ComponentCapabilities {
    return state.capabilities;
  }

  getDebugName(state: TestComponentDefinitionState) {
    return state.name;
  }

  getStaticLayout(
    state: TestComponentDefinitionState,
    resolver: RuntimeResolver
  ): CompilableProgram {
    return unwrapTemplate(resolver.compilable(state.locator)).asLayout();
  }

  getSelf(): Reference {
    return NULL_REFERENCE;
  }

  didRenderLayout() {}

  getDestroyable(): null {
    return null;
  }
}
