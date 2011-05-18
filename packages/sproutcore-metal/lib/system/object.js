// ==========================================================================
// Project:   SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('sproutcore-metal/system/core_object');
require('sproutcore-metal/system/set');



SC.CoreObject.subclasses = new SC.Set();
SC.Object = SC.CoreObject.extend(); // allows Observable to be added.



