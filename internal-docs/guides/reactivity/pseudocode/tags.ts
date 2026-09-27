const TAGS = new WeakMap<object, Record<PropertyKey, MutableTag>>();

export interface Tag {
  get revision(): number;
}

interface Runtime {
  /**
   * Consumes a tag in the current tracking frame, if one is active.
   */
  consume(tag: Tag): void;

  /**
   * Returns the timeline's current revision.
   */
  current(): number;

  /**
   * Advances the revision counter, returning the new revision.
   */
  advance(): number;

  /**
   * Begins a new tracking frame. All `consume` operations that happen after this will be
   * associated with the new frame.
   */
  begin(): void;

  /**
   * Ends the current tracking frame, returning a tag that contains all of the members that were
   * consumed in the duration of the frame. If a previous frame exists, it will become the current
   * frame, and it will consume the returned tag.
   */
  commit(): Tag;
}

export declare const runtime: Runtime;

export class MutableTag implements Tag {
  static init(obj: object, key: PropertyKey): MutableTag {
    let tags = TAGS.get(obj);
    if (!tags) {
      tags = {};
      TAGS.set(obj, tags);
    }

    const tag = new MutableTag();
    tags[key] = tag;
    return tag;
  }

  static get(obj: object, key: PropertyKey): MutableTag {
    const tag = TAGS.get(obj)?.[key];
    assert(tag, `No tag found for object ${obj}@${String(key)}`);
    return tag;
  }

  #revision = runtime.current();

  get revision(): number {
    return this.#revision;
  }

  consume(this: MutableTag): void {
    runtime.consume(this);
  }

  update(this: MutableTag): void {
    this.#revision = runtime.advance();
  }
}

/**
 * Asserts an invariant. This function represents code that would be removed in user-facing code,
 * because the mechanics of the implementation should enforce the invariant.
 */
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}
