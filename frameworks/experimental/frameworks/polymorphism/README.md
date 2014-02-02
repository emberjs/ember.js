Polymorphism Framework
======================
 
This framework adds subtype polymorphism support to SC.Record relationships and
SC.Store\#find.


## Using the Framework

In order to use the polymorphism for your record type, you need to set
the `isPolymorphic` property:

    MyApp.SomeRecord = SC.Record.extend({
      // your code here
    });
    MyApp.SomeRecord.isPolymorphic = YES;


## Example

    YourApp.Person = SC.Record.extend();
    YourApp.Person.isPolymorphic = YES;

    YourApp.Male = YourApp.Person.extend({
      isMale: YES
    });

    YourApp.Female = YourApp.Person.extend({
      isFemale: YES
    });
    
    YourApp.store.createRecord(YourApp.Male, {
      guid: '1'
    });
    
    YourApp.store.createRecord(YourApp.Female, {
      guid: '2'
    });
    
    // SC.Store#find now returns records of the expected type
    SC.Logger.log(SC.kindOf(YourApp.store.find(YourApp.Person, '1'), YourApp.Male)); // true
    SC.Logger.log(SC.kindOf(YourApp.store.find(YourApp.Person, '2'), YourApp.Female)); // true

## Contributors

- Colin Campbell (<colin@sproutcore.com>)
- Tyler Keating (<tyler@sproutcore.com>)