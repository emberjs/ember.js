import { DEBUG } from '@glimmer/env';
import type { TemplateFactory } from '@glimmer/interfaces';
import { debugToString } from '@glimmer/debug-util';

const TEMPLATES: WeakMap<object, TemplateFactory> = new WeakMap();

// GXT template functions keyed by component class/object
export type GXTTemplateFn = Function;
const GXT_TEMPLATES: WeakMap<object, GXTTemplateFn> = new WeakMap();

export function setGXTTemplate(obj: object, fn: GXTTemplateFn): void {
  GXT_TEMPLATES.set(obj, fn);
}

export function getGXTTemplate(obj: object): GXTTemplateFn | undefined {
  let pointer: object | null = obj;
  while (pointer !== null) {
    const t = GXT_TEMPLATES.get(pointer);
    if (t !== undefined) return t;
    pointer = getPrototypeOf(pointer);
  }
  return undefined;
}

const getPrototypeOf = Reflect.getPrototypeOf;

export function setComponentTemplate(factory: TemplateFactory, obj: object) {
  if (DEBUG && !(obj !== null && (typeof obj === 'object' || typeof obj === 'function'))) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- @fixme
    throw new Error(`Cannot call \`setComponentTemplate\` on \`${debugToString!(obj)}\``);
  }

  if (DEBUG && TEMPLATES.has(obj)) {
    throw new Error(
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- @fixme
      `Cannot call \`setComponentTemplate\` multiple times on the same class (\`${debugToString!(
        obj
      )}\`)`
    );
  }

  TEMPLATES.set(obj, factory);

  return obj;
}

export function getComponentTemplate(obj: object): TemplateFactory | undefined {
  let pointer: object | null = obj;

  while (pointer !== null) {
    let template = TEMPLATES.get(pointer);

    if (template !== undefined) {
      return template;
    }

    pointer = getPrototypeOf(pointer);
  }

  return undefined;
}
