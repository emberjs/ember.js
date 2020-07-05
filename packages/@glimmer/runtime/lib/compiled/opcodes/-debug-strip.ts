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
  CheckOr,
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
  Option,
  JitScopeBlock,
} from '@glimmer/interfaces';
import { PathReference, Reference } from '@glimmer/reference';
import { Tag, COMPUTE } from '@glimmer/validator';
import { ScopeImpl } from '../../environment';
import CurryComponentReference from '../../references/curry-component';
import {
  CapturedNamedArgumentsImpl,
  CapturedPositionalArgumentsImpl,
  VMArgumentsImpl,
} from '../../vm/arguments';
import { ComponentInstance, ComponentElementOperations } from './component';
import { UNDEFINED_REFERENCE } from '../../references';

export const CheckTag: Checker<Tag> = CheckInterface({
  [COMPUTE]: CheckFunction,
});

export const CheckOperations: Checker<Option<ComponentElementOperations>> = wrap(() =>
  CheckOption(CheckInstanceof(ComponentElementOperations))
);

export const CheckPathReference: Checker<PathReference> = CheckInterface({
  value: CheckFunction,
  get: CheckFunction,
});

export const CheckReference: Checker<Reference> = CheckInterface({
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

export class UndefinedReferenceChecker implements Checker<Reference> {
  type!: Reference;

  validate(value: unknown): value is Reference {
    return value === UNDEFINED_REFERENCE;
  }

  expected(): string {
    return `UNDEFINED_REFERENCE`;
  }
}

export const CheckUndefinedReference = new UndefinedReferenceChecker();

export const CheckCapturedArguments: Checker<CapturedArguments> = CheckInterface({
  length: CheckNumber,
  positional: wrap(() => CheckInstanceof(CapturedPositionalArgumentsImpl)),
  named: wrap(() => CheckInstanceof(CapturedNamedArgumentsImpl)),
  value: new CheckCapturedArgumentsValue(),
});

export const CheckCurryComponent = wrap(() => CheckInstanceof(CurryComponentReference));

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

export const CheckScopeBlock: Checker<JitScopeBlock> = CheckInterface({
  0: CheckOr(CheckHandle, CheckCompilableBlock),
  1: CheckScope,
  2: CheckBlockSymbolTable,
});
