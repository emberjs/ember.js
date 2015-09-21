import { Environment, DOMHelper } from "htmlbars-runtime";
import { Meta } from "htmlbars-reference";

export class TestEnvironment extends Environment {
  private helpers={};
  
  constructor(doc: HTMLDocument=document) {
    super(new DOMHelper(doc), Meta);
  }

  registerHelper(name, helper) {
    this.helpers[name] = helper;
  }

  hasHelper(scope, helperName) {
    return helperName.length === 1 && helperName[0] in this.helpers;
  }

  lookupHelper(scope, helperName) {
    return this.helpers[helperName[0]];
  }
}