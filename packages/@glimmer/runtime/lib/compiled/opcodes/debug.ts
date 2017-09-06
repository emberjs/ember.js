
import { Checker, CheckInstanceof, CheckFunction, CheckInterface, CheckOpaque, CheckBlockSymbolTable } from "@glimmer/util";
import { Tag, TagWrapper, VersionedPathReference, Reference } from "@glimmer/reference";
import { Arguments } from '../../vm/arguments';
import { ComponentState } from './component';
import { ComponentManager } from '../../internal-interfaces';
import { BlockSymbolTable } from "@glimmer/interfaces";
import { ICompilableTemplate } from "@glimmer/opcode-compiler";

export const CheckTag: Checker<Tag> = CheckInstanceof(TagWrapper);

export const CheckPathReference: Checker<VersionedPathReference> =
  CheckInterface({ tag: CheckTag, value: CheckFunction, get: CheckFunction });

export const CheckReference: Checker<Reference> =
  CheckInterface({ tag: CheckTag, value: CheckFunction });

export const CheckArguments = CheckInstanceof(Arguments);

export const CheckComponentManager: Checker<ComponentManager> =
  CheckInterface({ getCapabilities: CheckFunction });

export const CheckComponentState: Checker<ComponentState> =
  CheckInterface({ definition: CheckOpaque, manager: CheckComponentManager, component: CheckOpaque });

export const CheckCompilableBlock: Checker<ICompilableTemplate<BlockSymbolTable>> =
  CheckInterface({ compile: CheckFunction, symbolTable: CheckBlockSymbolTable });
