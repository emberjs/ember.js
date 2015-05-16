import InspectedNode from 'ember-extension-support/models/inspected_node';
import $ from 'ember-views/system/jquery';

/**
  Returns the top level node in an application.
  The returned object will be an `InspectedNode` instance
  which will wrap the htmlbars `renderNode`.

  @public
  @param  {Ember.Application} application
  @return {InspectedNode} The top level node
 */
export function getTopLevelNode(application) {
  let topViewId = $(application.rootElement).find('> .ember-view').attr('id');
  let rootView = application.__container__.lookup('-view-registry:main')[topViewId];
  if (rootView) {
    return new InspectedNode(rootView._renderNode);
  }
}
