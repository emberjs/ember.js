import { Helper, helper } from './helpers';

export default function registerHelper(name, funcOrClassBody, owner) {
  let type = typeof funcOrClassBody;

  if (type === 'function') {
    owner.register(`helper:${name}`, helper(funcOrClassBody));
  } else if (type === 'object' && type !== null) {
    owner.register(`helper:${name}`, Helper.extend(funcOrClassBody));
  } else {
    throw new Error(`Cannot register ${funcOrClassBody} as a helper`);
  }
}
