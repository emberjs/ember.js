
import { Checker, CheckInstanceof, CheckFunction, CheckInterface, CheckOpaque, CheckBlockSymbolTable, CheckProgramSymbolTable, CheckHandle, wrap } from "@glimmer/debug";
import { Tag, TagWrapper, VersionedPathReference, Reference } from "@glimmer/reference";
import { Arguments } from '../../vm/arguments';
import { ComponentInstance } from './component';
import { ComponentManager } from '../../internal-interfaces';
import { Scope } from '../../environment';
import { BlockSymbolTable } from "@glimmer/interfaces";
import { ICompilableTemplate } from "@glimmer/opcode-compiler";

export const CheckTag: Checker<Tag> = CheckInstanceof(TagWrapper);

export const CheckPathReference: Checker<VersionedPathReference> =
  CheckInterface({ tag: CheckTag, value: CheckFunction, get: CheckFunction });

export const CheckReference: Checker<Reference> =
  CheckInterface({ tag: CheckTag, value: CheckFunction });

export const CheckArguments = wrap(() => CheckInstanceof(Arguments));
export const CheckScope = wrap(() => CheckInstanceof(Scope));

export const CheckComponentManager: Checker<ComponentManager> =
  CheckInterface({ getCapabilities: CheckFunction });

export const CheckComponentInstance: Checker<ComponentInstance> =
  CheckInterface({ definition: CheckOpaque, state: CheckOpaque, handle: CheckOpaque, table: CheckOpaque });

export const CheckFinishedComponentInstance: Checker<ComponentInstance> =
  CheckInterface({ definition: CheckOpaque, state: CheckOpaque, handle: CheckHandle, table: CheckProgramSymbolTable });

export const CheckCompilableBlock: Checker<ICompilableTemplate<BlockSymbolTable>> =
  CheckInterface({ compile: CheckFunction, symbolTable: CheckBlockSymbolTable });
