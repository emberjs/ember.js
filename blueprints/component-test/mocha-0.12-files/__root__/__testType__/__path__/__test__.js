import { expect } from 'chai';
import { describe, it } from 'mocha';
import { setupComponentTest } from 'ember-mocha';<% if (testType === 'integration') { %>
import hbs from 'htmlbars-inline-precompile';<% } %>

describe('<%= friendlyTestDescription %>', function() {
  setupComponentTest('<%= componentPathName %>', {
    <% if (testType === 'integration' ) { %>integration: true<% } else if(testType === 'unit') { %>// Specify the other units that are required for this test
    // needs: ['component:foo', 'helper:bar'],
    unit: true<% } %>
  });

  it('renders', function() {
    <% if (testType === 'integration' ) { %>// Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.on('myAction', function(val) { ... });
    // Template block usage:
    // this.render(hbs`
    //   {{#<%= dasherizedModuleName %>}}
    //     template content
    //   {{/<%= dasherizedModuleName %>}}
    // `);

    this.render(hbs`{{<%= dasherizedModuleName %>}}`);
    expect(this.$()).to.have.length(1);<% } else if(testType === 'unit') { %>// creates the component instance
    let component = this.subject();
    // renders the component on the page
    this.render();
    expect(component).to.be.ok;
    expect(this.$()).to.have.length(1);<% } %>
  });
});
