import {
  ComponentDefinition
} from './component/interfaces';

import {
  FunctionExpression
} from './compiled/expressions/function';

import {
  Args,
  Templates,
} from './syntax/core';

import {
  Opaque
} from 'glimmer-util';

export interface StaticComponentOptions {
  definition: ComponentDefinition<Opaque>;
  args: Args;
  shadow: string[];
  templates: Templates;
}

export interface DynamicComponentOptions {
  definitionArgs: Args;
  definition: FunctionExpression<ComponentDefinition<Opaque>>;
  args: Args;
  shadow: string[];
  templates: Templates;
}

interface OpcodeBuilder {
  component: {
    static(options: StaticComponentOptions);
    dynamic(options: DynamicComponentOptions);
  };
}

export default OpcodeBuilder;
