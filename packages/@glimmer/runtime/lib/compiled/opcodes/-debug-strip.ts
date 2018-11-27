import {
  Checker,
  CheckInstanceof,
  CheckFunction,
  CheckInterface,
  CheckOpaque,
  CheckBlockSymbolTable,
  CheckProgramSymbolTable,
  CheckHandle,
  wrap,
  CheckNumber,
  CheckBoolean,
} from '@glimmer/debug';
import { Tag, TagWrapper, VersionedPathReference, Reference } from '@glimmer/reference';
import {
  Arguments,
  ICapturedArguments,
  CapturedPositionalArguments,
  CapturedNamedArguments,
} from '../../vm/arguments';
import { ComponentInstance, COMPONENT_INSTANCE } from './component';
import { ComponentManager } from '../../internal-interfaces';
import { ScopeImpl } from '../../environment';
import {
  CompilableBlock,
  ComponentDefinition,
  ComponentDefinitionState,
} from '@glimmer/interfaces';
import CurryComponentReference from '../../references/curry-component';
import { ElementOperations } from '../../vm/element-builder';
import { InternalComponentManager, Invocation } from '../../component/interfaces';

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

export const CheckArguments = wrap(() => CheckInstanceof(Arguments));
export const CheckCapturedArguments: Checker<ICapturedArguments> = CheckInterface({
  tag: CheckTag,
  length: CheckNumber,
  positional: CheckInstanceof(CapturedPositionalArguments),
  named: CheckInstanceof(CapturedNamedArguments),
});

export const CheckCurryComponent = CheckInstanceof(CurryComponentReference);

export const CheckScope = wrap(() => CheckInstanceof(ScopeImpl));

export const CheckComponentManager: Checker<ComponentManager> = CheckInterface({
  getCapabilities: CheckFunction,
});

export const CheckComponentInstance: Checker<ComponentInstance> = CheckInterface({
  [COMPONENT_INSTANCE]: CheckBoolean,
  definition: CheckOpaque,
  state: CheckOpaque,
  handle: CheckOpaque,
  table: CheckOpaque,
});

export const CheckComponentDefinition: Checker<
  ComponentDefinition<InternalComponentManager, ComponentDefinitionState>
> = CheckInterface({
  state: CheckOpaque,
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
  definition: CheckOpaque,
  state: CheckOpaque,
  handle: CheckHandle,
  table: CheckProgramSymbolTable,
});

export const CheckCompilableBlock: Checker<CompilableBlock> = CheckInterface({
  compile: CheckFunction,
  symbolTable: CheckBlockSymbolTable,
});
