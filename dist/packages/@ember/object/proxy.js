/**
@module @ember/object/proxy
*/
import { FrameworkObject } from '@ember/object/-internals';
import { _ProxyMixin } from '@ember/-internals/runtime';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
class ObjectProxy extends FrameworkObject {}
ObjectProxy.PrototypeMixin.reopen(_ProxyMixin);
export default ObjectProxy;