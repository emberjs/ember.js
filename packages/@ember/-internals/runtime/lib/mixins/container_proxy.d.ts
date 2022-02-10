import { Container } from '@ember/-internals/container';
import Mixin from '../../types/mixin';

interface ContainerProxy {
  ownerInjection: Container['ownerInjection'];
  lookup: Container['lookup'];
  factoryFor: Container['factoryFor'];
}
declare const ContainerProxy: Mixin;

export default ContainerProxy;
