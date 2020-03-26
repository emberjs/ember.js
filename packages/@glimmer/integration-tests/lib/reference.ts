import { RootReference, TemplateReferenceEnvironment } from '@glimmer/reference';
import { createUpdatableTag, dirtyTag, UpdatableTag } from '@glimmer/validator';
import { Dict } from '@glimmer/interfaces';

/**
 * UpdatableRootReferences aren't directly related to templates, but they are
 * currently used in tests and the `State` helper used for embedding.
 */
export class UpdatableRootReference<T = unknown> extends RootReference<T> {
  public tag: UpdatableTag = createUpdatableTag();

  constructor(private inner: T, env: TemplateReferenceEnvironment = DEFAULT_TEMPLATE_REF_ENV) {
    super(env);
  }

  value() {
    return this.inner;
  }

  update(value: T) {
    let { inner } = this;

    if (value !== inner) {
      dirtyTag(this.tag);
      this.inner = value;
    }
  }

  forceUpdate(value: T) {
    dirtyTag(this.tag);
    this.inner = value;
  }

  dirty() {
    dirtyTag(this.tag);
  }

  getDebugPath() {
    return 'this';
  }
}

const DEFAULT_TEMPLATE_REF_ENV = {
  toIterator() {
    return null;
  },

  getPath(obj: unknown, key: string) {
    return (obj as Dict)[key];
  },

  setPath(obj: unknown, key: string, value: unknown) {
    return ((obj as Dict)[key] = value);
  },

  getTemplatePathDebugContext() {
    return '';
  },

  setTemplatePathDebugContext() {},
};

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
