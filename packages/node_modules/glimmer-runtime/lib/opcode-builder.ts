import {
  ComponentDefinition
} from './component/interfaces';

import {
  DynamicComponentFactory
} from './compiled/opcodes/component';

import {
  Args,
  Templates
} from './syntax/core';

import {
  Opaque,
  InternedString
} from 'glimmer-util';

export interface StaticComponentOptions {
  definition: ComponentDefinition<Opaque>;
  args: Args;
  shadow: InternedString[];
  templates: Templates;
}

export interface DynamicComponentOptions {
  definition: DynamicComponentFactory<Opaque>;
  args: Args;
  shadow: InternedString[];
  templates: Templates;
}

interface OpcodeBuilder {
  component: {
    static(options: StaticComponentOptions);
    dynamic(options: DynamicComponentOptions);
  };
}

export default OpcodeBuilder;
