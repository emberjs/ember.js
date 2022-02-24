import Mixin from '@ember/object/mixin';

interface TargetActionSupport {
  target: unknown;
  action: unknown;
  actionContext: unknown;
  actionContextObject: unknown;
  triggerAction(opts?: object): unknown;
}
declare const TargetActionSupport: Mixin;

export default TargetActionSupport;
