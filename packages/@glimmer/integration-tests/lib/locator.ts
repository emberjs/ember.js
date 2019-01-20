import { ModuleLocator, TemplateMeta, TemplateLocator } from '@glimmer/interfaces';
import { WrappedLocator } from './components/test-component';
import { templateMeta } from '@glimmer/util';

export function locatorFor(
  moduleLocator: ModuleLocator
): TemplateMeta<TemplateLocator<WrappedLocator>> {
  let { module, name } = moduleLocator;

  let l: TemplateLocator<WrappedLocator> = {
    module,
    name,
    kind: 'template',
    meta: templateMeta({ locator: moduleLocator }),
  };

  return templateMeta(l);
}
