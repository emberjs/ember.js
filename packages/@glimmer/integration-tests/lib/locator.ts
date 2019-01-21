import { ModuleLocator } from '@glimmer/interfaces';
import { WrappedLocator } from './components/test-component';
import { PartialTemplateLocator } from '@glimmer/bundle-compiler';

export function locatorFor(moduleLocator: ModuleLocator): PartialTemplateLocator<WrappedLocator> {
  let { module, name } = moduleLocator;

  return {
    module,
    name,
    kind: 'template',
    meta: { locator: moduleLocator },
  };
}
