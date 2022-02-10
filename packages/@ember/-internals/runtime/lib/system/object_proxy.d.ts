import FrameworkObject from './object';
import _ProxyMixin from '../mixins/-proxy';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface ObjectProxy extends _ProxyMixin {}
declare class ObjectProxy extends FrameworkObject {}

export default ObjectProxy;
