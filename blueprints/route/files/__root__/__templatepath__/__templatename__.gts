<% if (addTitle) {%>import { pageTitle } from 'ember-page-title';

<%}%><template>
  <% if (addTitle) {%>{{pageTitle "<%= routeName %>"}}
  <%}%>{{outlet}}
</template>
