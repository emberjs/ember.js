import { createComputeRef, valueForRef, Reference } from '@glimmer/reference';
import { VM as PublicVM, VMArguments, Helper } from '@glimmer/interfaces';

function getDynamicVar(args: VMArguments, vm: PublicVM): Reference {
  let scope = vm.dynamicScope();
  let nameRef = args.positional.at(0);

  return createComputeRef(() => {
    let name = String(valueForRef(nameRef));
    return valueForRef(scope.get(name));
  });
}

export default getDynamicVar as Helper;
