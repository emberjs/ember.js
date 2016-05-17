import Ember from 'ember-metal/core'; // reexports
import {
  getTemplates,
  setTemplates
} from './template_registry';
import './bootstrap';
import { Renderer } from './renderer';
import Component from './component';
import Helper, { helper } from './helper';
import Checkbox from './components/checkbox';
import TextField from './components/text_field';
import TextArea from './components/text_area';
import LinkComponent from './components/link-to';

Ember._Renderer = Renderer;
Ember.Component = Component;
Helper.helper = helper;
Ember.Helper = Helper;
Ember.Checkbox = Checkbox;
Ember.TextField = TextField;
Ember.TextArea = TextArea;
Ember.LinkComponent = LinkComponent;

/**
  Global hash of shared templates. This will automatically be populated
  by the build tools so that you can store your Handlebars templates in
  separate files that get loaded into JavaScript at buildtime.

  @property TEMPLATES
  @for Ember
  @type Object
  @private
*/
Object.defineProperty(Ember, 'TEMPLATES', {
  get: getTemplates,
  set: setTemplates,
  configurable: false,
  enumerable: false
});

export default Ember;
