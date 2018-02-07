import { ComponentCapabilities } from "@glimmer/interfaces";
import { Invocation } from '@glimmer/runtime';
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
  elementHook: false
};

export class StaticTaglessComponentManager extends BasicComponentManager {
  getCapabilities(state: TestComponentDefinitionState): ComponentCapabilities {
    return state.capabilities;
  }

  getLayout(state: TestComponentDefinitionState, resolver: LazyRuntimeResolver): Invocation {
    let { name } = state;

    let handle = resolver.lookup('template-source', name)!;

    return resolver.compileTemplate(handle, name, (source, options) => {
      let template = createTemplate(source, {});
      let layout = template.create(options).asLayout();

      return {
        handle: layout.compile(),
        symbolTable: layout.symbolTable
      };
    });
  }
}

export interface StaticTaglessComponentDefinitionState {
  name: string;
  layout: Option<number>;
  ComponentClass: any;
}
