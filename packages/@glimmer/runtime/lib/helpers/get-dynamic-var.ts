import {
  CONSTANT_TAG,
  Tag,
  PathReference,
  UpdatableTag,
  TagWrapper,
  combine,
} from '@glimmer/reference';
import { DynamicScope, VM as PublicVM, VMArguments, Helper } from '@glimmer/interfaces';

class DynamicVarReference implements PathReference<unknown> {
  public tag: Tag;
  private varTag: TagWrapper<UpdatableTag>;

  constructor(private scope: DynamicScope, private nameRef: PathReference<unknown>) {
    let varTag = (this.varTag = UpdatableTag.create(CONSTANT_TAG));
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

    this.varTag.inner.update(ref.tag);

    return ref;
  }
}

function getDynamicVar(args: VMArguments, vm: PublicVM): PathReference<unknown> {
  let scope = vm.dynamicScope();
  let nameRef = args.positional.at(0);

  return new DynamicVarReference(scope, nameRef);
}

export default getDynamicVar as Helper;
