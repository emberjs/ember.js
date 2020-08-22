import { dasherize } from '@ember/string';
import { CapturedArguments, VMArguments } from '@glimmer/interfaces';
import { HelperRootReference } from '@glimmer/reference';

function normalizeClass({ positional }: CapturedArguments) {
  let classNameParts = (positional[0].value() as string).split('.');
  let className = classNameParts[classNameParts.length - 1];
  let value = positional[1].value();

  if (value === true) {
    return dasherize(className);
  } else if (!value && value !== 0) {
    return '';
  } else {
    return String(value);
  }
}

export default function(args: VMArguments) {
  return new HelperRootReference(normalizeClass, args.capture());
}
