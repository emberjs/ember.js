import { Destroyable, LinkedList } from 'glimmer-util';
import Environment from '../environment';
import { Bounds, clear } from '../bounds';
import UpdatingVM, { ExceptionHandler } from './update';
import { UpdatingOpcode } from '../opcodes';

interface RenderResultOptions {
  env: Environment;
  updating: LinkedList<UpdatingOpcode>;
  bounds: Bounds & Destroyable;
}

export default class RenderResult implements Bounds, Destroyable, ExceptionHandler {
  private env: Environment;
  private updating: LinkedList<UpdatingOpcode>;
  private bounds: Bounds & Destroyable;

  constructor({ env, updating, bounds } : RenderResultOptions) {
    this.env = env;
    this.updating = updating;
    this.bounds = bounds;
  }

  rerender() {
    let { env, updating } = this;

    env.begin();

    let vm = new UpdatingVM(env);

    vm.execute(updating, this);

    env.commit();
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
