import { Mixin } from '@ember/-internals/metal';

export default class ActionHandler extends Mixin {
  actions?: Record<string, (...args: any[]) => unknown>;
  send(actionName: string, ...args: unknown[]): void;
}
