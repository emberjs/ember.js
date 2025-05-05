import type { TOC } from '@ember/component/template-only';
<% if (addTitle) {%>import { pageTitle } from 'ember-page-title';<%}%>

interface <%= routeName %>Signature {
  Args: {
    model: unknown;
    controller: unknown;
  };
}

<template>
  <% if (addTitle) {%>{{pageTitle "<%= routeName %>"}}
  <%}%>{{outlet}}
</template> satisfies TOC<<%= routeName %>Signature>;
