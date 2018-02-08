import { Option, LinkedList } from '@glimmer/util';
import Environment from '../environment';
import { DestroyableBounds, clear } from '../bounds';
import UpdatingVM, { ExceptionHandler } from './update';
import { UpdatingOpcode } from '../opcodes';
import { Simple, Opaque } from '@glimmer/interfaces';
import { RuntimeProgram } from "./append";

export default class RenderResult<T = Opaque> implements DestroyableBounds, ExceptionHandler {
  constructor(
    public env: Environment,
    private program: RuntimeProgram<T>,
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

  handleException() {
    throw "this should never happen";
  }

  destroy() {
    this.bounds.destroy();
    clear(this.bounds);
  }
}
