
import { Checker, CheckInstanceof, CheckFunction, CheckInterface, CheckOpaque, CheckBlockSymbolTable } from "@glimmer/util";
import { Tag, TagWrapper, VersionedPathReference, Reference } from "@glimmer/reference";
import { Arguments } from '../../vm/arguments';
import { Opaque, BlockSymbolTable } from "@glimmer/interfaces";
import { ICompilableTemplate } from "@glimmer/opcode-compiler";

export const CheckTag: Checker<Tag> = CheckInstanceof(TagWrapper);

export const CheckPathReference: Checker<VersionedPathReference> =
  CheckInterface({ tag: CheckTag, value: CheckFunction, get: CheckFunction });

export const CheckReference: Checker<Reference> =
  CheckInterface({ tag: CheckTag, value: CheckFunction });

export const CheckArguments = CheckInstanceof(Arguments);

export const CheckComponentState: Checker<{ definition: Opaque, manager: Opaque, component: Opaque }> =
  CheckInterface({ definition: CheckOpaque, manager: CheckOpaque, component: CheckOpaque });

export const CheckCompilableBlock: Checker<ICompilableTemplate<BlockSymbolTable>> =
  CheckInterface({ compile: CheckFunction, symbolTable: CheckBlockSymbolTable });