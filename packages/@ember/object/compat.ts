import { dependentKeyCompat as internalDependentKeyCompat } from './lib/dependent-key-compat';

export const dependentKeyCompat = (
  import.meta.env?.EMBER_DROP_CLASSIC_FEATURES ? undefined : internalDependentKeyCompat
) as typeof internalDependentKeyCompat;
