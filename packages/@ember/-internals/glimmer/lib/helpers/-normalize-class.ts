import { dasherize } from '@ember/string';
import { CapturedArguments, VM, VMArguments } from '@glimmer/interfaces';
import { HelperRootReference } from '@glimmer/reference';

function normalizeClass({ positional }: CapturedArguments) {
  let classNameParts = (positional.at(0).value() as string).split('.');
  let className = classNameParts[classNameParts.length - 1];
  let value = positional.at(1).value();

  if (value === true) {
    return dasherize(className);
  } else if (!value && value !== 0) {
    return '';
  } else {
    return String(value);
  }
}

export default function(args: VMArguments, vm: VM) {
  return new HelperRootReference(normalizeClass, args.capture(), vm.env);
}
