import { getManager, ManagerFactory, setManager } from './managers';

export function setModifierManager(factory: ManagerFactory<unknown>, obj: any) {
  return setManager({ factory, internal: false, type: 'modifier' }, obj);
}

export function getModifierManager<T>(obj: any): undefined | ManagerFactory<T> {
  let wrapper = getManager<T>(obj);

  if (wrapper && !wrapper.internal && wrapper.type === 'modifier') {
    return wrapper.factory;
  } else {
    return undefined;
  }
}
