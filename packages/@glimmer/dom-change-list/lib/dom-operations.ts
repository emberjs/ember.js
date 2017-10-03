import { Simple, Option } from '@glimmer/interfaces';
import { dict, assert } from '@glimmer/util';
import { NodeToken, NodeTokens } from './node-tokens';

export enum ConstructionOperation {
  OpenElement,
  CloseElement,
  SetAttribute,
  AppendText,
  AppendComment,
  AppendHTML
}

type OpSize = 0 | 1 | 2 | 3;

function withSize(opcode: ConstructionOperation, size: number): number {
  return opcode << 3 | size;
}

function sizeof(opcode: number): OpSize {
  return (opcode & 0b11) as OpSize;
}

function opcodeof(opcode: number): ConstructionOperation {
  return opcode >> 3;
}

export const HTML = "http://www.w3.org/1999/xhtml";

export class Constants {
  private strings: string[] = [];
  private set = dict<number>();

  get(s: string): number {
    if (this.set[s] !== undefined) {
      return this.set[s];
    }

    let index = this.strings.length;
    this.strings.push(s);
    this.set[s] = index;
    return index;
  }

  all(): ReadonlyArray<string> {
    return this.strings;
  }
}

export class OperationsBuilder {
  private token = 0;

  constructor(private ops: number[], private constants: Constants = new Constants()) {}

  finish(): { ops: ReadonlyArray<number>, constants: ReadonlyArray<string> } {
    return {
      ops: this.ops,
      constants: this.constants.all()
    };
  }

  openElement(name: string, ns: Simple.Namespace = HTML): NodeToken {
    let nameConst = this.constants.get(name);
    let nsConst = this.constants.get(ns);

    this.ops.push(withSize(ConstructionOperation.OpenElement, 2), nameConst, nsConst);
    return this.token++;
  }

  closeElement() {
    this.ops.push(withSize(ConstructionOperation.CloseElement, 0));
  }

  setAttribute(name: string, value: string, ns: Simple.Namespace = HTML) {
    let nameConst = this.constants.get(name);
    let valueConst = this.constants.get(value);
    let nsConst = this.constants.get(ns);

    this.ops.push(withSize(ConstructionOperation.SetAttribute, 3), nameConst, valueConst, nsConst);
  }

  appendText(text: string) {
    this.ops.push(withSize(ConstructionOperation.AppendText, 1), this.constants.get(text));
    return this.token++;
  }

  appendComment(text: string) {
    this.ops.push(withSize(ConstructionOperation.AppendComment, 1), this.constants.get(text));
    return this.token++;
  }

  appendHTML(html: string) {
    this.ops.push(withSize(ConstructionOperation.AppendHTML, 1), this.constants.get(html));
    return this.token++;
  }
}

interface ConstructionState {
  readonly document: Simple.Document;
  readonly nextSibling: Option<Simple.Node>;
  readonly elements: Parent[]; // mutable
  readonly tokens: NodeTokens;

  parent: Parent;
  constants: ReadonlyArray<string>;
  constructing: Option<Simple.Element>;
}

export type Parent = Simple.Element | Simple.DocumentFragment;

export interface RunOptions {
  document: Simple.Document;
  parent: Parent;
  nextSibling: Option<Simple.Node>;
  constants: ReadonlyArray<string>;
}

export function run(opcodes: ReadonlyArray<number>, options: RunOptions) {
  let offset = 0;
  let end = opcodes.length;
  let tokens = new NodeTokens();

  tokens.register(options.parent);

  let state: ConstructionState = {
    ...options,
    elements: [options.parent],
    constructing: null,
    tokens
  };

  while (offset < end) {
    let value = opcodes[offset];
    let size = sizeof(value);
    let opcode = opcodeof(value);

    let func = ConstructionOperations[opcode];

    switch (size) {
      case 0:
        func(state);
        break;
      case 1:
        func(state, opcodes[offset + 1]);
        break;
      case 2:
        func(state, opcodes[offset + 1], opcodes[offset + 2]);
        break;
      case 3:
        func(state, opcodes[offset + 1], opcodes[offset + 2], opcodes[offset + 3]);
        break;
    }

    offset += size + 1;
  }

  return tokens;
}

type ConstructionFunction = ((state: ConstructionState, ...args: number[]) => void);

const ConstructionOperations: ConstructionFunction[] = [
  /* (OpenElement tag namespace) */
  (state, tag, namespace) => {
    let { constants, document } = state;

    if (state.constructing) flush(state);

    let el = document.createElementNS(constants[namespace] as Simple.Namespace, constants[tag]);
    state.constructing = el;
    state.tokens.register(el);
  },

  /* (CloseElement) */
  (state) => {
    if (state.constructing) flush(state);
    state.elements.pop();
    state.parent = state.elements[state.elements.length - 1];
  },

  /* (SetAttribute name value namespace) */
  (state, name, value, namespace) => {
    let { constants, constructing } = state;

    assert(constructing !== null, 'SetAttribute can only be invoked when an element is being constructed');

    constructing!.setAttributeNS(constants[namespace] as Simple.Namespace, constants[name], constants[value]);
  },

  /* (AppendText text) */
  (state, text) => {
    let {
      constants,
      document,
      parent,
      nextSibling,
      constructing
    } = state;

    let parentElement = constructing ? flush(state) : parent;
    let textNode = document.createTextNode(constants[text]);
    parentElement.insertBefore(textNode, nextSibling);
    state.tokens.register(textNode);
  },

  /* (AppendComment text) */
  (state, text) => {
    let { constants, document, parent, nextSibling } = state;
    let parentElement = state.constructing ? flush(state) : parent;
    let commentNode = document.createComment(constants[text]);
    parentElement.insertBefore(commentNode, nextSibling);
    state.tokens.register(commentNode);
  },

  /* (AppendHTML text) */
  (_state, _text) => {
    throw new Error('unimplemented');
  }
];

function flush(state: ConstructionState): Simple.Element {
  let { constructing, nextSibling, elements } = state;
  state.parent.insertBefore(constructing!, nextSibling);
  state.constructing = null;
  state.parent = constructing!;
  elements.push(constructing!);

  return constructing!;
}
