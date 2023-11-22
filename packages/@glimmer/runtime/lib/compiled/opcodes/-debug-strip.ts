import type { Checker } from '@glimmer/debug';
import type {
  CapabilityMask,
  CapturedArguments,
  CompilableBlock,
  CompilableProgram,
  ComponentDefinition,
  ComponentInstance,
  ElementOperations,
  Helper,
  InternalComponentManager,
  Invocation,
  Nullable,
  Scope,
  ScopeBlock,
} from '@glimmer/interfaces';
import type { OpaqueIterator, Reference } from '@glimmer/reference';
import type { Tag } from '@glimmer/validator';
import {
  CheckArray,
  CheckBlockSymbolTable,
  CheckDict,
  CheckFunction,
  CheckHandle,
  CheckInstanceof,
  CheckInterface,
  CheckNumber,
  CheckObject,
  CheckOption,
  CheckOr,
  CheckProgramSymbolTable,
  CheckString,
  CheckUnknown,
  wrap,
} from '@glimmer/debug';
import { REFERENCE, UNDEFINED_REFERENCE } from '@glimmer/reference';
import { COMPUTE } from '@glimmer/validator';

import { PartialScopeImpl } from '../../scope';
import { VMArgumentsImpl } from '../../vm/arguments';
import { ComponentElementOperations } from './component';

export const CheckTag: Checker<Tag> = CheckInterface({
  [COMPUTE]: CheckFunction,
});

export const CheckOperations: Checker<Nullable<ComponentElementOperations>> = wrap(() =>
  CheckOption(CheckInstanceof(ComponentElementOperations))
);

class ReferenceChecker {
  declare type: Reference;

  validate(value: unknown): value is Reference {
    return typeof value === 'object' && value !== null && REFERENCE in value;
  }

  expected(): string {
    return `Reference`;
  }
}

export const CheckReference: Checker<Reference> = new ReferenceChecker();

export const CheckIterator: Checker<OpaqueIterator> = CheckInterface({
  next: CheckFunction,
  isEmpty: CheckFunction,
});

export const CheckArguments: Checker<VMArgumentsImpl> = wrap(() =>
  CheckInstanceof(VMArgumentsImpl)
);

export const CheckHelper: Checker<Helper> = CheckFunction as Checker<Helper>;

export class UndefinedReferenceChecker implements Checker<Reference> {
  declare type: Reference;

  validate(value: unknown): value is Reference {
    return value === UNDEFINED_REFERENCE;
  }

  expected(): string {
    return `undefined`;
  }
}

export const CheckUndefinedReference = new UndefinedReferenceChecker();

export const CheckCapturedArguments: Checker<CapturedArguments> = CheckInterface({
  positional: wrap(() => CheckArray(CheckReference)),
  named: wrap(() => CheckDict(CheckReference)),
});

export const CheckScope: Checker<Scope> = wrap(() => CheckInstanceof(PartialScopeImpl));

export const CheckComponentManager: Checker<InternalComponentManager<unknown>> = CheckInterface({
  getCapabilities: CheckFunction,
});

export const CheckCapabilities: Checker<CapabilityMask> = CheckNumber as Checker<CapabilityMask>;

export const CheckComponentInstance: Checker<ComponentInstance> = CheckInterface({
  definition: CheckUnknown,
  state: CheckUnknown,
  handle: CheckUnknown,
  table: CheckUnknown,
});

export const CheckCurriedComponentDefinition = CheckOr(CheckObject, CheckFunction);

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

export const CheckCompilableProgram: Checker<CompilableProgram> = CheckInterface({
  compile: CheckFunction,
  symbolTable: CheckProgramSymbolTable,
});

export const CheckScopeBlock: Checker<ScopeBlock> = CheckInterface({
  0: CheckCompilableBlock,
  1: CheckScope,
  2: CheckBlockSymbolTable,
});

export const CheckComponentDefinition: Checker<ComponentDefinition> = CheckInterface({
  resolvedName: CheckOption(CheckString),
  handle: CheckNumber,
  state: CheckOr(CheckObject, CheckFunction),
  manager: CheckComponentManager,
  capabilities: CheckCapabilities,
  compilable: CheckCompilableProgram,
});
