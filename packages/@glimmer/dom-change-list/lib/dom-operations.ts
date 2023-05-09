import {
  type AttrNamespace,
  type ElementNamespace,
  type Namespace,
  type NodeToken,
  type Option,
  type SimpleDocument,
  type SimpleDocumentFragment,
  type SimpleElement,
  type SimpleNode,
} from '@glimmer/interfaces';
import { assert, assign, dict, NS_HTML } from '@glimmer/util';

import { NodeTokensImpl } from './node-tokens';

export enum ConstructionOperation {
  OpenElement,
  CloseElement,
  SetAttribute,
  AppendText,
  AppendComment,
  AppendHTML,
}

type OpSize = 0 | 1 | 2 | 3;

function withSize(opcode: ConstructionOperation, size: number): number {
  return (opcode << 3) | size;
}

function sizeof(opcode: number): OpSize {
  return (opcode & 0b11) as OpSize;
}

function opcodeof(opcode: number): ConstructionOperation {
  return opcode >> 3;
}

export class Constants {
  private strings: string[] = [];
  private set = dict<number>();

  get(s: string): number {
    let index = this.set[s];

    if (index === undefined) {
      index = this.strings.length;
      this.strings.push(s);
      this.set[s] = index;
    }

    return index;
  }

  all(): ReadonlyArray<string> {
    return this.strings;
  }
}

export class OperationsBuilder {
  private token = 0;

  constructor(private ops: number[], private constants: Constants = new Constants()) {}

  finish(): { ops: ReadonlyArray<number>; constants: ReadonlyArray<string> } {
    return {
      ops: this.ops,
      constants: this.constants.all(),
    };
  }

  openElement(name: string, ns: Namespace = NS_HTML): NodeToken {
    const nameConst = this.constants.get(name);
    const nsConst = this.constants.get(ns);

    this.ops.push(withSize(ConstructionOperation.OpenElement, 2), nameConst, nsConst);
    return this.token++;
  }

  closeElement() {
    this.ops.push(withSize(ConstructionOperation.CloseElement, 0));
  }

  setAttribute(name: string, value: string, ns: Namespace = NS_HTML) {
    const nameConst = this.constants.get(name);
    const valueConst = this.constants.get(value);
    const nsConst = this.constants.get(ns);

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
  readonly document: SimpleDocument;
  readonly nextSibling: Option<SimpleNode>;
  readonly elements: Parent[]; // mutable
  readonly tokens: NodeTokensImpl;

  parent: Parent;
  constants: ReadonlyArray<string>;
  constructing: Option<SimpleElement>;
}

export type Parent = SimpleElement | SimpleDocumentFragment;

export interface RunOptions {
  document: SimpleDocument;
  parent: Parent;
  nextSibling: Option<SimpleNode>;
  constants: ReadonlyArray<string>;
}

export function run(opcodes: ReadonlyArray<number>, options: RunOptions) {
  let offset = 0;
  const end = opcodes.length;
  const tokens = new NodeTokensImpl();

  tokens.register(options.parent);

  const state: ConstructionState = assign({}, options, {
    elements: [options.parent],
    constructing: null,
    tokens,
  });

  while (offset < end) {
    const value = opcodes[offset]!;
    const size = sizeof(value);
    const opcode = opcodeof(value);

    const func = ConstructionOperations[opcode]!;

    switch (size) {
      case 0:
        func(state);
        break;
      case 1:
        func(state, opcodes[offset + 1]!);
        break;
      case 2:
        func(state, opcodes[offset + 1]!, opcodes[offset + 2]!);
        break;
      case 3:
        func(state, opcodes[offset + 1]!, opcodes[offset + 2]!, opcodes[offset + 3]!);
        break;
    }

    offset += size + 1;
  }

  return tokens;
}

type ConstructionFunction = (state: ConstructionState, ...args: number[]) => void;

const ConstructionOperations: ConstructionFunction[] = [
  /* (OpenElement tag namespace) */
  (state, tag, namespace) => {
    const { constants, document } = state;

    if (state.constructing) flush(state);

    const el = document.createElementNS(constants[namespace] as ElementNamespace, constants[tag]!);
    state.constructing = el;
    state.tokens.register(el);
  },

  /* (CloseElement) */
  (state) => {
    if (state.constructing) flush(state);
    state.elements.pop();
    state.parent = state.elements[state.elements.length - 1]!;
  },

  /* (SetAttribute name value namespace) */
  (state, name, value, namespace) => {
    const { constants, constructing } = state;

    assert(
      constructing !== null,
      'SetAttribute can only be invoked when an element is being constructed'
    );

    constructing.setAttributeNS(
      constants[namespace] as AttrNamespace,
      constants[name]!,
      constants[value]!
    );
  },

  /* (AppendText text) */
  (state, text) => {
    const { constants, document, parent, nextSibling, constructing } = state;

    const parentElement = constructing ? flush(state) : parent;
    const textNode = document.createTextNode(constants[text]!);
    parentElement.insertBefore(textNode, nextSibling);
    state.tokens.register(textNode);
  },

  /* (AppendComment text) */
  (state, text) => {
    const { constants, document, parent, nextSibling } = state;
    const parentElement = state.constructing ? flush(state) : parent;
    const commentNode = document.createComment(constants[text]!);
    parentElement.insertBefore(commentNode, nextSibling);
    state.tokens.register(commentNode);
  },

  /* (AppendHTML text) */
  (_state, _text) => {
    throw new Error('unimplemented');
  },
];

function flush(state: ConstructionState): SimpleElement {
  const { constructing, nextSibling, elements } = state;
  state.parent.insertBefore(constructing!, nextSibling);
  state.constructing = null;
  state.parent = constructing!;
  elements.push(constructing!);

  return constructing!;
}
