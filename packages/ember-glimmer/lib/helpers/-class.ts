import { Arguments, VM } from '@glimmer/runtime';
import { String as StringUtils } from 'ember-runtime';
import { InternalHelperReference } from '../utils/references';

function classHelper({ positional }: any) {
  let path = positional.at(0);
  let args = positional.length;
  let value = path.value();

  if (value === true) {
    if (args > 1) {
      return StringUtils.dasherize(positional.at(1).value());
    }
    return null;
  }

  if (value === false) {
    if (args > 2) {
      return StringUtils.dasherize(positional.at(2).value());
    }
    return null;
  }

  return value;
}

export default function(_vm: VM, args: Arguments) {
  return new InternalHelperReference(classHelper, args.capture());
}
