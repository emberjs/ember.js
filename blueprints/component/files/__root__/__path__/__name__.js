import Ember from 'ember';
<%= importTemplate %>
<% if (posParams) { %>const Component = <% } else { %> export default <% } %>Ember.Component.extend({<%= contents %>
});

<% if (posParams) { %>
Component.reopenClass({
  positionalParams: []
});

export default Component;
<% } %>
