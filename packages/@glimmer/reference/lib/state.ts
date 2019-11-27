import { RootReference, TemplateReferenceEnvironment } from './template';
import { createUpdatableTag, dirty } from '@glimmer/validator';
import { Dict } from '@glimmer/interfaces';

/**
 * UpdatableRootReferences aren't directly related to templates, but they are
 * currently used in tests and the `State` helper used for embedding.
 */
export class UpdatableRootReference<T = unknown> extends RootReference<T> {
  public tag = createUpdatableTag();

  constructor(inner: T, env: TemplateReferenceEnvironment = DEFAULT_TEMPLATE_REF_ENV) {
    super(inner, env);
  }

  update(value: T) {
    let { inner } = this;

    if (value !== inner) {
      dirty(this.tag);
      this.inner = value;
    }
  }

  forceUpdate(value: T) {
    dirty(this.tag);
    this.inner = value;
  }

  dirty() {
    dirty(this.tag);
  }
}

const DEFAULT_TEMPLATE_REF_ENV = {
  getPath(obj: unknown, key: string) {
    return (obj as Dict)[key];
  },

  setPath(obj: unknown, key: string, value: unknown) {
    return (obj as Dict)[key] = value;
  },

  getDebugContext() {
    return '';
  }
}

export function State<T>(data: T): UpdatableRootReference<T> {
  return new UpdatableRootReference(data, DEFAULT_TEMPLATE_REF_ENV);
}

const STABLE_STATE = new WeakMap();

export function StableState<T extends object>(data: T): UpdatableRootReference<T> {
  if (STABLE_STATE.has(data)) {
    return STABLE_STATE.get(data);
  } else {
    let ref = new UpdatableRootReference(data, DEFAULT_TEMPLATE_REF_ENV);
    STABLE_STATE.set(data, ref);
    return ref;
  }
}
