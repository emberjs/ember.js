// @ts-check

import { DEBUG } from 'ember-env-flags';

let DebugStack;

if (DEBUG) {
  class Element {
    constructor(public name: string) {
    }
  }

  class TemplateElement extends Element { }
  class EngineElement extends Element { }

  DebugStack = class DebugStack {
    private _stack: TemplateElement[] = [];

    push(name) {
      this._stack.push(new TemplateElement(name));
    }

    pushEngine(name) {
      this._stack.push(new EngineElement(name));
    }

    pop() {
      let element = this._stack.pop();

      if (element) {
        return element.name;
      }
    }

    peek() {
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

    _getCurrentByType(type) {
      for (let i = this._stack.length; i >= 0; i--) {
        let element = this._stack[i];
        if (element instanceof type) {
          return element.name;
        }
      }
    }
  };
}

export default DebugStack;
