// Loose-mode flavor of the same app: identical router/routes/services/helper/
// modifier (imported from ../app), but templates are resolver-mode
// `precompileTemplate` strings (wire-format precompiled at build time on
// classic; compiled at RUNTIME by the gxt-backend's @ember/template-compilation
// shim on gxt) and components/helpers/modifiers are resolved by name.
import App from './app.js';
import config from '../app/config/environment.js';

App.create(config.APP);
