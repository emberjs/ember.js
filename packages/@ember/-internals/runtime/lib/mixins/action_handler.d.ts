import { Mixin } from '@ember/-internals/metal';

interface ActionHandler {
  actions?: Record<string, (...args: any[]) => unknown>;
  send(actionName: string, ...args: unknown[]): void;
}
declare const ActionHandler: Mixin;

export default ActionHandler;
