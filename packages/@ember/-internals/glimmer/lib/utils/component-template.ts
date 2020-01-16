import { toString } from '@ember/-internals/utils';
import { assert } from '@ember/debug';
import { Option } from '@glimmer/interfaces';
import { Factory as TemplateFactory } from '../template';

const TEMPLATES: WeakMap<object, TemplateFactory> = new WeakMap();

const getPrototypeOf = Object.getPrototypeOf;

export function setComponentTemplate(factory: TemplateFactory, obj: object) {
  assert(
    `Cannot call \`setComponentTemplate\` on \`${toString(obj)}\``,
    obj !== null && (typeof obj === 'object' || typeof obj === 'function')
  );

  assert(
    `Cannot call \`setComponentTemplate\` multiple times on the same class (\`${obj}\`)`,
    !TEMPLATES.has(obj)
  );

  TEMPLATES.set(obj, factory);

  return obj;
}

export function getComponentTemplate(obj: object): Option<TemplateFactory> {
  let pointer = obj;
  while (pointer !== undefined && pointer !== null) {
    let template = TEMPLATES.get(pointer);

    if (template !== undefined) {
      return template;
    }

    pointer = getPrototypeOf(pointer);
  }

  return null;
}
