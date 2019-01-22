import { ModuleLocator } from '@glimmer/interfaces';

export function locatorFor(moduleLocator: ModuleLocator): ModuleLocator {
  let { module, name } = moduleLocator;

  return {
    module,
    name,
  };
}
