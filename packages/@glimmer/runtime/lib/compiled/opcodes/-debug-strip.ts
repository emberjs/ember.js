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
} from '@glimmer/debug';
import { Tag, TagWrapper, VersionedPathReference, Reference } from '@glimmer/reference';
import {
  Arguments,
  ICapturedArguments,
  CapturedPositionalArguments,
  CapturedNamedArguments,
  ICapturedArgumentsValue,
} from '../../vm/arguments';
import { ComponentInstance } from './component';
import { ComponentManager } from '../../internal-interfaces';
import { Scope } from '../../environment';
import { CompilableBlock, Opaque } from '@glimmer/interfaces';

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

class CheckCapturedArgumentsValue implements Checker<() => ICapturedArgumentsValue> {
  type!: () => ICapturedArgumentsValue;

  validate(value: Opaque): value is () => ICapturedArgumentsValue {
    return typeof value === 'function';
  }

  expected(): string {
    return `SafeString`;
  }
}

export const CheckArguments = wrap(() => CheckInstanceof(Arguments));
export const CheckCapturedArguments: Checker<ICapturedArguments> = CheckInterface({
  tag: CheckTag,
  length: CheckNumber,
  positional: CheckInstanceof(CapturedPositionalArguments),
  named: CheckInstanceof(CapturedNamedArguments),
  value: new CheckCapturedArgumentsValue(),
});

export const CheckScope = wrap(() => CheckInstanceof(Scope));

export const CheckComponentManager: Checker<ComponentManager> = CheckInterface({
  getCapabilities: CheckFunction,
});

export const CheckComponentInstance: Checker<ComponentInstance> = CheckInterface({
  definition: CheckOpaque,
  state: CheckOpaque,
  handle: CheckOpaque,
  table: CheckOpaque,
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
