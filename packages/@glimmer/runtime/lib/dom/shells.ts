import type {
  Dict,
  GlimmerTreeConstruction,
  ModifierInstance,
  Nullable,
  Shell,
  ShellElement,
  ShellNode,
  SimpleDocument,
  SimpleDocumentFragment,
  SimpleElement,
  SimpleNode,
  TreeBuilder,
} from '@glimmer/interfaces';
import { NS_HTML } from '@glimmer/constants/lib/dom';

const ELEMENT = 1;
const TEXT = 3;

const FIRST_CHILD = 0;
const NEXT_SIBLING = 1;
const PARENT = 2;

interface Prototypes {
  document: SimpleDocument;
  // The parent decides the namespace of the top-level elements, see
  // `contextKey`.
  byContext: Map<string, SimpleDocumentFragment>;
}

interface InertDocument {
  document: Document;
  operations: GlimmerTreeConstruction;
}

const PROTOTYPES = new WeakMap<Shell, Prototypes>();

// Prototypes live in an inert document: nothing loads or runs there.
const INERT_DOCUMENTS = new WeakMap<SimpleDocument, InertDocument>();

const SVG_INTEGRATION_POINTS: Dict<1> = { foreignObject: 1, desc: 1, title: 1 };

export function canCloneShells(document: SimpleDocument): boolean {
  let doc = document as unknown as Partial<Document>;
  return (
    typeof doc.adoptNode === 'function' &&
    typeof doc.implementation?.createHTMLDocument === 'function'
  );
}

/** Returns a copy of the shell's nodes that belongs to `document`. */
export function cloneShell(
  document: SimpleDocument,
  makeOperations: (document: SimpleDocument) => GlimmerTreeConstruction,
  shell: Shell,
  parent: SimpleElement
): SimpleDocumentFragment {
  let prototypes = PROTOTYPES.get(shell);

  if (prototypes === undefined || prototypes.document !== document) {
    prototypes = { document, byContext: new Map() };
    PROTOTYPES.set(shell, prototypes);
  }

  let key = contextKey(parent);
  let prototype = prototypes.byContext.get(key);

  if (prototype === undefined) {
    prototype = buildPrototype(inertDocument(document, makeOperations), shell, parent);
    prototypes.byContext.set(key, prototype);
  }

  // Copying inside the inert document and adopting the copy is faster than
  // `importNode`.
  let doc = document as unknown as Document;
  let copy = (prototype as unknown as DocumentFragment).cloneNode(true);
  return doc.adoptNode(copy) as unknown as SimpleDocumentFragment;
}

// What `DOMOperations#createElement` reads from the parent.
function contextKey(parent: SimpleElement): string {
  let namespace: string = parent.namespaceURI;

  if (namespace === (NS_HTML as string)) return namespace;

  return SVG_INTEGRATION_POINTS[parent.tagName] ? `${namespace} integration` : namespace;
}

function inertDocument(
  document: SimpleDocument,
  makeOperations: (document: SimpleDocument) => GlimmerTreeConstruction
): InertDocument {
  let inert = INERT_DOCUMENTS.get(document);

  if (inert === undefined) {
    let doc = (document as unknown as Document).implementation.createHTMLDocument('');
    inert = { document: doc, operations: makeOperations(doc as unknown as SimpleDocument) };
    INERT_DOCUMENTS.set(document, inert);
  }

  return inert;
}

function buildPrototype(
  inert: InertDocument,
  shell: Shell,
  parent: SimpleElement
): SimpleDocumentFragment {
  let fragment = inert.document.createDocumentFragment() as unknown as SimpleDocumentFragment;
  appendChildren(inert.operations, shell.root, fragment, parent);
  return fragment;
}

function appendChildren(
  operations: GlimmerTreeConstruction,
  shell: ShellElement,
  parent: SimpleElement | SimpleDocumentFragment,
  context: SimpleElement
): void {
  for (const child of shell.children) {
    let node: SimpleNode;

    if (child.type === ELEMENT) {
      let element = operations.createElement(child.tag, context);

      for (const [name, value, namespace] of child.attrs) {
        operations.setAttribute(element, name, value, namespace);
      }

      appendChildren(operations, child, element, element);
      node = element;
    } else if (child.type === TEXT) {
      node = operations.createTextNode(child.value);
    } else {
      node = operations.createComment(child.value);
    }

    parent.appendChild(node);
  }
}

/** Returns the anchor nodes of a copy of the shell. */
export function collectAnchors(root: SimpleNode, shell: Shell): SimpleNode[] {
  let { walk } = shell;
  let anchors = new Array<SimpleNode>(shell.anchors.length);
  let node = root;
  let count = 0;

  for (let i = 0; i < walk.length; i++) {
    switch (walk[i]) {
      case FIRST_CHILD:
        node = node.firstChild as SimpleNode;
        break;
      case NEXT_SIBLING:
        node = node.nextSibling as SimpleNode;
        break;
      case PARENT:
        node = node.parentNode as SimpleNode;
        break;
      default:
        anchors[count++] = node;
    }
  }

  return anchors;
}

interface OpenShellElement {
  element: ShellElement;
  // The next child to create.
  next: number;
}

/**
 * Creates a shell node by node, in document order, with the builder calls
 * that create any element. Builders that add server markers or claim server
 * nodes use it, and so do shells that must not be cloned.
 */
export class ShellReplay {
  // The first entry is the shell's root, which has no element of its own.
  private open: OpenShellElement[];
  private pending: Nullable<ShellElement> = null;

  constructor(private shell: Shell) {
    this.open = [{ element: shell.root, next: 0 }];
  }

  openAnchor(tree: TreeBuilder, anchor: number): void {
    let element = this.shell.anchors[anchor] as ShellElement;

    this.advance(tree, element, false);
    this.top().next++;
    openElement(tree, element);
    this.pending = element;
  }

  flushAnchor(tree: TreeBuilder, modifiers: Nullable<ModifierInstance[]>): void {
    this.flushPending(tree, modifiers);
  }

  closeAnchor(tree: TreeBuilder, anchor: number): Nullable<ModifierInstance[]> {
    let element = this.shell.anchors[anchor] as ShellElement;

    this.flushPending(tree, null);
    while (this.top().element !== element) this.finish(tree);

    this.createRest(tree, this.top());
    this.open.pop();
    return tree.closeElement();
  }

  moveTo(tree: TreeBuilder, parent: number, next: number): void {
    let { anchors, root } = this.shell;

    if (next === -1) {
      this.advance(tree, parent === -1 ? root : (anchors[parent] as ShellElement), true);
      this.createRest(tree, this.top());
    } else {
      this.advance(tree, anchors[next] as ShellNode, false);
    }
  }

  close(tree: TreeBuilder): void {
    this.flushPending(tree, null);
    while (this.open.length > 1) this.finish(tree);
    this.createRest(tree, this.top());
  }

  private top(): OpenShellElement {
    return this.open[this.open.length - 1] as OpenShellElement;
  }

  private flushPending(tree: TreeBuilder, modifiers: Nullable<ModifierInstance[]>): void {
    let { pending } = this;

    if (pending !== null) {
      tree.flushElement(modifiers);
      this.open.push({ element: pending, next: 0 });
      this.pending = null;
    }
  }

  private finish(tree: TreeBuilder): void {
    this.createRest(tree, this.top());
    this.open.pop();
    tree.closeElement();
  }

  private createRest(tree: TreeBuilder, open: OpenShellElement): void {
    let { children } = open.element;

    while (open.next < children.length) {
      createNode(tree, children[open.next++] as ShellNode);
    }
  }

  // With `inside`, opens `target` itself. Otherwise opens its parent and
  // creates the siblings before it.
  private advance(tree: TreeBuilder, target: ShellNode, inside: boolean): void {
    this.flushPending(tree, null);

    for (;;) {
      let { element } = this.top();
      if (contains(element, target) && (inside || element !== target)) break;
      this.finish(tree);
    }

    for (;;) {
      let open = this.top();
      if (inside && open.element === target) return;

      let { children } = open.element;
      let child = children[open.next] as ShellNode;

      while (!contains(child, target)) {
        createNode(tree, child);
        child = children[++open.next] as ShellNode;
      }

      if (child === target && !inside) return;

      open.next++;
      openElement(tree, child as ShellElement);
      tree.flushElement(null);
      this.open.push({ element: child as ShellElement, next: 0 });
    }
  }
}

function contains(node: ShellNode, target: ShellNode): boolean {
  return node.index <= target.index && target.index <= node.end;
}

function openElement(tree: TreeBuilder, element: ShellElement): void {
  tree.openElement(element.tag);

  for (const [name, value, namespace] of element.attrs) {
    tree.setStaticAttribute(name, value, namespace);
  }
}

function createNode(tree: TreeBuilder, node: ShellNode): void {
  if (node.type === ELEMENT) {
    openElement(tree, node);
    tree.flushElement(null);

    for (const child of node.children) {
      createNode(tree, child);
    }

    tree.closeElement();
  } else if (node.type === TEXT) {
    tree.appendText(node.value);
  } else {
    tree.appendComment(node.value);
  }
}
