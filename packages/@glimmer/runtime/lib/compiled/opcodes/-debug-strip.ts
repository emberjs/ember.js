import {
  CheckBlockSymbolTable,
  CheckBoolean,
  Checker,
  CheckFunction,
  CheckHandle,
  CheckInstanceof,
  CheckInterface,
  CheckNumber,
  CheckProgramSymbolTable,
  Checkunknown,
  wrap,
} from '@glimmer/debug';
import {
  CapturedArguments,
  CompilableBlock,
  ComponentDefinition,
  ComponentManager,
  ElementOperations,
  Invocation,
  JitOrAotBlock,
  Scope,
} from '@glimmer/interfaces';
import { Reference, Tag, TagWrapper, VersionedPathReference } from '@glimmer/reference';
import { ScopeImpl } from '../../environment';
import CurryComponentReference from '../../references/curry-component';
import {
  CapturedNamedArgumentsImpl,
  CapturedPositionalArgumentsImpl,
  VMArgumentsImpl,
} from '../../vm/arguments';
import { ComponentInstance, COMPONENT_INSTANCE } from './component';

export const CheckTag: Checker<Tag> = CheckInstanceof(TagWrapper);

export const CheckPathReference: Checker<VersionedPathReference> = CheckInterface({
  tag: CheckTag,
  value: CheckFunction,
  get: CheckFunction,
});

export const CheckReference: Checker<Reference> = CheckInterface({
  tag: CheckTag,
  value: CheckFunction,
});

export const CheckArguments: Checker<VMArgumentsImpl> = wrap(() =>
  CheckInstanceof(VMArgumentsImpl)
);
export const CheckCapturedArguments: Checker<CapturedArguments> = CheckInterface({
  tag: CheckTag,
  length: CheckNumber,
  positional: CheckInstanceof(CapturedPositionalArgumentsImpl),
  named: CheckInstanceof(CapturedNamedArgumentsImpl),
});

export const CheckCurryComponent = CheckInstanceof(CurryComponentReference);

export const CheckScope: Checker<Scope<JitOrAotBlock>> = wrap(() => CheckInstanceof(ScopeImpl));

export const CheckComponentManager: Checker<ComponentManager<unknown, unknown>> = CheckInterface({
  getCapabilities: CheckFunction,
});

export const CheckComponentInstance: Checker<ComponentInstance> = CheckInterface({
  [COMPONENT_INSTANCE]: CheckBoolean,
  definition: Checkunknown,
  state: Checkunknown,
  handle: Checkunknown,
  table: Checkunknown,
});

export const CheckComponentDefinition: Checker<ComponentDefinition> = CheckInterface({
  state: Checkunknown,
  manager: CheckComponentManager,
});

export const CheckInvocation: Checker<Invocation> = CheckInterface({
  handle: CheckNumber,
  symbolTable: CheckProgramSymbolTable,
});

export const CheckElementOperations: Checker<ElementOperations> = CheckInterface({
  setAttribute: CheckFunction,
});

export const CheckFinishedComponentInstance: Checker<ComponentInstance> = CheckInterface({
  definition: Checkunknown,
  state: Checkunknown,
  handle: CheckHandle,
  table: CheckProgramSymbolTable,
});

export const CheckCompilableBlock: Checker<CompilableBlock> = CheckInterface({
  compile: CheckFunction,
  symbolTable: CheckBlockSymbolTable,
});
