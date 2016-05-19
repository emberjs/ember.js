import DEFAULT_PLUGINS from '../plugins';
import assign from 'ember-metal/assign';

export default function compileOptions() {
  return assign({}, {
    plugins: {
      ast: [...DEFAULT_PLUGINS]
    }
  });
}
