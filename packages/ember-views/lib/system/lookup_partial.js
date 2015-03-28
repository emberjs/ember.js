import Ember from "ember-metal/core"; // Ember.assert

export default function lookupPartial(view, templateName) {
  var nameParts = templateName.split("/");
  var lastPart = nameParts[nameParts.length - 1];

  nameParts[nameParts.length - 1] = "_" + lastPart;

  var underscoredName = nameParts.join('/');
  var template = view.templateForName(underscoredName);
  if (!template) {
    template = view.templateForName(templateName);
  }

  Ember.assert(
    'Unable to find partial with name "' + templateName + '"',
    !!template
  );

  return template;
}
