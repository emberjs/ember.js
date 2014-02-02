// ==========================================================================
// Project:   Media Examples - A Media Playback sandbox.
// Copyright: ©2012 Michael Krotscheck and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals MediaExamples */

/**
 *
 * A small demonstration app that shows different ways of consuming media. Also
 * a convenient testbed for those of us who are working on improving the media
 * framework.
 *
 * @extends SC.Object
 * @author Michael Krotscheck
 */
MediaExamples = SC.Application.create(
/** @scope MediaExamples.prototype */
{

  NAMESPACE: 'MediaExamples',
  VERSION: '0.1.0',

  init: function() {
    sc_super();
    SC.ready(function() {
      MediaExamples.main();
    });
  },

  main: function() {
    this.getPath('mainPage.mainPane').append();
  }
});
