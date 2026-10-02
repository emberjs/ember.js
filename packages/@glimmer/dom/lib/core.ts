import { associateDestroyableChild, destroy } from '@glimmer/destroyable';

/**
 * A lazily-evaluated value. Compiled templates pass every dynamic value
 * around as a thunk, so that reading it happens inside whichever tracking
 * frame (cache) is consuming it.
 */
export type Thunk<T = unknown> = () => T;

export type Updater = () => void;

/**
 * A render function for a block of template content.
 *
 * It receives the block that owns the content (for registering updaters and
 * destructors), plus one thunk per block param, and returns the DOM it
 * created (usually a DocumentFragment).
 */
export type BlockFn = (b: Block, ...params: Thunk[]) => Node;

export type AttrsFn = (b: Block, element: Element) => void;

export type Blocks = Partial<Record<string, BlockFn>>;

/**
 * Everything a component's template can see about its invocation.
 */
export interface Ctx {
  self: unknown;
  args: Record<string, unknown>;
  blocks: Blocks | null;
  attrs: AttrsFn | null;
}

export interface OutletSink {
  /**
   * Registers an element for the router to render the child route into.
   * Returns a function that unregisters it.
   */
  add(element: Element): () => void;
}

/**
 * Shared state for one render tree (one `renderComponent` call).
 */
export class Root {
  #queue: Array<() => void> = [];

  /**
   * Where `{{outlet}}`s go, when this tree is rendered from a route template
   * (see `@glimmer/dom/vm`).
   */
  outlets: OutletSink | null = null;

  constructor(
    readonly owner: object,
    readonly document: Document
  ) {}

  /**
   * Schedule work that must happen after DOM is inserted
   * (modifier install/update, component didCreate hooks).
   */
  schedule(fn: () => void): void {
    this.#queue.push(fn);
  }

  flush(): void {
    while (this.#queue.length > 0) {
      let queue = this.#queue;
      this.#queue = [];
      for (let fn of queue) fn();
    }
  }
}

/**
 * The unit of ownership: a block owns the updaters and destructors for a
 * contiguous region of DOM. Structural helpers (`when`, `each`, components,
 * yields) create child blocks, and are responsible for updating them.
 *
 * This is the replacement for the UpdatingVM's opcode tree: rather than
 * recording opcodes during an initial render, compiled templates register
 * closures directly.
 */
export class Block {
  readonly updaters: Updater[] = [];

  constructor(
    readonly root: Root,
    parent: Block | null
  ) {
    if (parent) associateDestroyableChild(parent, this);
  }

  update(): void {
    let { updaters } = this;
    for (let i = 0; i < updaters.length; i++) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- in bounds
      updaters[i]!();
    }
  }
}

/**
 * A region of DOM owned by a child block, delimited by two empty text nodes.
 * Empty text nodes are invisible in serialized HTML, and give us stable
 * boundaries even when the content at either edge is itself dynamic.
 */
export interface Mounted {
  b: Block;
  start: Node;
  end: Node;
}

export function marker(root: Root): Text {
  return root.document.createTextNode('');
}

/**
 * Create a child block, render into it, and insert the result before `before`.
 */
export function mount(parent: Block, before: Node, render: (b: Block) => Node): Mounted {
  let b = new Block(parent.root, parent);
  let start = marker(parent.root);
  let end = marker(parent.root);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- anchors are always attached
  let target = before.parentNode!;

  target.insertBefore(start, before);
  target.insertBefore(render(b), before);
  target.insertBefore(end, before);

  return { b, start, end };
}

export function unmount(m: Mounted): void {
  removeRange(m.start, m.end);
  destroy(m.b);
}

export function removeRange(first: Node, last: Node): void {
  let parent = first.parentNode;
  if (!parent) return;

  let node: Node | null = first;
  while (node) {
    let next: Node | null = node === last ? null : node.nextSibling;
    parent.removeChild(node);
    node = next;
  }
}

export function moveRange(m: Mounted, before: Node): void {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- anchors are always attached
  let parent = before.parentNode!;
  let node: Node | null = m.start;
  while (node) {
    let next: Node | null = node === m.end ? null : node.nextSibling;
    parent.insertBefore(node, before);
    node = next;
  }
}

/////////////////////////////////////////////////////////////////////////////
// Static HTML
/////////////////////////////////////////////////////////////////////////////

/**
 * Static markup for one block of a template. Parsed once (lazily), then
 * cloned for every render. This is where most of the size savings come from:
 * static content costs about what its HTML text costs.
 */
export interface StaticHTML {
  markup: string;
  parsed: HTMLTemplateElement | null;
}

export function html(markup: string): StaticHTML {
  return { markup, parsed: null };
}

export function clone(b: Block, t: StaticHTML): DocumentFragment {
  let parsed = t.parsed;
  if (parsed === null) {
    parsed = t.parsed = b.root.document.createElement('template');
    parsed.innerHTML = t.markup;
  }
  return b.root.document.importNode(parsed.content, true);
}

/**
 * Walk to a node by child indexes. Compiled templates resolve every node they
 * need right after cloning, before any helper mutates the DOM.
 */
export function at(node: Node, ...path: number[]): Node {
  for (let i of path) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- paths are computed by the compiler
    node = node.childNodes[i]!;
  }
  return node;
}

/////////////////////////////////////////////////////////////////////////////
// Templates
/////////////////////////////////////////////////////////////////////////////

export type RenderFn = (b: Block, ctx: Ctx) => Node;

/**
 * A compiled template. It doubles as a template-only component definition.
 */
export class Template {
  constructor(readonly render: RenderFn) {}

  toString(): string {
    return '(compiled template)';
  }
}

export function template(render: RenderFn): Template {
  return new Template(render);
}

const TEMPLATES = new WeakMap<object, Template>();

/**
 * The equivalent of `setComponentTemplate` for compiled templates.
 */
export function setTemplate<T extends object>(definition: T, t: Template): T {
  TEMPLATES.set(definition, t);
  return definition;
}

export function templateFor(definition: object): Template | undefined {
  if (definition instanceof Template) return definition;

  let pointer: object | null = definition;
  while (pointer !== null && pointer !== Function.prototype && pointer !== Object.prototype) {
    let found = TEMPLATES.get(pointer);
    if (found) return found;
    pointer = Object.getPrototypeOf(pointer) as object | null;
  }

  return undefined;
}
