import { setInternalComponentManager } from '@glimmer/manager/lib/internal/api';

import Component from './component';
import { CURLY_COMPONENT_MANAGER } from './component-managers/curly';

Component.reopenClass({
  positionalParams: [],
});

setInternalComponentManager(CURLY_COMPONENT_MANAGER, Component);
