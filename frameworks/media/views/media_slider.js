// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals SC */

/**
 * @class
 * 
 * The MediaSlider element takes the original SC.SliderView and adds an
 * indicator of which ranges of the media have been loaded.
 * 
 * @extends SC.SliderView
 */
SC.MediaSlider = SC.SliderView.extend(
/** @scope SC.MediaSlider.prototype */
{
  /**
   * The media view which this slider should attach itself to.
   */
  // TODO: Deprecate, bind to loadedTimeRanges instead.
  mediaView: null,
  
  /**
   * The name of our render delegate
   */
  renderDelegateName: 'mediaSliderRenderDelegate',
  
  /**
   * @private
   * 
   * Appends a loaded ranges span to the div element.
   * 
   * @param context
   * @param firstTime
   */
  render: function(context, firstTime) {
    sc_super();
    
    // Render the loaded time ranges.
    this.renderLoadedTimeRanges();
  },
  
  renderLoadedTimeRanges: function() {
    var ranges = this.getPath('mediaView.loadedTimeRanges');
    var rangesElement = this.$('.sc-loaded-ranges');
    var max = this.get('maximum');
    // TODO: Remove support for mediaView, simply bind to loadedTimeRanges.
    
    // Read the ranges element, kick out if it doesn't exist yet.
    if(SC.empty(rangesElement)) {
      return;
    }
    // Scrub all children.
    rangesElement.empty(".sc-loaded-range");
    
    // If there are no ranges, exit.
    if(SC.empty(ranges)) {
      return;
    }
    
    var width = rangesElement.width();
    for( var i = 0; i < ranges.length; i += 2) {
      try {
        // Ranges are reported as an array of numbers. Odds are start indexes,
        // evens are end indexes of the previous start index.
        var startRange = ranges[i];
        var endRange = ranges[i + 1];
        
        var pixelLeft = width * (startRange / max);
        var pixelWidth = width * ((endRange - startRange) / max);
        
        var tag = $('<span class="sc-loaded-range" />');
        tag.css('left', pixelLeft);
        tag.css('width', pixelWidth);
        
        rangesElement.append(tag);
        
      } catch(e) {
      }
    }
  }.observes('*mediaView.loadedTimeRanges'),
});
