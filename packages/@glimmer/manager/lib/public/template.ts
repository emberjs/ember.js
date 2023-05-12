import type { TemplateFactory } from "@glimmer/interfaces";
import { debugToString } from '@glimmer/util';

const TEMPLATES: WeakMap<object, TemplateFactory> = new WeakMap();

const getPrototypeOf = Object.getPrototypeOf;

export function setComponentTemplate(factory: TemplateFactory, obj: object) {
  if (
    import.meta.env.DEV &&
    !(obj !== null && (typeof obj === 'object' || typeof obj === 'function'))
  ) {
    throw new Error(`Cannot call \`setComponentTemplate\` on \`${debugToString!(obj)}\``);
  }

  if (import.meta.env.DEV && TEMPLATES.has(obj)) {
    throw new Error(
      `Cannot call \`setComponentTemplate\` multiple times on the same class (\`${debugToString!(
        obj
      )}\`)`
    );
  }

  TEMPLATES.set(obj, factory);

  return obj;
}

export function getComponentTemplate(obj: object): TemplateFactory | undefined {
  let pointer = obj;

  while (pointer !== null) {
    let template = TEMPLATES.get(pointer);

    if (template !== undefined) {
      return template;
    }

    pointer = getPrototypeOf(pointer);
  }

  return undefined;
}
