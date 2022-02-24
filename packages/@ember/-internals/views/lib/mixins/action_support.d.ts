import Mixin from '@ember/object/mixin';

interface ActionSupport {
  send(actionName: string, ...args: unknown[]): void;
}
declare const ActionSupport: Mixin;

export default ActionSupport;
