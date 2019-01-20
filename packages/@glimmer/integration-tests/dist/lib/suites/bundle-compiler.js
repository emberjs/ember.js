var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { EmberishComponentTests } from './emberish-components';
import { test } from '../test-decorator';
import { EmberishGlimmerComponent } from '../components/emberish-glimmer';
export class BundleCompilerEmberTests extends EmberishComponentTests {
    'should not serialize the locator with static component helpers'() {
        this.registerComponent('Glimmer', 'A', '{{component "B" foo=@bar}} {{component "B" foo=2}} {{component "B" foo=3}}');
        this.registerComponent('Glimmer', 'B', 'B {{@foo}}');
        this.render('<A @bar={{1}} /> {{component "B" foo=4}}');
        let ALocator = JSON.stringify({ locator: { module: 'ui/components/A', name: 'default' } });
        let MainLocator = JSON.stringify({
            locator: { module: 'ui/components/main', name: 'default' },
        });
        let { strings } = this.delegate.getConstants();
        this.assert.equal(strings.indexOf(ALocator), -1);
        this.assert.equal(strings.indexOf(MainLocator), -1);
        this.assertHTML('B 1 B 2 B 3 B 4');
        this.assertStableRerender();
    }
    'should not serialize if there are no args'() {
        class B extends EmberishGlimmerComponent {
            constructor() {
                super(...arguments);
                this.bar = 1;
            }
        }
        this.registerComponent('Glimmer', 'A', '{{component "B"}}');
        this.registerComponent('Glimmer', 'B', 'B {{bar}}', B);
        this.render('<A /> {{component "B"}}');
        let ALocator = JSON.stringify({ locator: { module: 'ui/components/A', name: 'default' } });
        let MainLocator = JSON.stringify({
            locator: { module: 'ui/components/main', name: 'default' },
        });
        let { strings } = this.delegate.constants.toPool();
        this.assert.equal(strings.indexOf(ALocator), -1);
        this.assert.equal(strings.indexOf(MainLocator), -1);
        this.assertHTML('B 1 B 1');
        this.assertStableRerender();
    }
    'should serialize the locator with dynamic component helpers'() {
        this.registerComponent('Glimmer', 'A', '{{component @B foo=@bar}}');
        this.registerComponent('Glimmer', 'B', 'B {{@foo}}');
        this.render('<A @bar={{1}} @B={{name}} />', { name: 'B' });
        let ALocator = JSON.stringify({ locator: { module: 'ui/components/A', name: 'default' } });
        let MainLocator = JSON.stringify({
            locator: { module: 'ui/components/main', name: 'default' },
        });
        let { strings } = this.delegate.constants.toPool();
        this.assert.ok(strings.indexOf(ALocator) > -1, 'Has locator for "A"');
        this.assert.equal(strings.indexOf(MainLocator), -1);
        this.assertHTML('B 1');
        this.assertStableRerender();
    }
}
__decorate([
    test({ kind: 'glimmer' })
], BundleCompilerEmberTests.prototype, "should not serialize the locator with static component helpers", null);
__decorate([
    test({ kind: 'glimmer' })
], BundleCompilerEmberTests.prototype, "should not serialize if there are no args", null);
__decorate([
    test({ kind: 'glimmer' })
], BundleCompilerEmberTests.prototype, "should serialize the locator with dynamic component helpers", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVuZGxlLWNvbXBpbGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vbGliL3N1aXRlcy9idW5kbGUtY29tcGlsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFFL0QsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQ3pDLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRTFFLE1BQU0sT0FBTyx3QkFBeUIsU0FBUSxzQkFBc0I7SUFJbEUsZ0VBQWdFO1FBQzlELElBQUksQ0FBQyxpQkFBaUIsQ0FDcEIsU0FBUyxFQUNULEdBQUcsRUFDSCw0RUFBNEUsQ0FDN0UsQ0FBQztRQUNGLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLEVBQUUsR0FBRyxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBQ3JELElBQUksQ0FBQyxNQUFNLENBQUMsMENBQTBDLENBQUMsQ0FBQztRQUN4RCxJQUFJLFFBQVEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsT0FBTyxFQUFFLEVBQUUsTUFBTSxFQUFFLGlCQUFpQixFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDM0YsSUFBSSxXQUFXLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQztZQUMvQixPQUFPLEVBQUUsRUFBRSxNQUFNLEVBQUUsb0JBQW9CLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRTtTQUMzRCxDQUFDLENBQUM7UUFDSCxJQUFJLEVBQUUsT0FBTyxFQUFFLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUMvQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDakQsSUFBSSxDQUFD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Q0FBQztJQUM5QixDQUFDO0NBQ0Y7QUFyREM7SUFEQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLENBQUM7OEdBa0J6QjtBQUdEO0lBREMsSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxDQUFDO3lGQWlCekI7QUFHRDtJQURDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsQ0FBQzsyR0FjekIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBFbWJlcmlzaENvbXBvbmVudFRlc3RzIH0gZnJvbSAnLi9lbWJlcmlzaC1jb21wb25lbnRzJztcbmltcG9ydCB7IEFvdFJlbmRlckRlbGVnYXRlIH0gZnJvbSAnLi4vbW9kZXMvYW90L2RlbGVnYXRlJztcbmltcG9ydCB7IHRlc3QgfSBmcm9tICcuLi90ZXN0LWRlY29yYXRvcic7XG5pbXBvcnQgeyBFbWJlcmlzaEdsaW1tZXJDb21wb25lbnQgfSBmcm9tICcuLi9jb21wb25lbnRzL2VtYmVyaXNoLWdsaW1tZXInO1xuXG5leHBvcnQgY2xhc3MgQnVuZGxlQ29tcGlsZXJFbWJlclRlc3RzIGV4dGVuZHMgRW1iZXJpc2hDb21wb25lbnRUZXN0cyB7XG4gIHByb3RlY3RlZCBkZWxlZ2F0ZSE6IEFvdFJlbmRlckRlbGVnYXRlO1xuXG4gIEB0ZXN0KHsga2luZDogJ2dsaW1tZXInIH0pXG4gICdzaG91bGQgbm90IHNlcmlhbGl6ZSB0aGUgbG9jYXRvciB3aXRoIHN0YXRpYyBjb21wb25lbnQgaGVscGVycycoKSB7XG4gICAgdGhpcy5yZWdpc3RlckNvbXBvbmVudChcbiAgICAgICdHbGltbWVyJyxcbiAgICAgICdBJyxcbiAgICAgICd7e2NvbXBvbmVudCBcIkJcIiBmb289QGJhcn19IHt7Y29tcG9uZW50IFwiQlwiIGZvbz0yfX0ge3tjb21wb25lbnQgXCJCXCIgZm9vPTN9fSdcbiAgICApO1xuICAgIHRoaXMucmVnaXN0ZXJDb21wb25lbnQoJ0dsaW1tZXInLCAnQicsICdCIHt7QGZvb319Jyk7XG4gICAgdGhpcy5yZW5kZXIoJzxBIEBiYXI9e3sxfX0gLz4ge3tjb21wb25lbnQgXCJCXCIgZm9vPTR9fScpO1xuICAgIGxldCBBTG9jYXRvciA9IEpTT04uc3RyaW5naWZ5KHsgbG9jYXRvcjogeyBtb2R1bGU6ICd1aS9jb21wb25lbnRzL0EnLCBuYW1lOiAnZGVmYXVsdCcgfSB9KTtcbiAgICBsZXQgTWFpbkxvY2F0b3IgPSBKU09OLnN0cmluZ2lmeSh7XG4gICAgICBsb2NhdG9yOiB7IG1vZHVsZTogJ3VpL2NvbXBvbmVudHMvbWFpbicsIG5hbWU6ICdkZWZhdWx0JyB9LFxuICAgIH0pO1xuICAgIGxldCB7IHN0cmluZ3MgfSA9IHRoaXMuZGVsZWdhdGUuZ2V0Q29uc3RhbnRzKCk7XG4gICAgdGhpcy5hc3NlcnQuZXF1YWwoc3RyaW5ncy5pbmRleE9mKEFMb2NhdG9yKSwgLTEpO1xuICAgIHRoaXMuYXNzZXJ0LmVxdWFsKHN0cmluZ3MuaW5kZXhPZihNYWluTG9jYXRvciksIC0xKTtcbiAgICB0aGlzLmFzc2VydEhUTUwoJ0IgMSBCIDIgQiAzIEIgNCcpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxuXG4gIEB0ZXN0KHsga2luZDogJ2dsaW1tZXInIH0pXG4gICdzaG91bGQgbm90IHNlcmlhbGl6ZSBpZiB0aGVyZSBhcmUgbm8gYXJncycoKSB7XG4gICAgY2xhc3MgQiBleHRlbmRzIEVtYmVyaXNoR2xpbW1lckNvbXBvbmVudCB7XG4gICAgICBiYXIgPSAxO1xuICAgIH1cbiAgICB0aGlzLnJlZ2lzdGVyQ29tcG9uZW50KCdHbGltbWVyJywgJ0EnLCAne3tjb21wb25lbnQgXCJCXCJ9fScpO1xuICAgIHRoaXMucmVnaXN0ZXJDb21wb25lbnQoJ0dsaW1tZXInLCAnQicsICdCIHt7YmFyfX0nLCBCKTtcbiAgICB0aGlzLnJlbmRlcignPEEgLz4ge3tjb21wb25lbnQgXCJCXCJ9fScpO1xuICAgIGxldCBBTG9jYXRvciA9IEpTT04uc3RyaW5naWZ5KHsgbG9jYXRvcjogeyBtb2R1bGU6ICd1aS9jb21wb25lbnRzL0EnLCBuYW1lOiAnZGVmYXVsdCcgfSB9KTtcbiAgICBsZXQgTWFpbkxvY2F0b3IgPSBKU09OLnN0cmluZ2lmeSh7XG4gICAgICBsb2NhdG9yOiB7IG1vZHVsZTogJ3VpL2NvbXBvbmVudHMvbWFpbicsIG5hbWU6ICdkZWZhdWx0JyB9LFxuICAgIH0pO1xuICAgIGxldCB7IHN0cmluZ3MgfSA9IHRoaXMuZGVsZWdhdGUuY29uc3RhbnRzIS50b1Bvb2woKTtcbiAgICB0aGlzLmFzc2VydC5lcXVhbChzdHJpbmdzLmluZGV4T2YoQUxvY2F0b3IpLCAtMSk7XG4gICAgdGhpcy5hc3NlcnQuZXF1YWwoc3RyaW5ncy5pbmRleE9mKE1haW5Mb2NhdG9yKSwgLTEpO1xuICAgIHRoaXMuYXNzZXJ0SFRNTCgnQiAxIEIgMScpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxuXG4gIEB0ZXN0KHsga2luZDogJ2dsaW1tZXInIH0pXG4gICdzaG91bGQgc2VyaWFsaXplIHRoZSBsb2NhdG9yIHdpdGggZHluYW1pYyBjb21wb25lbnQgaGVscGVycycoKSB7XG4gICAgdGhpcy5yZWdpc3RlckNvbXBvbmVudCgnR2xpbW1lcicsICdBJywgJ3t7Y29tcG9uZW50IEBCIGZvbz1AYmFyfX0nKTtcbiAgICB0aGlzLnJlZ2lzdGVyQ29tcG9uZW50KCdHbGltbWVyJywgJ0InLCAnQiB7e0Bmb299fScpO1xuICAgIHRoaXMucmVuZGVyKCc8QSBAYmFyPXt7MX19IEBCPXt7bmFtZX19IC8+JywgeyBuYW1lOiAnQicgfSk7XG4gICAgbGV0IEFMb2NhdG9yID0gSlNPTi5zdHJpbmdpZnkoeyBsb2NhdG9yOiB7IG1vZHVsZTogJ3VpL2NvbXBvbmVudHMvQScsIG5hbWU6ICdkZWZhdWx0JyB9IH0pO1xuICAgIGxldCBNYWluTG9jYXRvciA9IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgIGxvY2F0b3I6IHsgbW9kdWxlOiAndWkvY29tcG9uZW50cy9tYWluJywgbmFtZTogJ2RlZmF1bHQnIH0sXG4gICAgfSk7XG4gICAgbGV0IHsgc3RyaW5ncyB9ID0gdGhpcy5kZWxlZ2F0ZS5jb25zdGFudHMhLnRvUG9vbCgpO1xuICAgIHRoaXMuYXNzZXJ0Lm9rKHN0cmluZ3MuaW5kZXhPZihBTG9jYXRvcikgPiAtMSwgJ0hhcyBsb2NhdG9yIGZvciBcIkFcIicpO1xuICAgIHRoaXMuYXNzZXJ0LmVxdWFsKHN0cmluZ3MuaW5kZXhPZihNYWluTG9jYXRvciksIC0xKTtcbiAgICB0aGlzLmFzc2VydEhUTUwoJ0IgMScpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxufVxuIl19