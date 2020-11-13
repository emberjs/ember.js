import { SimpleElement } from '@simple-dom/interface';
import { Arguments } from '../runtime';
import { Capabilities } from './capabilities';

export interface ModifierCapabilitiesVersions {
  '3.13': {
    disableAutoTracking?: boolean;
  };

  // passes factoryFor(...).class to `.createModifier`
  // uses args proxy, does not provide a way to opt-out
  '3.22': {
    disableAutoTracking?: boolean;
  };
}

export interface ModifierCapabilities extends Capabilities {
  disableAutoTracking: boolean;
  useArgsProxy: boolean;
  passFactoryToCreate: boolean;
}

export interface ModifierManager<ModifierStateBucket> {
  capabilities: ModifierCapabilities;
  createModifier(factory: unknown, args: Arguments): ModifierStateBucket;
  installModifier(instance: ModifierStateBucket, element: SimpleElement, args: Arguments): void;
  updateModifier(instance: ModifierStateBucket, args: Arguments): void;
  destroyModifier(instance: ModifierStateBucket, args: Arguments): void;
}
