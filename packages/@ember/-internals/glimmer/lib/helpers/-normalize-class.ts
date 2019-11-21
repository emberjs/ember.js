import { dasherize } from '@ember/string';
import { VMArguments } from '@glimmer/interfaces';
import { InternalHelperReference } from '../utils/references';

function normalizeClass({ positional }: any) {
  let classNameParts = positional
    .at(0)
    .value()
    .split('.');
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

export default function(args: VMArguments) {
  return new InternalHelperReference(normalizeClass, args.capture());
}
