<% if (componentClass === '@glimmer/component') {%>import Component from '@glimmer/component';

export default class <%= classifiedModuleName %> extends Component {
  <template>
    {{yield}}
  </template>
}<%} else {%><template>
  {{yield}}
</template><%}%>
