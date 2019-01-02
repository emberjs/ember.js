import preRender from './states/pre_render';
import hasElement from './states/has_element';
import inDOM from './states/in_dom';
import destroying from './states/destroying';

/*
  Describe how the specified actions should behave in the various
  states that a view can exist in. Possible states:

  * preRender: when a view is first instantiated, and after its
    element was destroyed, it is in the preRender state
  * hasElement: the DOM representation of the view is created,
    and is ready to be inserted
  * inDOM: once a view has been inserted into the DOM it is in
    the inDOM state. A view spends the vast majority of its
    existence in this state.
  * destroyed: once a view has been destroyed (using the destroy
    method), it is in this state. No further actions can be invoked
    on a destroyed view.
*/
const states = Object.freeze({
  preRender,
  inDOM,
  hasElement,
  destroying,
});

export default states;
