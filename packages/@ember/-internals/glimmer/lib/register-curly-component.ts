import { setInternalComponentManager } from '@glimmer/manager/lib/internal/api';

import Component from './component';
import { CURLY_COMPONENT_MANAGER } from './component-managers/curly';

// We continue to use reopenClass here so that positionalParams can be overridden with reopenClass in subclasses.
Component.reopenClass({
  positionalParams: [],
});

setInternalComponentManager(CURLY_COMPONENT_MANAGER, Component);
