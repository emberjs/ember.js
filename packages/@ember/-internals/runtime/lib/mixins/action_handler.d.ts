import { Mixin } from '@ember/-internals/metal';

export default class ActionHandler extends Mixin {
  actions?: Record<string, (...args: unknown[]) => void>;
  send(actionName: string, ...args: unknown[]): void;
}
