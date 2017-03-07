import { Helper, DynamicScope } from '../environment';
import { PublicVM } from '../vm/append';
import { IArguments } from '../vm/arguments';
import { CONSTANT_TAG, Tag, PathReference, UpdatableTag, TagWrapper, combine } from '@glimmer/reference';
import { Opaque } from '@glimmer/util';

class DynamicVarReference implements PathReference<Opaque> {
  public tag: Tag;
  private varTag: TagWrapper<UpdatableTag>;

  constructor(private scope: DynamicScope, private nameRef: PathReference<Opaque>) {
    let varTag = this.varTag = UpdatableTag.create(CONSTANT_TAG);
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

    this.varTag.inner.update(ref.tag);

    return ref;
  }
}

function getDynamicVar(vm: PublicVM, args: IArguments): PathReference<Opaque> {
  let scope = vm.dynamicScope();
  let nameRef = args.positional.at(0);

  return new DynamicVarReference(scope, nameRef);
}

export default (getDynamicVar as Helper);
