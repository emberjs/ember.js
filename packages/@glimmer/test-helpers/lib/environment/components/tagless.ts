import { ComponentCapabilities } from "@glimmer/interfaces";
import { WrappedBuilder } from '@glimmer/opcode-compiler';
import { Invocation } from '@glimmer/runtime';
import { assign, Option } from '@glimmer/util';

import { createTemplate } from '../shared';
import { BasicComponentManager } from './basic';
import LazyRuntimeResolver from '../modes/lazy/runtime-resolver';
import { TestComponentDefinitionState } from '../components';

export const STATIC_TAGLESS_CAPABILITIES = {
  staticDefinitions: false,
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
      let compileOptions = assign({}, options, { asPartial: false, referrer: null });
      let builder = new WrappedBuilder(compileOptions, template, STATIC_TAGLESS_CAPABILITIES);

      return {
        handle: builder.compile(),
        symbolTable: builder.symbolTable
      };
    });
  }
}

export interface StaticTaglessComponentDefinitionState {
  name: string;
  layout: Option<number>;
  ComponentClass: any;
}
