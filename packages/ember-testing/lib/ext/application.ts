import EmberApplication from '@ember/application';
import type Application from '@ember/application';

export interface TestableApp extends Application {
  testing?: boolean;
}

EmberApplication.reopen({
  /**
  This property indicates whether or not this application is currently in
  testing mode. 
   
  @property testing
  @type {Boolean}
  @default false
  @since 1.3.0
  @public
  */
  testing: false,
});
