// createContext (RFC #1200) is the only consumer. A `read` returns the
// currently-provided value for a context key, evaluated lazily so that
// auto-tracking inside it makes consumers reactive to the provided `@value`.
type ContextRead = () => unknown;

/**
 * A context's identity token, created once per `createContext()` call. The
 * key owns the stack of provider entries for that context, so lookups touch
 * only the consulted context's own entries -- there is no global map of
 * contexts, and a context that is never provided costs nothing.
 */
export interface RenderContextKey {
  stack: ProviderEntry[];
}

interface ProviderEntry {
  /** Depth of the frame this value was provided in. */
  depth: number;
  /** Id of the frame this value was provided in (see `nextFrameId`). */
  frame: number;
  read: ContextRead;
}

export function createRenderContextKey(): RenderContextKey {
  return { stack: [] };
}

// Frame ids are globally unique and never reused, across all trackers
// (environments). A closed frame's (depth, id) pair can therefore never be
// mistaken for an open one -- not later in the same render, not in a later
// render, and not by a different environment sharing a module-level context.
let nextFrameId = 0;

/**
 * Tracks where the render cursor is so a context consumer can find the
 * nearest provider above it, using *shallow binding* rather than a retained
 * node tree:
 *
 * - `frameEpoch[d]` holds the id of the frame currently open at depth `d`.
 *   At any instant the open frames are exactly the ancestors of the render
 *   cursor, one per depth, so "is this provider entry still an ancestor of
 *   me" is two integer comparisons (`isLive`).
 * - Closing a frame is a bare `depth--`. Nothing is restored or scanned:
 *   entries stamped with a closed frame's id are dead forever, and get
 *   popped lazily by the next `provide`/`lookup` on that context's own
 *   stack (`skim`), amortized against the provides that pushed them.
 *
 * Per component this costs an integer increment on create and a decrement on
 * exit -- no allocation, no retained node, and (for non-providers) no
 * updating opcodes. Only components that actually provide a context pay for
 * anything beyond that.
 */
export class RenderScopeTracker {
  private depth = 0;
  private frameEpoch: number[] = [0];
  // bucket (component instance) -> what it provided, recorded at construction
  // so update passes can re-activate it without re-running the constructor.
  // Only providers ever get an entry.
  private provisions = new WeakMap<object, [RenderContextKey, ContextRead][]>();
  // The most recently created bucket. Only read by `provide`, which is only
  // called from a component constructor, which always runs immediately after
  // its own `create` -- so this is always the providing component.
  private currentBucket: object | null = null;

  // Reset the cursor in case a previous render errored mid-flight and never
  // unwound. Frames left open by such a render become unreachable ids; the
  // depth check in `isLive` kills their entries.
  begin(): void {
    this.depth = 0;
    this.currentBucket = null;
  }

  // Open a fresh frame when a component is created (before its constructor
  // runs). Called for every component during the append pass.
  create(bucket: object): void {
    this.frameEpoch[++this.depth] = ++nextFrameId;
    this.currentBucket = bucket;
  }

  // Close the current frame. Called for every component during the append
  // pass. Dead entries are cleaned up lazily elsewhere -- see class docs.
  exit(): void {
    this.depth--;
  }

  // Whether this component provided anything at construction. Stable by the
  // time the component's layout has rendered, so the append opcodes use it
  // to skip update-pass bracketing for non-providers entirely.
  isProvider(bucket: object): boolean {
    return this.provisions.has(bucket);
  }

  // Re-open a provider's frame during an update pass, re-activating what its
  // constructor provided. Only providers get the updating opcodes that call
  // this, so update-pass depth counts provider frames (plus any frames opened
  // by appends resumed within the pass) -- correctness needs LIFO open/close
  // discipline, not true tree depth.
  enterUpdate(bucket: object): void {
    this.frameEpoch[++this.depth] = ++nextFrameId;
    let provisions = this.provisions.get(bucket);
    if (provisions !== undefined) {
      for (let [key, read] of provisions) {
        this.push(key, read);
      }
    }
  }

  exitUpdate(): void {
    this.depth--;
  }

  // Provide `key`'s value at the current frame (called from `<Provide>`'s
  // constructor, which always runs inside its own frame).
  provide(key: RenderContextKey, read: ContextRead): void {
    this.push(key, read);

    let bucket = this.currentBucket;
    if (bucket !== null) {
      let provisions = this.provisions.get(bucket);
      if (provisions === undefined) {
        this.provisions.set(bucket, (provisions = []));
      }
      provisions.push([key, read]);
    }
  }

  // The nearest provider of `key`:
  //   `undefined` -> the cursor is not inside any render frame (e.g. a
  //                  modifier installing during commit, after the render
  //                  frames have all closed),
  //   `null`      -> inside a frame, but no provider for `key`,
  //   a function  -> the nearest provider's read fn.
  lookup(key: RenderContextKey): ContextRead | null | undefined {
    if (this.depth === 0) {
      return undefined;
    }
    let { stack } = key;
    this.skim(stack);
    let top = stack[stack.length - 1];
    return top === undefined ? null : top.read;
  }

  // Pop dead entries off the top of a context's stack. Because frames close
  // in LIFO order and every push skims first, dead entries always form a
  // contiguous top segment -- a live entry is never buried under a dead one,
  // and each dead entry is popped exactly once (amortized O(1) against the
  // provide that pushed it). In the steady state this loop runs 0-1 times.
  private skim(stack: ProviderEntry[]): void {
    let top: ProviderEntry | undefined;
    while ((top = stack[stack.length - 1]) !== undefined && !this.isLive(top)) {
      stack.pop();
    }
  }

  private isLive(entry: ProviderEntry): boolean {
    return entry.depth <= this.depth && this.frameEpoch[entry.depth] === entry.frame;
  }

  private push(key: RenderContextKey, read: ContextRead): void {
    let { stack } = key;
    this.skim(stack);
    // `frameEpoch[depth]` is always populated: every path that increments
    // `depth` stamps it first.
    stack.push({ depth: this.depth, frame: this.frameEpoch[this.depth] as number, read });
  }
}

// The renderer points this at the active tracker for the duration of a render,
// so the helpers below work from anywhere in a tick (e.g. a context `value`
// read that has no handle to the VM). Cleared between renders.
let CURRENT: RenderScopeTracker | undefined;

export function setCurrentRenderScopeTracker(tracker: RenderScopeTracker | undefined): void {
  CURRENT = tracker;
}

/** Provide `key`'s value at the current render frame (createContext's `<Provide>`). */
export function provideRenderContext(key: RenderContextKey, read: ContextRead): void {
  if (CURRENT === undefined) {
    throw new Error('A context can only be provided while rendering.');
  }
  CURRENT.provide(key, read);
}

/**
 * The nearest provider of `key`:
 *   `undefined` -> called outside of rendering,
 *   `null`      -> rendering, but no provider for `key`,
 *   a function  -> the nearest provider's read fn.
 */
export function lookupRenderContext(key: RenderContextKey): ContextRead | null | undefined {
  return CURRENT === undefined ? undefined : CURRENT.lookup(key);
}
