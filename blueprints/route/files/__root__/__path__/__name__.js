import Route from '@ember/routing/route';

export default Route.extend({<% if (hasDynamicSegment) {%>
  model(params) {
    /**
     * This route was generated with a dynamic segment. Implement data loading
     * based on that dynamic segment here in the model hook.
     */
    return params;
  },<%}%>
});
