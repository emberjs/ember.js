import {
  ComponentCapabilities,
  AnnotatedModuleLocator,
  CompilableProgram,
} from '@glimmer/interfaces';
import { Option } from '@glimmer/util';

import { createTemplate } from '../shared';
import { BasicComponentManager } from './basic';
import LazyRuntimeResolver from '../modes/lazy/runtime-resolver';
import { TestComponentDefinitionState } from '../components';

export const STATIC_TAGLESS_CAPABILITIES = {
  dynamicLayout: false,
  dynamicTag: false,
  prepareArgs: false,
  createArgs: false,
  attributeHook: false,
  elementHook: false,
  dynamicScope: false,
  updateHook: false,
  createCaller: false,
  createInstance: false,
  wrapped: false,
};

export class StaticTaglessComponentManager extends BasicComponentManager {
  getCapabilities(state: TestComponentDefinitionState): ComponentCapabilities {
    return state.capabilities;
  }

  getJitStaticLayout(
    state: TestComponentDefinitionState,
    resolver: LazyRuntimeResolver
  ): CompilableProgram {
    let { name } = state;

    let handle = resolver.lookup('template-source', name)!;

    return resolver.registry
      .customCompilableTemplate(handle, name, source =>
        createTemplate<AnnotatedModuleLocator>(source).create()
      )
      .asLayout();
  }
}

export interface StaticTaglessComponentDefinitionState {
  name: string;
  layout: Option<number>;
  ComponentClass: any;
}
