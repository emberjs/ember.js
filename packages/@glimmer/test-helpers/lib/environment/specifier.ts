import { LookupType } from './registry';

export default interface TestSpecifier<T extends LookupType = LookupType> {
  type: T;
  name: string;
}
