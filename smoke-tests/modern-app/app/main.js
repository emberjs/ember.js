// Boot entry. `decorator-transforms/globals` installs the `dt7948` global that
// the gxt compiler's decorator pass emits for `.gjs` class fields (it uses the
// globals runtime, unlike the root babel pass which imports the runtime
// module). Imported in every variant so the app source is identical.
import 'decorator-transforms/globals';
import App from './app.js';
import config from './config/environment.js';

App.create(config.APP);
