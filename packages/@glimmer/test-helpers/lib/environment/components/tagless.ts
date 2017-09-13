import { WrappedBuilder } from '@glimmer/opcode-compiler';
import { Invocation } from '@glimmer/runtime';
import { assign, Option } from '@glimmer/util';

import { createTemplate } from '../shared';
import { BasicComponentManager } from './basic';
import LazyRuntimeResolver from '../modes/lazy/runtime-resolver';

import { GenericComponentDefinition, GenericComponentDefinitionState } from '../components';

export class StaticTaglessComponentManager extends BasicComponentManager {
  getLayout(state: GenericComponentDefinitionState, resolver: LazyRuntimeResolver): Invocation {
    let { name, capabilities } = state;

    let handle = resolver.lookup('template-source', name)!;

    return resolver.compileTemplate(handle, name, (source, options) => {
      let template = createTemplate(source, {});
      let compileOptions = assign({}, options, { asPartial: false, referrer: null });
      let builder = new WrappedBuilder(compileOptions, template, capabilities);

      return {
        handle: builder.compile(),
        symbolTable: builder.symbolTable
      };
    });
  }
}

export const STATIC_TAGLESS_COMPONENT_MANAGER = new StaticTaglessComponentManager();

export interface StaticTaglessComponentDefinitionState {
  name: string;
  layout: Option<number>;
  ComponentClass: any;
}

const CAPABILITIES = {
  staticDefinitions: false,
  dynamicLayout: false,
  dynamicTag: false,
  prepareArgs: false,
  createArgs: false,
  attributeHook: false,
  elementHook: false
};

export class StaticTaglessComponentDefinition extends GenericComponentDefinition<StaticTaglessComponentDefinitionState & GenericComponentDefinitionState, StaticTaglessComponentManager> {
  constructor(manager: StaticTaglessComponentManager, state: StaticTaglessComponentDefinitionState) {
    super(manager, { capabilities: CAPABILITIES, ...state });
  }
}
