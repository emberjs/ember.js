import { PathReference } from '@glimmer/reference';
import { DynamicScope, VM as PublicVM, VMArguments, Helper } from '@glimmer/interfaces';

class DynamicVarReference implements PathReference<unknown> {
  constructor(private scope: DynamicScope, private nameRef: PathReference<unknown>) {}

  value(): unknown {
    return this.getVar().value();
  }

  isConst() {
    return false;
  }

  get(key: string): PathReference<unknown> {
    return this.getVar().get(key);
  }

  private getVar(): PathReference<unknown> {
    let name = String(this.nameRef.value());
    return this.scope.get(name);
  }
}

function getDynamicVar(args: VMArguments, vm: PublicVM): PathReference<unknown> {
  let scope = vm.dynamicScope();
  let nameRef = args.positional.at(0);

  return new DynamicVarReference(scope, nameRef);
}

export default getDynamicVar as Helper;
