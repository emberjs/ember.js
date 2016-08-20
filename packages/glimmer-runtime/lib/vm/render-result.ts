import { LinkedList } from 'glimmer-util';
import Environment from '../environment';
import { DestroyableBounds, clear } from '../bounds';
import UpdatingVM, { ExceptionHandler } from './update';
import { UpdatingOpcode } from '../opcodes';

interface RenderResultOptions {
  env: Environment;
  updating: LinkedList<UpdatingOpcode>;
  bounds: DestroyableBounds;
}

export default class RenderResult implements DestroyableBounds, ExceptionHandler {
  private env: Environment;
  private updating: LinkedList<UpdatingOpcode>;
  private bounds: DestroyableBounds;

  constructor({ env, updating, bounds } : RenderResultOptions) {
    this.env = env;
    this.updating = updating;
    this.bounds = bounds;
  }

  rerender({ alwaysRevalidate = false } = { alwaysRevalidate: false }) {
    let { env, updating } = this;
    let vm = new UpdatingVM(env, { alwaysRevalidate });
    vm.execute(updating, this);
  }

  parentElement() {
    return this.bounds.parentElement();
  }

  firstNode() {
    return this.bounds.firstNode();
  }

  lastNode() {
    return this.bounds.lastNode();
  }

  opcodes(): LinkedList<UpdatingOpcode> {
    return this.updating;
  }

  handleException() {
    throw "this should never happen";
  }

  destroy() {
    this.bounds.destroy();
    clear(this.bounds);
  }
}
