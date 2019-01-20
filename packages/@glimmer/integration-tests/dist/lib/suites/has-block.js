var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { RenderTest } from '../render-test';
import { test } from '../test-decorator';
export class HasBlockSuite extends RenderTest {
    'parameterized has-block (subexpr, else) when else supplied'() {
        this.render({
            layout: '{{#if (has-block "inverse")}}Yes{{else}}No{{/if}}',
            template: 'block here',
            else: 'else here',
        });
        this.assertComponent('Yes');
        this.assertStableRerender();
    }
    'parameterized has-block (subexpr, else) when else not supplied'() {
        this.render({
            layout: '{{#if (has-block "inverse")}}Yes{{else}}No{{/if}}',
            template: 'block here',
        });
        this.assertComponent('No');
        this.assertStableRerender();
    }
    'parameterized has-block (subexpr, default) when block supplied'() {
        this.render({
            layout: '{{#if (has-block)}}Yes{{else}}No{{/if}}',
            template: 'block here',
        });
        this.assertComponent('Yes');
        this.assertStableRerender();
    }
    'parameterized has-block (subexpr, default) when block not supplied'() {
        this.render({
            layout: '{{#if (has-block)}}Yes{{else}}No{{/if}}',
        });
        this.assertComponent('No');
        this.assertStableRerender();
    }
    'parameterized has-block (content, else) when else supplied'() {
        this.render({
            layout: '{{has-block "inverse"}}',
            template: 'block here',
            else: 'else here',
        });
        this.assertComponent('true');
        this.assertStableRerender();
    }
    'parameterized has-block (content, else) when else not supplied'() {
        this.render({
            layout: '{{has-block "inverse"}}',
            template: 'block here',
        });
        this.assertComponent('false');
        this.assertStableRerender();
    }
    'parameterized has-block (content, default) when block supplied'() {
        this.render({
            layout: '{{has-block}}',
            template: 'block here',
        });
        this.assertComponent('true');
        this.assertStableRerender();
    }
    'parameterized has-block (content, default) when block not supplied'() {
        this.render({
            layout: '{{has-block}}',
        });
        this.assertComponent('false');
        this.assertStableRerender();
    }
    'parameterized has-block (prop, else) when else supplied'() {
        this.render({
            layout: '<button name={{has-block "inverse"}}></button>',
            template: 'block here',
            else: 'else here',
        });
        this.assertComponent('<button name="true"></button>');
        this.assertStableRerender();
    }
    'parameterized has-block (prop, else) when else not supplied'() {
        this.render({
            layout: '<button name={{has-block "inverse"}}></button>',
            template: 'block here',
        });
        this.assertComponent('<button name="false"></button>');
        this.assertStableRerender();
    }
    'parameterized has-block (prop, default) when block supplied'() {
        this.render({
            layout: '<button name={{has-block}}></button>',
            template: 'block here',
        });
        this.assertComponent('<button name="true"></button>');
        this.assertStableRerender();
    }
    'parameterized has-block (prop, default) when block not supplied'() {
        this.render({
            layout: '<button name={{has-block}}></button>',
        });
        this.assertComponent('<button name="false"></button>');
        this.assertStableRerender();
    }
    'parameterized has-block (attr, else) when else supplied'() {
        this.render({
            layout: '<button data-has-block="{{has-block "inverse"}}"></button>',
            template: 'block here',
            else: 'else here',
        });
        this.assertComponent('<button data-has-block="true"></button>');
        this.assertStableRerender();
    }
    'parameterized has-block (attr, else) when else not supplied'() {
        this.render({
            layout: '<button data-has-block="{{has-block "inverse"}}"></button>',
            template: 'block here',
        });
        this.assertComponent('<button data-has-block="false"></button>');
        this.assertStableRerender();
    }
    'parameterized has-block (attr, default) when block supplied'() {
        this.render({
            layout: '<button data-has-block="{{has-block}}"></button>',
            template: 'block here',
        });
        this.assertComponent('<button data-has-block="true"></button>');
        this.assertStableRerender();
    }
    'parameterized has-block (attr, default) when block not supplied'() {
        this.render({
            layout: '<button data-has-block="{{has-block}}"></button>',
        });
        this.assertComponent('<button data-has-block="false"></button>');
        this.assertStableRerender();
    }
    'parameterized has-block (concatted attr, else) when else supplied'() {
        this.render({
            layout: '<button data-has-block="is-{{has-block "inverse"}}"></button>',
            template: 'block here',
            else: 'else here',
        });
        this.assertComponent('<button data-has-block="is-true"></button>');
        this.assertStableRerender();
    }
    'parameterized has-block (concatted attr, else) when else not supplied'() {
        this.render({
            layout: '<button data-has-block="is-{{has-block "inverse"}}"></button>',
            template: 'block here',
        });
        this.assertComponent('<button data-has-block="is-false"></button>');
        this.assertStableRerender();
    }
    'parameterized has-block (concatted attr, default) when block supplied'() {
        this.render({
            layout: '<button data-has-block="is-{{has-block}}"></button>',
            template: 'block here',
        });
        this.assertComponent('<button data-has-block="is-true"></button>');
        this.assertStableRerender();
    }
    'parameterized has-block (concatted attr, default) when block not supplied'() {
        this.render({
            layout: '<button data-has-block="is-{{has-block}}"></button>',
        });
        this.assertComponent('<button data-has-block="is-false"></button>');
        this.assertStableRerender();
    }
    'self closing angle bracket invocation (subexpr, default)'() {
        this.registerComponent('Glimmer', 'TestComponent', `<div ...attributes>{{#if (has-block)}}Yes{{else}}No{{/if}}</div>`);
        this.render(`<TestComponent />`);
        this.assertComponent('No');
        this.assertStableRerender();
    }
    'self closing angle bracket invocation (subexpr, else)'() {
        this.registerComponent('Glimmer', 'TestComponent', `<div ...attributes>{{#if (has-block 'inverse')}}Yes{{else}}No{{/if}}</div>`);
        this.render(`<TestComponent />`);
        this.assertComponent('No');
        this.assertStableRerender();
    }
    'self closing angle bracket invocation (concatted attr, default)'() {
        this.registerComponent('Glimmer', 'TestComponent', `<div data-has-block="{{has-block}}" ...attributes></div>`);
        this.render(`<TestComponent />`);
        this.assertComponent('', { 'data-has-block': 'false' });
        this.assertStableRerender();
    }
}
HasBlockSuite.suiteName = 'has-block';
__decorate([
    test({ kind: 'curly' })
], HasBlockSuite.prototype, "parameterized has-block (subexpr, else) when else supplied", null);
__decorate([
    test
], HasBlockSuite.prototype, "parameterized has-block (subexpr, else) when else not supplied", null);
__decorate([
    test
], HasBlockSuite.prototype, "parameterized has-block (subexpr, default) when block supplied", null);
__decorate([
    test({ kind: 'curly' })
], HasBlockSuite.prototype, "parameterized has-block (subexpr, default) when block not supplied", null);
__decorate([
    test({ kind: 'curly' })
], HasBlockSuite.prototype, "parameterized has-block (content, else) when else supplied", null);
__decorate([
    test
], HasBlockSuite.prototype, "parameterized has-block (content, else) when else not supplied", null);
__decorate([
    test
], HasBlockSuite.prototype, "parameterized has-block (content, default) when block supplied", null);
__decorate([
    test({ kind: 'curly' })
], HasBlockSuite.prototype, "parameterized has-block (content, default) when block not supplied", null);
__decorate([
    test({ kind: 'curly' })
], HasBlockSuite.prototype, "parameterized has-block (prop, else) when else supplied", null);
__decorate([
    test
], HasBlockSuite.prototype, "parameterized has-block (prop, else) when else not supplied", null);
__decorate([
    test
], HasBlockSuite.prototype, "parameterized has-block (prop, default) when block supplied", null);
__decorate([
    test({ kind: 'curly' })
], HasBlockSuite.prototype, "parameterized has-block (prop, default) when block not supplied", null);
__decorate([
    test({ kind: 'curly' })
], HasBlockSuite.prototype, "parameterized has-block (attr, else) when else supplied", null);
__decorate([
    test
], HasBlockSuite.prototype, "parameterized has-block (attr, else) when else not supplied", null);
__decorate([
    test
], HasBlockSuite.prototype, "parameterized has-block (attr, default) when block supplied", null);
__decorate([
    test({ kind: 'curly' })
], HasBlockSuite.prototype, "parameterized has-block (attr, default) when block not supplied", null);
__decorate([
    test({ kind: 'curly' })
], HasBlockSuite.prototype, "parameterized has-block (concatted attr, else) when else supplied", null);
__decorate([
    test
], HasBlockSuite.prototype, "parameterized has-block (concatted attr, else) when else not supplied", null);
__decorate([
    test
], HasBlockSuite.prototype, "parameterized has-block (concatted attr, default) when block supplied", null);
__decorate([
    test({ kind: 'curly' })
], HasBlockSuite.prototype, "parameterized has-block (concatted attr, default) when block not supplied", null);
__decorate([
    test({ kind: 'glimmer' })
], HasBlockSuite.prototype, "self closing angle bracket invocation (subexpr, default)", null);
__decorate([
    test({ kind: 'glimmer' })
], HasBlockSuite.prototype, "self closing angle bracket invocation (subexpr, else)", null);
__decorate([
    test({ kind: 'glimmer' })
], HasBlockSuite.prototype, "self closing angle bracket invocation (concatted attr, default)", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGFzLWJsb2NrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vbGliL3N1aXRlcy9oYXMtYmxvY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBQzVDLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUV6QyxNQUFNLE9BQU8sYUFBYyxTQUFRLFVBQVU7SUFJM0MsNERBQTREO1FBQzFELElBQUksQ0FBQyxNQUFNLENBQUM7WUFDVixNQUFNLEVBQUUsbURBQW1EO1lBQzNELFFBQVEsRUFBRSxZQUFZO1lBQ3RCLElBQUksRUFBRSxXQUFXO1NBQ2xCLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDNUIsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7SUFDOUIsQ0FBQztJQUdELGdFQUFnRTtRQUM5RCxJQUFJLENBQUMsTUFBTSxDQUFDO1lBQ1YsTUFBTSxFQUFFLG1EQUFtRDtZQUMzRCxRQUFRLEVBQUUsWUFBWTtTQUN2QixDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzNCLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO0lBQzlCLENBQUM7SUFHRCxnRUFBZ0U7UUFDOUQsSUFBSSxDQUFDLE1BQU0sQ0FBQztZQUNWLE1BQU0sRUFBRSx5Q0FBeUM7WUFDakQsUUFBUSxFQUFFLFlBQVk7U0FDdkIsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUM1QixJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztJQUM5QixDQUFDO0lBR0Qsb0VBQW9FO1FBQ2xFLElBQUksQ0FBQyxNQUFNLENBQUM7WUFDVixNQUFNLEVBQUUseUNBQXlDO1NBQ2xELENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxl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QUFHRDtJQURDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsQ0FBQzswRkFXekI7QUFHRDtJQURDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsQ0FBQztvR0FXekIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBSZW5kZXJUZXN0IH0gZnJvbSAnLi4vcmVuZGVyLXRlc3QnO1xuaW1wb3J0IHsgdGVzdCB9IGZyb20gJy4uL3Rlc3QtZGVjb3JhdG9yJztcblxuZXhwb3J0IGNsYXNzIEhhc0Jsb2NrU3VpdGUgZXh0ZW5kcyBSZW5kZXJUZXN0IHtcbiAgc3RhdGljIHN1aXRlTmFtZSA9ICdoYXMtYmxvY2snO1xuXG4gIEB0ZXN0KHsga2luZDogJ2N1cmx5JyB9KVxuICAncGFyYW1ldGVyaXplZCBoYXMtYmxvY2sgKHN1YmV4cHIsIGVsc2UpIHdoZW4gZWxzZSBzdXBwbGllZCcoKSB7XG4gICAgdGhpcy5yZW5kZXIoe1xuICAgICAgbGF5b3V0OiAne3sjaWYgKGhhcy1ibG9jayBcImludmVyc2VcIil9fVllc3t7ZWxzZX19Tm97ey9pZn19JyxcbiAgICAgIHRlbXBsYXRlOiAnYmxvY2sgaGVyZScsXG4gICAgICBlbHNlOiAnZWxzZSBoZXJlJyxcbiAgICB9KTtcblxuICAgIHRoaXMuYXNzZXJ0Q29tcG9uZW50KCdZZXMnKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG4gIH1cblxuICBAdGVzdFxuICAncGFyYW1ldGVyaXplZCBoYXMtYmxvY2sgKHN1YmV4cHIsIGVsc2UpIHdoZW4gZWxzZSBub3Qgc3VwcGxpZWQnKCkge1xuICAgIHRoaXMucmVuZGVyKHtcbiAgICAgIGxheW91dDogJ3t7I2lmIChoYXMtYmxvY2sgXCJpbnZlcnNlXCIpfX1ZZXN7e2Vsc2V9fU5ve3svaWZ9fScsXG4gICAgICB0ZW1wbGF0ZTogJ2Jsb2NrIGhlcmUnLFxuICAgIH0pO1xuXG4gICAgdGhpcy5hc3NlcnRDb21wb25lbnQoJ05vJyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuICB9XG5cbiAgQHRlc3RcbiAgJ3BhcmFtZXRlcml6ZWQgaGFzLWJsb2NrIChzdWJleHByLCBkZWZhdWx0KSB3aGVuIGJsb2NrIHN1cHBsaWVkJygpIHtcbiAgICB0aGlzLnJlbmRlcih7XG4gICAgICBsYXlvdXQ6ICd7eyNpZiAoaGFzLWJsb2NrKX19WWVze3tlbHNlfX1Ob3t7L2lmfX0nLFxuICAgICAgdGVtcGxhdGU6ICdibG9jayBoZXJlJyxcbiAgICB9KTtcblxuICAgIHRoaXMuYXNzZXJ0Q29tcG9uZW50KCdZZXMnKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG4gIH1cblxuICBAdGVzdCh7IGtpbmQ6ICdjdXJseScgfSlcbiAgJ3BhcmFtZXRlcml6ZWQgaGFzLWJsb2NrIChzdWJleHByLCBkZWZhdWx0KSB3aGVuIGJsb2NrIG5vdCBzdXBwbGllZCcoKSB7XG4gICAgdGhpcy5yZW5kZXIoe1xuICAgICAgbGF5b3V0OiAne3sjaWYgKGhhcy1ibG9jayl9fVllc3t7ZWxzZX19Tm97ey9pZn19JyxcbiAgICB9KTtcblxuICAgIHRoaXMuYXNzZXJ0Q29tcG9uZW50KCdObycpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxuXG4gIEB0ZXN0KHsga2luZDogJ2N1cmx5JyB9KVxuICAncGFyYW1ldGVyaXplZCBoYXMtYmxvY2sgKGNvbnRlbnQsIGVsc2UpIHdoZW4gZWxzZSBzdXBwbGllZCcoKSB7XG4gICAgdGhpcy5yZW5kZXIoe1xuICAgICAgbGF5b3V0OiAne3toYXMtYmxvY2sgXCJpbnZlcnNlXCJ9fScsXG4gICAgICB0ZW1wbGF0ZTogJ2Jsb2NrIGhlcmUnLFxuICAgICAgZWxzZTogJ2Vsc2UgaGVyZScsXG4gICAgfSk7XG5cbiAgICB0aGlzLmFzc2VydENvbXBvbmVudCgndHJ1ZScpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxuXG4gIEB0ZXN0XG4gICdwYXJhbWV0ZXJpemVkIGhhcy1ibG9jayAoY29udGVudCwgZWxzZSkgd2hlbiBlbHNlIG5vdCBzdXBwbGllZCcoKSB7XG4gICAgdGhpcy5yZW5kZXIoe1xuICAgICAgbGF5b3V0OiAne3toYXMtYmxvY2sgXCJpbnZlcnNlXCJ9fScsXG4gICAgICB0ZW1wbGF0ZTogJ2Jsb2NrIGhlcmUnLFxuICAgIH0pO1xuXG4gICAgdGhpcy5hc3NlcnRDb21wb25lbnQoJ2ZhbHNlJyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuICB9XG5cbiAgQHRlc3RcbiAgJ3BhcmFtZXRlcml6ZWQgaGFzLWJsb2NrIChjb250ZW50LCBkZWZhdWx0KSB3aGVuIGJsb2NrIHN1cHBsaWVkJygpIHtcbiAgICB0aGlzLnJlbmRlcih7XG4gICAgICBsYXlvdXQ6ICd7e2hhcy1ibG9ja319JyxcbiAgICAgIHRlbXBsYXRlOiAnYmxvY2sgaGVyZScsXG4gICAgfSk7XG5cbiAgICB0aGlzLmFzc2VydENvbXBvbmVudCgndHJ1ZScpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxuXG4gIEB0ZXN0KHsga2luZDogJ2N1cmx5JyB9KVxuICAncGFyYW1ldGVyaXplZCBoYXMtYmxvY2sgKGNvbnRlbnQsIGRlZmF1bHQpIHdoZW4gYmxvY2sgbm90IHN1cHBsaWVkJygpIHtcbiAgICB0aGlzLnJlbmRlcih7XG4gICAgICBsYXlvdXQ6ICd7e2hhcy1ibG9ja319JyxcbiAgICB9KTtcblxuICAgIHRoaXMuYXNzZXJ0Q29tcG9uZW50KCdmYWxzZScpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxuXG4gIEB0ZXN0KHsga2luZDogJ2N1cmx5JyB9KVxuICAncGFyYW1ldGVyaXplZCBoYXMtYmxvY2sgKHByb3AsIGVsc2UpIHdoZW4gZWxzZSBzdXBwbGllZCcoKSB7XG4gICAgdGhpcy5yZW5kZXIoe1xuICAgICAgbGF5b3V0OiAnPGJ1dHRvbiBuYW1lPXt7aGFzLWJsb2NrIFwiaW52ZXJzZVwifX0+PC9idXR0b24+JyxcbiAgICAgIHRlbXBsYXRlOiAnYmxvY2sgaGVyZScsXG4gICAgICBlbHNlOiAnZWxzZSBoZXJlJyxcbiAgICB9KTtcblxuICAgIHRoaXMuYXNzZXJ0Q29tcG9uZW50KCc8YnV0dG9uIG5hbWU9XCJ0cnVlXCI+PC9idXR0b24+Jyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuICB9XG5cbiAgQHRlc3RcbiAgJ3BhcmFtZXRlcml6ZWQgaGFzLWJsb2NrIChwcm9wLCBlbHNlKSB3aGVuIGVsc2Ugbm90IHN1cHBsaWVkJygpIHtcbiAgICB0aGlzLnJlbmRlcih7XG4gICAgICBsYXlvdXQ6ICc8YnV0dG9uIG5hbWU9e3toYXMtYmxvY2sgXCJpbnZlcnNlXCJ9fT48L2J1dHRvbj4nLFxuICAgICAgdGVtcGxhdGU6ICdibG9jayBoZXJlJyxcbiAgICB9KTtcblxuICAgIHRoaXMuYXNzZXJ0Q29tcG9uZW50KCc8YnV0dG9uIG5hbWU9XCJmYWxzZVwiPjwvYnV0dG9uPicpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxuXG4gIEB0ZXN0XG4gICdwYXJhbWV0ZXJpemVkIGhhcy1ibG9jayAocHJvcCwgZGVmYXVsdCkgd2hlbiBibG9jayBzdXBwbGllZCcoKSB7XG4gICAgdGhpcy5yZW5kZXIoe1xuICAgICAgbGF5b3V0OiAnPGJ1dHRvbiBuYW1lPXt7aGFzLWJsb2NrfX0+PC9idXR0b24+JyxcbiAgICAgIHRlbXBsYXRlOiAnYmxvY2sgaGVyZScsXG4gICAgfSk7XG5cbiAgICB0aGlzLmFzc2VydENvbXBvbmVudCgnPGJ1dHRvbiBuYW1lPVwidHJ1ZVwiPjwvYnV0dG9uPicpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxuXG4gIEB0ZXN0KHsga2luZDogJ2N1cmx5JyB9KVxuICAncGFyYW1ldGVyaXplZCBoYXMtYmxvY2sgKHByb3AsIGRlZmF1bHQpIHdoZW4gYmxvY2sgbm90IHN1cHBsaWVkJygpIHtcbiAgICB0aGlzLnJlbmRlcih7XG4gICAgICBsYXlvdXQ6ICc8YnV0dG9uIG5hbWU9e3toYXMtYmxvY2t9fT48L2J1dHRvbj4nLFxuICAgIH0pO1xuXG4gICAgdGhpcy5hc3NlcnRDb21wb25lbnQoJzxidXR0b24gbmFtZT1cImZhbHNlXCI+PC9idXR0b24+Jyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuICB9XG5cbiAgQHRlc3QoeyBraW5kOiAnY3VybHknIH0pXG4gICdwYXJhbWV0ZXJpemVkIGhhcy1ibG9jayAoYXR0ciwgZWxzZSkgd2hlbiBlbHNlIHN1cHBsaWVkJygpIHtcbiAgICB0aGlzLnJlbmRlcih7XG4gICAgICBsYXlvdXQ6ICc8YnV0dG9uIGRhdGEtaGFzLWJsb2NrPVwie3toYXMtYmxvY2sgXCJpbnZlcnNlXCJ9fVwiPjwvYnV0dG9uPicsXG4gICAgICB0ZW1wbGF0ZTogJ2Jsb2NrIGhlcmUnLFxuICAgICAgZWxzZTogJ2Vsc2UgaGVyZScsXG4gICAgfSk7XG5cbiAgICB0aGlzLmFzc2VydENvbXBvbmVudCgnPGJ1dHRvbiBkYXRhLWhhcy1ibG9jaz1cInRydWVcIj48L2J1dHRvbj4nKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG4gIH1cblxuICBAdGVzdFxuICAncGFyYW1ldGVyaXplZCBoYXMtYmxvY2sgKGF0dHIsIGVsc2UpIHdoZW4gZWxzZSBub3Qgc3VwcGxpZWQnKCkge1xuICAgIHRoaXMucmVuZGVyKHtcbiAgICAgIGxheW91dDogJzxidXR0b24gZGF0YS1oYXMtYmxvY2s9XCJ7e2hhcy1ibG9jayBcImludmVyc2VcIn19XCI+PC9idXR0b24+JyxcbiAgICAgIHRlbXBsYXRlOiAnYmxvY2sgaGVyZScsXG4gICAgfSk7XG5cbiAgICB0aGlzLmFzc2VydENvbXBvbmVudCgnPGJ1dHRvbiBkYXRhLWhhcy1ibG9jaz1cImZhbHNlXCI+PC9idXR0b24+Jyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuICB9XG5cbiAgQHRlc3RcbiAgJ3BhcmFtZXRlcml6ZWQgaGFzLWJsb2NrIChhdHRyLCBkZWZhdWx0KSB3aGVuIGJsb2NrIHN1cHBsaWVkJygpIHtcbiAgICB0aGlzLnJlbmRlcih7XG4gICAgICBsYXlvdXQ6ICc8YnV0dG9uIGRhdGEtaGFzLWJsb2NrPVwie3toYXMtYmxvY2t9fVwiPjwvYnV0dG9uPicsXG4gICAgICB0ZW1wbGF0ZTogJ2Jsb2NrIGhlcmUnLFxuICAgIH0pO1xuXG4gICAgdGhpcy5hc3NlcnRDb21wb25lbnQoJzxidXR0b24gZGF0YS1oYXMtYmxvY2s9XCJ0cnVlXCI+PC9idXR0b24+Jyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuICB9XG5cbiAgQHRlc3QoeyBraW5kOiAnY3VybHknIH0pXG4gICdwYXJhbWV0ZXJpemVkIGhhcy1ibG9jayAoYXR0ciwgZGVmYXVsdCkgd2hlbiBibG9jayBub3Qgc3VwcGxpZWQnKCkge1xuICAgIHRoaXMucmVuZGVyKHtcbiAgICAgIGxheW91dDogJzxidXR0b24gZGF0YS1oYXMtYmxvY2s9XCJ7e2hhcy1ibG9ja319XCI+PC9idXR0b24+JyxcbiAgICB9KTtcblxuICAgIHRoaXMuYXNzZXJ0Q29tcG9uZW50KCc8YnV0dG9uIGRhdGEtaGFzLWJsb2NrPVwiZmFsc2VcIj48L2J1dHRvbj4nKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG4gIH1cblxuICBAdGVzdCh7IGtpbmQ6ICdjdXJseScgfSlcbiAgJ3BhcmFtZXRlcml6ZWQgaGFzLWJsb2NrIChjb25jYXR0ZWQgYXR0ciwgZWxzZSkgd2hlbiBlbHNlIHN1cHBsaWVkJygpIHtcbiAgICB0aGlzLnJlbmRlcih7XG4gICAgICBsYXlvdXQ6ICc8YnV0dG9uIGRhdGEtaGFzLWJsb2NrPVwiaXMte3toYXMtYmxvY2sgXCJpbnZlcnNlXCJ9fVwiPjwvYnV0dG9uPicsXG4gICAgICB0ZW1wbGF0ZTogJ2Jsb2NrIGhlcmUnLFxuICAgICAgZWxzZTogJ2Vsc2UgaGVyZScsXG4gICAgfSk7XG5cbiAgICB0aGlzLmFzc2VydENvbXBvbmVudCgnPGJ1dHRvbiBkYXRhLWhhcy1ibG9jaz1cImlzLXRydWVcIj48L2J1dHRvbj4nKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG4gIH1cblxuICBAdGVzdFxuICAncGFyYW1ldGVyaXplZCBoYXMtYmxvY2sgKGNvbmNhdHRlZCBhdHRyLCBlbHNlKSB3aGVuIGVsc2Ugbm90IHN1cHBsaWVkJygpIHtcbiAgICB0aGlzLnJlbmRlcih7XG4gICAgICBsYXlvdXQ6ICc8YnV0dG9uIGRhdGEtaGFzLWJsb2NrPVwiaXMte3toYXMtYmxvY2sgXCJpbnZlcnNlXCJ9fVwiPjwvYnV0dG9uPicsXG4gICAgICB0ZW1wbGF0ZTogJ2Jsb2NrIGhlcmUnLFxuICAgIH0pO1xuXG4gICAgdGhpcy5hc3NlcnRDb21wb25lbnQoJzxidXR0b24gZGF0YS1oYXMtYmxvY2s9XCJpcy1mYWxzZVwiPjwvYnV0dG9uPicpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxuXG4gIEB0ZXN0XG4gICdwYXJhbWV0ZXJpemVkIGhhcy1ibG9jayAoY29uY2F0dGVkIGF0dHIsIGRlZmF1bHQpIHdoZW4gYmxvY2sgc3VwcGxpZWQnKCkge1xuICAgIHRoaXMucmVuZGVyKHtcbiAgICAgIGxheW91dDogJzxidXR0b24gZGF0YS1oYXMtYmxvY2s9XCJpcy17e2hhcy1ibG9ja319XCI+PC9idXR0b24+JyxcbiAgICAgIHRlbXBsYXRlOiAnYmxvY2sgaGVyZScsXG4gICAgfSk7XG5cbiAgICB0aGlzLmFzc2VydENvbXBvbmVudCgnPGJ1dHRvbiBkYXRhLWhhcy1ibG9jaz1cImlzLXRydWVcIj48L2J1dHRvbj4nKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG4gIH1cblxuICBAdGVzdCh7IGtpbmQ6ICdjdXJseScgfSlcbiAgJ3BhcmFtZXRlcml6ZWQgaGFzLWJsb2NrIChjb25jYXR0ZWQgYXR0ciwgZGVmYXVsdCkgd2hlbiBibG9jayBub3Qgc3VwcGxpZWQnKCkge1xuICAgIHRoaXMucmVuZGVyKHtcbiAgICAgIGxheW91dDogJzxidXR0b24gZGF0YS1oYXMtYmxvY2s9XCJpcy17e2hhcy1ibG9ja319XCI+PC9idXR0b24+JyxcbiAgICB9KTtcblxuICAgIHRoaXMuYXNzZXJ0Q29tcG9uZW50KCc8YnV0dG9uIGRhdGEtaGFzLWJsb2NrPVwiaXMtZmFsc2VcIj48L2J1dHRvbj4nKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG4gIH1cblxuICBAdGVzdCh7IGtpbmQ6ICdnbGltbWVyJyB9KVxuICAnc2VsZiBjbG9zaW5nIGFuZ2xlIGJyYWNrZXQgaW52b2NhdGlvbiAoc3ViZXhwciwgZGVmYXVsdCknKCkge1xuICAgIHRoaXMucmVnaXN0ZXJDb21wb25lbnQoXG4gICAgICAnR2xpbW1lcicsXG4gICAgICAnVGVzdENvbXBvbmVudCcsXG4gICAgICBgPGRpdiAuLi5hdHRyaWJ1dGVzPnt7I2lmIChoYXMtYmxvY2spfX1ZZXN7e2Vsc2V9fU5ve3svaWZ9fTwvZGl2PmBcbiAgICApO1xuICAgIHRoaXMucmVuZGVyKGA8VGVzdENvbXBvbmVudCAvPmApO1xuXG4gICAgdGhpcy5hc3NlcnRDb21wb25lbnQoJ05vJyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuICB9XG5cbiAgQHRlc3QoeyBraW5kOiAnZ2xpbW1lcicgfSlcbiAgJ3NlbGYgY2xvc2luZyBhbmdsZSBicmFja2V0IGludm9jYXRpb24gKHN1YmV4cHIsIGVsc2UpJygpIHtcbiAgICB0aGlzLnJlZ2lzdGVyQ29tcG9uZW50KFxuICAgICAgJ0dsaW1tZXInLFxuICAgICAgJ1Rlc3RDb21wb25lbnQnLFxuICAgICAgYDxkaXYgLi4uYXR0cmlidXRlcz57eyNpZiAoaGFzLWJsb2NrICdpbnZlcnNlJyl9fVllc3t7ZWxzZX19Tm97ey9pZn19PC9kaXY+YFxuICAgICk7XG4gICAgdGhpcy5yZW5kZXIoYDxUZXN0Q29tcG9uZW50IC8+YCk7XG5cbiAgICB0aGlzLmFzc2VydENvbXBvbmVudCgnTm8nKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG4gIH1cblxuICBAdGVzdCh7IGtpbmQ6ICdnbGltbWVyJyB9KVxuICAnc2VsZiBjbG9zaW5nIGFuZ2xlIGJyYWNrZXQgaW52b2NhdGlvbiAoY29uY2F0dGVkIGF0dHIsIGRlZmF1bHQpJygpIHtcbiAgICB0aGlzLnJlZ2lzdGVyQ29tcG9uZW50KFxuICAgICAgJ0dsaW1tZXInLFxuICAgICAgJ1Rlc3RDb21wb25lbnQnLFxuICAgICAgYDxkaXYgZGF0YS1oYXMtYmxvY2s9XCJ7e2hhcy1ibG9ja319XCIgLi4uYXR0cmlidXRlcz48L2Rpdj5gXG4gICAgKTtcbiAgICB0aGlzLnJlbmRlcihgPFRlc3RDb21wb25lbnQgLz5gKTtcblxuICAgIHRoaXMuYXNzZXJ0Q29tcG9uZW50KCcnLCB7ICdkYXRhLWhhcy1ibG9jayc6ICdmYWxzZScgfSk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuICB9XG59XG4iXX0=