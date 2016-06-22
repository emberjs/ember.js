import { InternalHelperReference } from '../utils/references';

function inputTypeHelper({ positional, named }) {
  let type = positional.at(0).value();
  if (type === 'checkbox') {
    return '-checkbox';
  }
  return '-text-field';
}

export default {
  isInternalHelper: true,
  toReference(args) {
    return new InternalHelperReference(inputTypeHelper, args);
  }
};
