import { PathReference } from '@glimmer/reference';
import { Tag, UpdatableTag, combine, createUpdatableTag, update } from '@glimmer/validator';
import { DynamicScope, VM as PublicVM, VMArguments, Helper } from '@glimmer/interfaces';

class DynamicVarReference implements PathReference<unknown> {
  public tag: Tag;
  private varTag: UpdatableTag;

  constructor(private scope: DynamicScope, private nameRef: PathReference<unknown>) {
    let varTag = (this.varTag = createUpdatableTag());
    this.tag = combine([nameRef.tag, varTag]);
  }

  value(): unknown {
    return this.getVar().value();
  }

  get(key: string): PathReference<unknown> {
    return this.getVar().get(key);
  }

  private getVar(): PathReference<unknown> {
    let name = String(this.nameRef.value());
    let ref = this.scope.get(name);

    update(this.varTag, ref.tag);

    return ref;
  }
}

function getDynamicVar(args: VMArguments, vm: PublicVM): PathReference<unknown> {
  let scope = vm.dynamicScope();
  let nameRef = args.positional.at(0);

  return new DynamicVarReference(scope, nameRef);
}

export default getDynamicVar as Helper;
