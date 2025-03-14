<% if (componentClass === '@glimmer/component') {%>import Component from '@glimmer/component';

<%= componentSignature %>
export default class <%= classifiedModuleName %> extends Component<<%= classifiedModuleName %>Signature> {
  <template>
    {{yield}}
  </template>
}<%} else {%>import type { TOC } from '@ember/component/template-only';

<%= componentSignature %>
<template>
  {{yield}}
</template> satisfies TOC<<%= classifiedModuleName %>Signature>;<%}%>
