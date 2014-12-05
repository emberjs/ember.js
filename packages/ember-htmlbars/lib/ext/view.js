import EmberView from "ember-views/views/view";
import helpers from "ember-htmlbars/helpers";

EmberView.reopen({
  mergedProperties: ['helpers'],
  helpers: helpers
});
