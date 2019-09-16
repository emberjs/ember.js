// @ts-check

import { DEBUG } from '@glimmer/env';

export interface DebugStack {
  push(name: string): void;
  pushEngine(name: string): void;
  pop(): string | void;
  peek(): string | void;
}

let getDebugStack: () => DebugStack = () => {
  throw new Error("Can't access the DebugStack class outside of debug mode");
};

if (DEBUG) {
  class Element {
    constructor(public name: string) {}
  }

  class TemplateElement extends Element {}
  class EngineElement extends Element {}

  let DebugStackImpl = class DebugStackImpl implements DebugStack {
    private _stack: TemplateElement[] = [];

    push(name: string) {
      this._stack.push(new TemplateElement(name));
    }

    pushEngine(name: string) {
      this._stack.push(new EngineElement(name));
    }

    pop(): string | void {
      let element = this._stack.pop();

      if (element) {
        return element.name;
      }
    }

    peek(): string | void {
      let template = this._currentTemplate();
      let engine = this._currentEngine();

      if (engine) {
        return `"${template}" (in "${engine}")`;
      } else if (template) {
        return `"${template}"`;
      }
    }

    _currentTemplate() {
      return this._getCurrentByType(TemplateElement);
    }

    _currentEngine() {
      return this._getCurrentByType(EngineElement);
    }

    _getCurrentByType(type: any): string | void {
      for (let i = this._stack.length; i >= 0; i--) {
        let element = this._stack[i];
        if (element instanceof type) {
          return element.name;
        }
      }
    }
  };

  getDebugStack = () => new DebugStackImpl();
}

export default getDebugStack;
