import Service from '@ember/service';

export default class <%= classifiedModuleName %>Service extends Service {}

// Don't remove this declaration: this is what enables TypeScript to resolve
// this service using `Owner.lookup('service:<%= dasherizedModuleName %>')`, as well
// as to check when you pass the service name as an argument to the decorator,
// like `@service('<%= dasherizedModuleName %>') declare altName: <%= classifiedModuleName %>Service;`.
declare module '@ember/service' {
  interface Registry {
    '<%= dasherizedModuleName %>': <%= classifiedModuleName %>Service;
  }
}
