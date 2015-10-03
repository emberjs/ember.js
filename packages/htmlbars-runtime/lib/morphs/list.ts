import { EmptyableMorph, TemplateMorph, Morph, Bounds, MorphConstructor, createMorph, insertBoundsBefore, clear } from '../morph';
import { ChainableReference, Reference } from 'htmlbars-reference';
import { InternedString, Dict, LinkedList, dict, intern } from 'htmlbars-util';
import { ElementStack } from '../builder';
import Template, { Templates } from '../template';
import { RenderResult } from '../render';
import { Frame } from '../environment';

export interface MorphListOptions {
  reference: ChainableReference;
  key: Reference;
  templates: Templates;
}

export class MorphList extends EmptyableMorph {
  private reference: ChainableReference;
  private key: Reference;
  private templates: Templates;
  private presentBounds: Bounds;
  public list: LinkedList<InnerBlockMorph> = new LinkedList<InnerBlockMorph>();
  public map: Dict<InnerBlockMorph> = null;

  init({ reference, key, templates }: MorphListOptions) {
    this.reference = reference;
    this.key = key;
    this.templates = templates;

    this.presentBounds = {
      parentElement: () => this.parentNode,
      firstNode: () => this.list.head().firstNode(),
      lastNode: () => this.list.tail().lastNode()
    };
  }

  insertMorphBeforeInDOM(morph: InnerBlockMorph, reference: InnerBlockMorph) {
    insertBoundsBefore(this.parentNode, morph, reference, this.frame.dom());
  }

  firstNode(): Node {
    return this.list.head().firstNode();
  }

  lastNode(): Node {
    return this.list.tail().lastNode();
  }

  append(stack: ElementStack) {
    this.willAppend(stack);
    let array: any[] = this.reference.value();

    if (array.length === 0) return this.didBecomeEmpty();

    let nextSibling = this.nextSiblingForContent();

    let template = this.templates._default;
    let builder = new Builder(stack, this);

    array.forEach(val => {
      builder.append({ template, val, frame: this.frame, key: this.keyFor(val) });
    });

    this.didInsertContent(this.presentBounds);
    this.map = builder.map;
  }

  update() {
    let replay = new Replay(this, this.map);

    let array: any[] = this.reference.value();

    if (array.length === 0) return this.didBecomeEmpty();

    this.nextSiblingForContent();

    let template = this.templates._default;

    array.forEach(val => {
      replay.append({ template, val, frame: this.frame, key: this.keyFor(val) });
    });

    replay.commit();
    this.didInsertContent(this.presentBounds);
  }

  didBecomeEmpty() {
    super.didBecomeEmpty();

    this.map = dict<InnerBlockMorph>();

    this.list.forEachNode(node => node.destroy());

    this.list.clear();
  }

  private keyFor(obj: any): InternedString {
    let keyPath = this.key.value();

    if (keyPath === '@identity') return this.identityKey(obj);
    else return this.pathKey(obj, keyPath);
  }

  private identityKey(obj: any): InternedString {
    return this.frame.identity(obj);
  }

  private pathKey(obj: any, path: InternedString): InternedString {
    return intern(obj[<string>path]);
  }
}

interface InnerBlockOptions {
  template: Template;
  prev: InnerBlockMorph;
  key: InternedString,
  nextSibling: Node
}

class InnerBlockMorph extends TemplateMorph {
  public template: Template;
  public next: InnerBlockMorph;
  public prev: InnerBlockMorph;
  public nextSiblingNode: Node;
  public key: InternedString;
  public handled: boolean = false;

  firstNode(): Node {
    let { lastResult } = this;
    return lastResult && lastResult.firstNode();
  }

  lastNode(): Node {
    let { lastResult } = this;
    return lastResult && lastResult.lastNode();
  }

  init({ template, key, nextSibling }: InnerBlockOptions) {
    this.template = template;
    this.key = key;
    this.prev = null;
    this.next = null;
    this.nextSiblingNode = nextSibling || null;
  }

  append(stack: ElementStack) {
    this.willAppend(stack);
    this.appendTemplate(this.template, stack);
  }

  updateItem(value) {
    this.frame.scope().updateLocal(this.template.locals[0], value);
    this.update();
  }

  update() {
    super.update();
    this.handled = true;
  }
}

class Builder {
  public map: Dict<InnerBlockMorph> = dict<InnerBlockMorph>();
  private stack: ElementStack;
  private frame: Frame;
  private parentElement: Element;
  private parent: MorphList;

  constructor(stack: ElementStack, parent: MorphList) {
    this.stack = stack;
    this.frame = parent.frame;
    this.parentElement = parent.parentNode;
    this.parent = parent;
  }

  append({ template, key, frame, val }: { template: Template, key: InternedString, frame: Frame, val: any }) {
    let childFrame = frame.child();

    if (template.arity) {
      let scope = childFrame.childScope(template.locals);
      scope.bindLocal(template.locals[0], val);
    }

    let morph = createMorph(InnerBlockMorph, this.parentElement, childFrame, { template, key });
    morph.append(this.stack);
    this.map[<string>key] = morph;

    this.parent.list.append(morph);
    return morph;
  }
}

class Replay {
  private parentNode: Element;
  private list: LinkedList<InnerBlockMorph>;
  private parent: MorphList;
  private current: InnerBlockMorph;
  private map: Dict<InnerBlockMorph>;
  private candidates: Dict<InnerBlockMorph> = dict<InnerBlockMorph>();

  constructor(parent: MorphList, map: Dict<InnerBlockMorph>) {
    this.current = parent.list.head();
    this.map = map;
    this.parent = parent;
    this.parentNode = parent.parentNode;
    this.list = parent.list;
  }

  append({ template, key, val, frame }: { template: Template, key: InternedString, val: any, frame: Frame }) {
    let { current, map, list, parentNode } = this;

    if (current && current.key === key) {
      current.updateItem(val);
      this.current = this.list.nextNode(current);
    } else if (map[<string>key] !== undefined) {
      let found = map[<string>key];

      if (<string>key in this.candidates) {
        list.remove(found);
        list.insertBefore(found, current);
        this.parent.insertMorphBeforeInDOM(found, current);
      } else {
        this.advanceToKey(key);
      }

      found.updateItem(val);
    } else {
      let childFrame = frame.child();
      if (template.arity) {
        childFrame.childScope(template.locals);
        childFrame.scope().bindLocal(template.locals[0], val);
      }

      let nextSibling = current && current.firstNode();
      let child = createMorph(InnerBlockMorph, parentNode, childFrame, { template, prev: null, key, nextSibling });
      child.handled = true;
      map[<string>key] = child;
      list.insertBefore(child, current);
      let stack = new ElementStack({ parentNode, nextSibling, dom: this.parent.frame.dom() });
      child.append(stack);
    }
  }

  advanceToKey(key: InternedString) {
    let seek = this.current;

    while (seek && seek.key !== key) {
      this.candidates[<string>seek.key] = seek;
      seek = this.list.nextNode(seek);
    }

    this.current = seek && this.list.nextNode(seek);
    return seek;
  }

  commit() {
    let list = this.list;

    list.forEachNode(node => {
      if (node.handled) {
        node.handled = false;
      } else {
        list.remove(node);
        delete this.map[<string>node.key];
        clear(node);
        node.destroy();
      }
    });
  }
}
