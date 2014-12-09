import "ember-routing-handlebars";

import { outletHelper } from "ember-routing-handlebars/helpers/outlet";
import { renderHelper } from "ember-routing-handlebars/helpers/render";
import { actionHelper } from "ember-routing-handlebars/helpers/action";
import {
  linkToHelper,
  deprecatedLinkToHelper
} from "ember-routing-handlebars/helpers/link_to";
import { queryParamsHelper } from "ember-routing-handlebars/helpers/query_params";

QUnit.module("ember-routing-views");

test("exports correctly", function() {
  ok(outletHelper);
  ok(renderHelper);
  ok(actionHelper);
  ok(linkToHelper);
  ok(deprecatedLinkToHelper);
  ok(queryParamsHelper);
});
