import {
  CheckBlockSymbolTable,
  Checker,
  CheckFunction,
  CheckHandle,
  CheckInstanceof,
  CheckInterface,
  CheckNumber,
  CheckProgramSymbolTable,
  CheckUnknown,
  wrap,
  CheckOption,
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
  Helper,
  CapturedArgumentsValue,
} from '@glimmer/interfaces';
import { Reference, Tag, TagWrapper, VersionedPathReference } from '@glimmer/reference';
import { ScopeImpl } from '../../environment';
import CurryComponentReference from '../../references/curry-component';
import {
  CapturedNamedArgumentsImpl,
  CapturedPositionalArgumentsImpl,
  VMArgumentsImpl,
} from '../../vm/arguments';
import { ComponentInstance, ComponentElementOperations } from './component';

export const CheckTag: Checker<Tag> = CheckInstanceof(TagWrapper);

export const CheckOperations = CheckOption(CheckInstanceof(ComponentElementOperations));

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

export const CheckHelper: Checker<Helper> = CheckFunction as Checker<Helper>;

class CheckCapturedArgumentsValue implements Checker<() => CapturedArgumentsValue> {
  type!: () => CapturedArgumentsValue;

  validate(value: unknown): value is () => CapturedArgumentsValue {
    return typeof value === 'function';
  }

  expected(): string {
    return `SafeString`;
  }
}

export const CheckCapturedArguments: Checker<CapturedArguments> = CheckInterface({
  tag: CheckTag,
  length: CheckNumber,
  positional: CheckInstanceof(CapturedPositionalArgumentsImpl),
  named: CheckInstanceof(CapturedNamedArgumentsImpl),
  value: new CheckCapturedArgumentsValue(),
});

export const CheckCurryComponent = CheckInstanceof(CurryComponentReference);

export const CheckScope: Checker<Scope<JitOrAotBlock>> = wrap(() => CheckInstanceof(ScopeImpl));

export const CheckComponentManager: Checker<ComponentManager<unknown>> = CheckInterface({
  getCapabilities: CheckFunction,
});

export const CheckComponentInstance: Checker<ComponentInstance> = CheckInterface({
  definition: CheckUnknown,
  state: CheckUnknown,
  handle: CheckUnknown,
  table: CheckUnknown,
});

export const CheckComponentDefinition: Checker<ComponentDefinition> = CheckInterface({
  state: CheckUnknown,
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
  definition: CheckUnknown,
  state: CheckUnknown,
  handle: CheckHandle,
  table: CheckProgramSymbolTable,
});

export const CheckCompilableBlock: Checker<CompilableBlock> = CheckInterface({
  compile: CheckFunction,
  symbolTable: CheckBlockSymbolTable,
});
