import { Helper, DynamicScope } from '../environment';
import { PublicVM } from '../vm/append';
import { SymbolTable } from 'glimmer-interfaces';
import { EvaluatedArgs } from '../compiled/expressions/args';
import { CONSTANT_TAG, RevisionTag, PathReference, UpdatableTag, combine } from 'glimmer-reference';
import { Opaque } from 'glimmer-util';

class DynamicVarReference implements PathReference<Opaque> {
  public tag: RevisionTag;
  private varTag: UpdatableTag;

  constructor(private scope: DynamicScope, private nameRef: PathReference<Opaque>) {
    let varTag = this.varTag = new UpdatableTag(CONSTANT_TAG);
    this.tag = combine([nameRef.tag, varTag]);
  }

  value(): Opaque {
    return this.getVar().value();
  }

  get(key: string): PathReference<Opaque> {
    return this.getVar().get(key);
  }

  private getVar(): PathReference<Opaque> {
    let name = String(this.nameRef.value());
    let ref = this.scope.get(name);

    this.varTag.update(ref.tag);

    return ref;
  }
}

function getDynamicVar(vm: PublicVM, args: EvaluatedArgs, _symbolTable: SymbolTable): PathReference<Opaque> {
  let scope = vm.dynamicScope();
  let nameRef = args.positional.at(0);

  return new DynamicVarReference(scope, nameRef);
}

export default (getDynamicVar as Helper);
