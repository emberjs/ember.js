import type { Arguments } from '../runtime';
import type { Capabilities } from './capabilities';

export interface ModifierCapabilitiesVersions {
  // passes factoryFor(...).class to `.createModifier`
  // uses args proxy, does not provide a way to opt-out
  '3.22': {
    disableAutoTracking?: boolean;
  };
}

export interface ModifierCapabilities extends Capabilities {
  disableAutoTracking: boolean;
}

export interface ModifierManager<ModifierStateBucket> {
  capabilities: ModifierCapabilities;
  createModifier(factory: unknown, args: Arguments): ModifierStateBucket;
  installModifier(instance: ModifierStateBucket, element: Element, args: Arguments): void;
  updateModifier(instance: ModifierStateBucket, args: Arguments): void;
  destroyModifier(instance: ModifierStateBucket, args: Arguments): void;
}
