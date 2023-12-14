declare module '@ember/-internals/views/lib/system/utils' {
  import type { View } from '@ember/-internals/glimmer/lib/renderer';
  import type { InternalOwner } from '@ember/-internals/owner';
  import type { Dict } from '@glimmer/interfaces';
  import type { Nullable } from '@ember/-internals/utility-types';
  /**
    @module ember
    */
  export function isSimpleClick(event: Event): boolean;
  export function constructStyleDeprecationMessage(affectedStyle: string): string;
  /**
      @private
      @method getRootViews
      @param {Object} owner
    */
  export function getRootViews(owner: InternalOwner): View[];
  /**
      @private
      @method getViewId
      @param {Ember.View} view
     */
  export function getViewId(view: View): string;
  export function getElementView(element: Element): Nullable<View>;
  /**
      @private
      @method getViewElement
      @param {Ember.View} view
     */
  export function getViewElement(view: View): Nullable<Element>;
  export function setElementView(element: Element, view: View): void;
  export function setViewElement(view: View, element: Element): void;
  export function clearElementView(element: Element): void;
  export function clearViewElement(view: View): void;
  /**
      @private
      @method getChildViews
      @param {Ember.View} view
    */
  export function getChildViews(view: View): View[];
  export function initChildViews(view: View): Set<string>;
  export function addChildView(parent: View, child: View): void;
  export function collectChildViews(view: View, registry: Dict<View>): View[];
  /**
      @private
      @method getViewBounds
      @param {Ember.View} view
    */
  export function getViewBounds(view: View): {
    parentElement: import('@glimmer/interfaces').SimpleElement;
    firstNode: import('@glimmer/interfaces').SimpleNode;
    lastNode: import('@glimmer/interfaces').SimpleNode;
  };
  /**
      @private
      @method getViewRange
      @param {Ember.View} view
    */
  export function getViewRange(view: View): Range;
  /**
      `getViewClientRects` provides information about the position of the border
      box edges of a view relative to the viewport.

      It is only intended to be used by development tools like the Ember Inspector
      and may not work on older browsers.

      @private
      @method getViewClientRects
      @param {Ember.View} view
    */
  export function getViewClientRects(view: View): DOMRectList;
  /**
      `getViewBoundingClientRect` provides information about the position of the
      bounding border box edges of a view relative to the viewport.

      It is only intended to be used by development tools like the Ember Inspector
      and may not work on older browsers.

      @private
      @method getViewBoundingClientRect
      @param {Ember.View} view
    */
  export function getViewBoundingClientRect(view: View): ClientRect | DOMRect;
  /**
      Determines if the element matches the specified selector.

      @private
      @method matches
      @param {DOMElement} el
      @param {String} selector
    */
  export const elMatches: typeof Element.prototype.matches | undefined;
  export function matches(el: Element, selector: string): boolean;
  export function contains(a: Node, b: Node): boolean;
}
