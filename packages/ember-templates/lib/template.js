import isEnabled from 'ember-metal/features';
import require, { has } from 'require';

let htmlbarsTemplate, glimmerTemplate;
if (has('ember-htmlbars')) {
  htmlbarsTemplate = require('ember-htmlbars').template;
}

if (has('ember-glimmer')) {
  glimmerTemplate = require('ember-glimmer').template;
}

let template = isEnabled('ember-glimmer') ? glimmerTemplate : htmlbarsTemplate;

export default template;
