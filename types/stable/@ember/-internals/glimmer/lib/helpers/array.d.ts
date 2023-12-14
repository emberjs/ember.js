declare module '@ember/-internals/glimmer/lib/helpers/array' {
  /**
    @module ember
    */
  /**
       Use the `{{array}}` helper to create an array to pass as an option to your
       components.

       ```handlebars
       <MyComponent @people={{array
         'Tom Dale'
         'Yehuda Katz'
         this.myOtherPerson}}
       />
       ```
        or
       ```handlebars
       {{my-component people=(array
         'Tom Dale'
         'Yehuda Katz'
         this.myOtherPerson)
       }}
       ```

       Would result in an object such as:

       ```js
       ['Tom Dale', 'Yehuda Katz', this.get('myOtherPerson')]
       ```

       Where the 3rd item in the array is bound to updates of the `myOtherPerson` property.

       @method array
       @for @ember/helper
       @param {Array} options
       @return {Array} Array
       @since 3.8.0
       @public
     */
  export {};
}
