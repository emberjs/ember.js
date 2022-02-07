import Mixin from '@ember/object/mixin';

interface ViewStateSupport {
  _transitionTo(state: unknown): void;
}
declare const ViewStateSupport: Mixin;

export default ViewStateSupport;
