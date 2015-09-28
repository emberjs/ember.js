import { EmptyableMorph, TemplateMorph, Morph, Bounds, MorphConstructor, initializeMorph, insertBoundsBefore, clear } from '../morph';
import { ChainableReference, Reference } from 'htmlbars-reference';
import { InternedString, Dict, dict, intern } from 'htmlbars-util';
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
  public head: InnerBlockMorph = null;
  public tail: InnerBlockMorph = null;
  public map: Dict<InnerBlockMorph> = null;

  init({ reference, key, templates }: MorphListOptions) {
    this.reference = reference;
    this.key = key;
    this.templates = templates;
    this.presentBounds = {
      parentElement: () => this.parentNode,
      firstNode: () => this.head.firstNode(),
      lastNode: () => this.tail.lastNode()
    };
    this.initializeBounds(this.presentBounds);
  }

  firstNode(): Node {
    return this.head.firstNode();
  }

  lastNode(): Node {
    return this.tail.lastNode();
  }

  insertMorphBefore(morph: InnerBlockMorph, reference: InnerBlockMorph) {
    insertBoundsBefore(this.parentNode, morph, reference, this.frame.dom());

    let prev = reference ? reference.previousMorph : this.tail;

    if (reference === null) this.tail = morph;

    if (prev) prev.nextMorph = morph;
    morph.previousMorph = prev;

    if (reference === this.head) this.head = morph;
    if (reference) reference.previousMorph = morph;
    morph.nextMorph = reference;

    cycleCheck(this);
  }

  remove(morph: InnerBlockMorph) {
    let prev = morph.previousMorph;
    let next = morph.nextMorph;

    if (prev) {
      prev.nextMorph = next;
    } else {
      this.head = next;
    }

    if (next) {
      next.previousMorph = prev;
    } else {
      this.tail = prev;
    }
  }

  append(stack: ElementStack) {
    let array: any[] = this.reference.value();

    if (array.length === 0) {
      return;
    }

    this.initializeBounds(this.presentBounds);

    let template = this.templates._default;
    let builder = new Builder(stack, this);

    array.forEach(val => {
      builder.append({ template, val, frame: this.frame, key: this.keyFor(val) });
    });

    this.head = builder.head;
    this.tail = builder.tail;
    this.map = builder.map;
    cycleCheck(this);
  }

  update() {
    let replay = new Replay(this.head, this.tail, this.map, this);

    let array: any[] = this.reference.value();

    if (array.length === 0) return this.empty();
    if (this.isEmpty()) this.initializeBounds(this.presentBounds);

    let template = this.templates._default;

    array.forEach(val => {
      replay.append({ template, val, frame: this.frame, key: this.keyFor(val) });
    });

    cycleCheck(this);

    replay.commit();
  }

  empty() {
    super.empty();
    this.map = dict<InnerBlockMorph>();
    let item = this.head;

    let set = new Set();

    while (item) {
      set.add(item);
      let next = item.nextMorph;
      item.destroy();
      item = next;
    }

    this.head = this.tail = null;
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

function cycleCheck(list: MorphList) {
  let set = new Set();
  let item = list.head;
  let path = [];

  while (item) {
    if (set.has(item)) {
      console.log(item, path);
      throw new Error(`BUG: Already saw ${item} traversing ${path.join(', ')}`);
    }

    path.push(item);
    set.add(item);
    item = item.nextMorph;
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
  public nextMorph: InnerBlockMorph;
  public previousMorph: InnerBlockMorph;
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

  init({ template, prev, key, nextSibling }: InnerBlockOptions) {
    this.template = template;
    this.key = key;
    this.previousMorph = prev;
    this.nextMorph = null;
    this.nextSiblingNode = nextSibling || null;
    if (prev) prev.nextMorph = this;
  }

  append(stack: ElementStack) {
    this.appendTemplate(this.template);
  }

  updateItem(value) {
    this.frame.scope().updateLocal(this.template.locals[0], value);
    this.update();
  }

  update() {
    this.updateTemplate(this.template);
    this.handled = true;
  }
}

class Builder {
  public head: InnerBlockMorph = null;
  public tail: InnerBlockMorph = null;
  public map: Dict<InnerBlockMorph> = dict<InnerBlockMorph>();
  private stack: ElementStack;
  private frame: Frame;
  private parent: Element;
  private list: MorphList;

  constructor(stack: ElementStack, list: MorphList) {
    this.stack = stack;
    this.frame = list.frame;
    this.parent = list.parentNode;
    this.list = list;
  }

  append({ template, key, frame, val }: { template: Template, key: InternedString, frame: Frame, val: any }) {
    let prev = this.tail;
    let childFrame = frame.child();

    if (template.arity) {
      let scope = childFrame.childScope(template.locals);
      scope.bindLocal(template.locals[0], val);
    }

    let morph = initializeMorph(InnerBlockMorph, { template, prev, key }, this.parent, childFrame);
    morph.append(this.stack);

    if (!this.head) this.head = morph;
    this.tail = this.map[<string>key] = morph;

    return morph;
  }

  replay(): Replay {
    return new Replay(this.head, this.tail, this.map, this.list);
  }
}

class Replay {
  private head: InnerBlockMorph;
  private tail: InnerBlockMorph;
  private list: MorphList;
  private current: InnerBlockMorph;
  private prev: InnerBlockMorph = null;
  private map: Dict<InnerBlockMorph>;
  private candidates: Dict<InnerBlockMorph> = dict<InnerBlockMorph>();

  constructor(head: InnerBlockMorph, tail: InnerBlockMorph, map: Dict<InnerBlockMorph>, list: MorphList) {
    this.head = head;
    this.tail = tail;
    this.current = head;
    this.map = map;
    this.list = list;
  }

  append({ template, key, val, frame }: { template: Template, key: InternedString, val: any, frame: Frame }) {
    let { current, prev, map, list } = this;

    if (current && current.key === key) {
      current.updateItem(val);
      this.prev = current;
      this.current = current.nextMorph;
    } else if (map[<string>key] !== undefined) {
      let found = map[<string>key];

      if (<string>key in this.candidates) {
        this.list.remove(found);
        this.list.insertMorphBefore(found, current);
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

      let child = initializeMorph(InnerBlockMorph, { template, prev: null, key }, list.parentNode, childFrame);
      child.handled = true;
      map[<string>key] = child;
      list.insertMorphBefore(child, current);
      child.appendTemplate(template, current && current.firstNode());
    }
  }

  advanceToKey(key: InternedString) {
    let seek = this.current;

    while (seek && seek.key !== key) {
      this.candidates[<string>seek.key] = seek;
      seek = seek.nextMorph;
    }

    this.prev = seek;
    this.current = seek && seek.nextMorph;
    return seek;
  }

  commit() {
    let item = this.list.head;
    let lastHandled: InnerBlockMorph;
    let firstHandled: InnerBlockMorph;

    while (item) {
      let next = item.nextMorph;

      if (item.handled) {
        item.handled = false;

        item.previousMorph = lastHandled || null;
        if (lastHandled) lastHandled.nextMorph = item;

        firstHandled = firstHandled || item;
        lastHandled = item;
      } else {
        delete this.map[<string>item.key];
        clear(item);
        this.list.remove(item);
        item.destroy();
      }

      item = next;
    }

    if (!firstHandled || !lastHandled) throw new Error("BUG: No morphs handled");
    this.list.head = firstHandled;
    this.list.tail = lastHandled;
    cycleCheck(this.list);
  }
}
