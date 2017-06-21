import { Option, LinkedList } from '@glimmer/util';
import Environment, { Program } from '../environment';
import { DestroyableBounds, clear } from '../bounds';
import UpdatingVM, { ExceptionHandler } from './update';
import { UpdatingOpcode } from '../opcodes';
import { Simple } from '@glimmer/interfaces';

export default class RenderResult implements DestroyableBounds, ExceptionHandler {
  constructor(
    private env: Environment,
    private program: Program,
    private updating: LinkedList<UpdatingOpcode>,
    private bounds: DestroyableBounds
  ) {}

  rerender({ alwaysRevalidate = false } = { alwaysRevalidate: false }) {
    let { env, program, updating } = this;
    let vm = new UpdatingVM(env, program, { alwaysRevalidate });
    vm.execute(updating, this);
  }

  parentElement(): Simple.Element {
    return this.bounds.parentElement();
  }

  firstNode(): Option<Simple.Node> {
    return this.bounds.firstNode();
  }

  lastNode(): Option<Simple.Node> {
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
