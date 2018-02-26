import { context } from 'ember-environment';

/**
@module ember
*/

/**
  This namespace contains all Ember methods and functions. Future versions of
  Ember may overwrite this namespace and therefore, you should avoid adding any
  new properties.

  At the heart of Ember is Ember-Runtime, a set of core functions that provide
  cross-platform compatibility and object property observing.  Ember-Runtime is
  small and performance-focused so you can use it alongside other
  cross-platform libraries such as jQuery. For more details, see
  [Ember-Runtime](https://emberjs.com/api/modules/ember-runtime.html).

  @class Ember
  @static
  @public
*/
const Ember = (typeof context.imports.Ember === 'object' && context.imports.Ember) || {};

// Make sure these are set whether Ember was already defined or not
Ember.isNamespace = true;
Ember.toString = function() { return 'Ember'; };

// ..........................................................
// BOOTSTRAP
//

export default Ember;
