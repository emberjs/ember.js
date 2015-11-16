// STATE within a module is frowned apon, this exists
// to support Ember.TEMPLATES but shield ember internals from this legacy
// global API
let TEMPLATES = {};

export function setTemplates(templates) {
  TEMPLATES = templates;
}

export function getTemplates() {
  return TEMPLATES;
}

export function get(name) {
  if (TEMPLATES.hasOwnProperty(name)) {
    return TEMPLATES[name];
  }
}

export function has(name) {
  return TEMPLATES.hasOwnProperty(name);
}

export function set(name, template) {
  return TEMPLATES[name] = template;
}
