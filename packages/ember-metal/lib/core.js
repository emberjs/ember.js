import { context } from 'ember-environment';

const Ember = (typeof context.imports.Ember === 'object' && context.imports.Ember) || {};

// Make sure these are set whether Ember was already defined or not
Ember.isNamespace = true;
Ember.toString = function() { return 'Ember'; };

// ..........................................................
// BOOTSTRAP
//

export default Ember;
