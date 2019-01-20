var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { RenderTest } from '../render-test';
import { test } from '../test-decorator';
export class HasBlockParamsHelperSuite extends RenderTest {
    'parameterized has-block-params (subexpr, else) when else supplied without block params'() {
        this.render({
            layout: '{{#if (has-block-params "inverse")}}Yes{{else}}No{{/if}}',
            template: 'block here',
            else: 'else here',
        });
        this.assertComponent('No');
        this.assertStableRerender();
    }
    'parameterized has-block-params (subexpr, else) when else not supplied'() {
        this.render({
            layout: '{{#if (has-block-params "inverse")}}Yes{{else}}No{{/if}}',
            template: 'block here',
        });
        this.assertComponent('No');
        this.assertStableRerender();
    }
    'parameterized has-block-params (subexpr, default) when block supplied with block params'() {
        this.render({
            layout: '{{#if (has-block-params)}}Yes{{else}}No{{/if}}',
            blockParams: ['param'],
            template: 'block here',
        });
        this.assertComponent('Yes');
        this.assertStableRerender();
    }
    'parameterized has-block-params (subexpr, default) when block supplied without block params'() {
        this.render({
            layout: '{{#if (has-block-params)}}Yes{{else}}No{{/if}}',
            template: 'block here',
        });
        this.assertComponent('No');
        this.assertStableRerender();
    }
    'parameterized has-block-params (subexpr, default) when block not supplied'() {
        this.render({
            layout: '{{#if (has-block-params)}}Yes{{else}}No{{/if}}',
        });
        this.assertComponent('No');
        this.assertStableRerender();
    }
    'parameterized has-block-params (content, else) when else supplied without block params'() {
        this.render({
            layout: '{{has-block-params "inverse"}}',
            template: 'block here',
            else: 'else here',
        });
        this.assertComponent('false');
        this.assertStableRerender();
    }
    'parameterized has-block-params (content, else) when else not supplied'() {
        this.render({
            layout: '{{has-block-params "inverse"}}',
            template: 'block here',
        });
        this.assertComponent('false');
        this.assertStableRerender();
    }
    'parameterized has-block-params (content, default) when block supplied with block params'() {
        this.render({
            layout: '{{has-block-params}}',
            blockParams: ['param'],
            template: 'block here',
        });
        this.assertComponent('true');
        this.assertStableRerender();
    }
    'parameterized has-block-params (content, default) when block supplied without block params'() {
        this.render({
            layout: '{{has-block-params}}',
            template: 'block here',
        });
        this.assertComponent('false');
        this.assertStableRerender();
    }
    'parameterized has-block-params (content, default) when block not supplied'() {
        this.render({
            layout: '{{has-block-params}}',
            template: 'block here',
        });
        this.assertComponent('false');
        this.assertStableRerender();
    }
    'parameterized has-block-params (prop, else) when else supplied without block params'() {
        this.render({
            layout: '<button name={{has-block-params "inverse"}}></button>',
            template: 'block here',
            else: 'else here',
        });
        this.assertComponent('<button name="false"></button>');
        this.assertStableRerender();
    }
    'parameterized has-block-params (prop, else) when else not supplied'() {
        this.render({
            layout: '<button name={{has-block-params "inverse"}}></button>',
            template: 'block here',
        });
        this.assertComponent('<button name="false"></button>');
        this.assertStableRerender();
    }
    'parameterized has-block-params (prop, default) when block supplied with block params'() {
        this.render({
            layout: '<button name={{has-block-params}}></button>',
            blockParams: ['param'],
            template: 'block here',
        });
        this.assertComponent('<button name="true"></button>');
        this.assertStableRerender();
    }
    'parameterized has-block-params (prop, default) when block supplied without block params'() {
        this.render({
            layout: '<button name={{has-block-params}}></button>',
            template: 'block here',
        });
        this.assertComponent('<button name="false"></button>');
        this.assertStableRerender();
    }
    'parameterized has-block-params (prop, default) when block not supplied'() {
        this.render({
            layout: '<button name={{has-block-params}}></button>',
        });
        this.assertComponent('<button name="false"></button>');
        this.assertStableRerender();
    }
    'parameterized has-block-params (attr, else) when else supplied without block params'() {
        this.render({
            layout: '<button data-has-block-params="{{has-block-params "inverse"}}"></button>',
            template: 'block here',
            else: 'else here',
        });
        this.assertComponent('<button data-has-block-params="false"></button>');
        this.assertStableRerender();
    }
    'parameterized has-block-params (attr, else) when else not supplied'() {
        this.render({
            layout: '<button data-has-block-params="{{has-block-params "inverse"}}"></button>',
            template: 'block here',
            else: 'else here',
        });
        this.assertComponent('<button data-has-block-params="false"></button>');
        this.assertStableRerender();
    }
    'parameterized has-block-params (attr, default) when block supplied with block params'() {
        this.render({
            layout: '<button data-has-block-params="{{has-block-params}}"></button>',
            blockParams: ['param'],
            template: 'block here',
        });
        this.assertComponent('<button data-has-block-params="true"></button>');
        this.assertStableRerender();
    }
    'parameterized has-block-params (attr, default) when block supplied without block params'() {
        this.render({
            layout: '<button data-has-block-params="{{has-block-params}}"></button>',
            template: 'block here',
        });
        this.assertComponent('<button data-has-block-params="false"></button>');
        this.assertStableRerender();
    }
    'parameterized has-block-params (attr, default) when block not supplied'() {
        this.render({
            layout: '<button data-has-block-params="{{has-block-params}}"></button>',
            template: 'block here',
        });
        this.assertComponent('<button data-has-block-params="false"></button>');
        this.assertStableRerender();
    }
    'parameterized has-block-params (concatted attr, else) when else supplied without block params'() {
        this.render({
            layout: '<button data-has-block-params="is-{{has-block-params "inverse"}}"></button>',
            template: 'block here',
            else: 'else here',
        });
        this.assertComponent('<button data-has-block-params="is-false"></button>');
        this.assertStableRerender();
    }
    'parameterized has-block-params (concatted attr, else) when else not supplied'() {
        this.render({
            layout: '<button data-has-block-params="is-{{has-block-params "inverse"}}"></button>',
            template: 'block here',
        });
        this.assertComponent('<button data-has-block-params="is-false"></button>');
        this.assertStableRerender();
    }
    'parameterized has-block-params (concatted attr, default) when block supplied with block params'() {
        this.render({
            layout: '<button data-has-block-params="is-{{has-block-params}}"></button>',
            template: 'block here',
            blockParams: ['param'],
        });
        this.assertComponent('<button data-has-block-params="is-true"></button>');
        this.assertStableRerender();
    }
    'parameterized has-block-params (concatted attr, default) when block supplied without block params'() {
        this.render({
            layout: '<button data-has-block-params="is-{{has-block-params}}"></button>',
            template: 'block here',
        });
        this.assertComponent('<button data-has-block-params="is-false"></button>');
        this.assertStableRerender();
    }
    'parameterized has-block-params (concatted attr, default) when block not supplied'() {
        this.render({
            layout: '<button data-has-block-params="is-{{has-block-params}}"></button>',
        });
        this.assertComponent('<button data-has-block-params="is-false"></button>');
        this.assertStableRerender();
    }
}
HasBlockParamsHelperSuite.suiteName = 'has-block-params';
__decorate([
    test({ kind: 'curly' })
], HasBlockParamsHelperSuite.prototype, "parameterized has-block-params (subexpr, else) when else supplied without block params", null);
__decorate([
    test({ kind: 'curly' })
], HasBlockParamsHelperSuite.prototype, "parameterized has-block-params (subexpr, else) when else not supplied", null);
__decorate([
    test({ kind: 'curly' })
], HasBlockParamsHelperSuite.prototype, "parameterized has-block-params (subexpr, default) when block supplied with block params", null);
__decorate([
    test({ kind: 'curly' })
], HasBlockParamsHelperSuite.prototype, "parameterized has-block-params (subexpr, default) when block supplied without block params", null);
__decorate([
    test({ kind: 'curly' })
], HasBlockParamsHelperSuite.prototype, "parameterized has-block-params (subexpr, default) when block not supplied", null);
__decorate([
    test({ kind: 'curly' })
], HasBlockParamsHelperSuite.prototype, "parameterized has-block-params (content, else) when else supplied without block params", null);
__decorate([
    test({ kind: 'curly' })
], HasBlockParamsHelperSuite.prototype, "parameterized has-block-params (content, else) when else not supplied", null);
__decorate([
    test({ kind: 'curly' })
], HasBlockParamsHelperSuite.prototype, "parameterized has-block-params (content, default) when block supplied with block params", null);
__decorate([
    test({ kind: 'curly' })
], HasBlockParamsHelperSuite.prototype, "parameterized has-block-params (content, default) when block supplied without block params", null);
__decorate([
    test({ kind: 'curly' })
], HasBlockParamsHelperSuite.prototype, "parameterized has-block-params (content, default) when block not supplied", null);
__decorate([
    test({ kind: 'curly' })
], HasBlockParamsHelperSuite.prototype, "parameterized has-block-params (prop, else) when else supplied without block params", null);
__decorate([
    test({ kind: 'curly' })
], HasBlockParamsHelperSuite.prototype, "parameterized has-block-params (prop, else) when else not supplied", null);
__decorate([
    test({ kind: 'curly' })
], HasBlockParamsHelperSuite.prototype, "parameterized has-block-params (prop, default) when block supplied with block params", null);
__decorate([
    test({ kind: 'curly' })
], HasBlockParamsHelperSuite.prototype, "parameterized has-block-params (prop, default) when block supplied without block params", null);
__decorate([
    test({ kind: 'curly' })
], HasBlockParamsHelperSuite.prototype, "parameterized has-block-params (prop, default) when block not supplied", null);
__decorate([
    test({ kind: 'curly' })
], HasBlockParamsHelperSuite.prototype, "parameterized has-block-params (attr, else) when else supplied without block params", null);
__decorate([
    test({ kind: 'curly' })
], HasBlockParamsHelperSuite.prototype, "parameterized has-block-params (attr, else) when else not supplied", null);
__decorate([
    test({ kind: 'curly' })
], HasBlockParamsHelperSuite.prototype, "parameterized has-block-params (attr, default) when block supplied with block params", null);
__decorate([
    test({ kind: 'curly' })
], HasBlockParamsHelperSuite.prototype, "parameterized has-block-params (attr, default) when block supplied without block params", null);
__decorate([
    test({ kind: 'curly' })
], HasBlockParamsHelperSuite.prototype, "parameterized has-block-params (attr, default) when block not supplied", null);
__decorate([
    test({ kind: 'curly' })
], HasBlockParamsHelperSuite.prototype, "parameterized has-block-params (concatted attr, else) when else supplied without block params", null);
__decorate([
    test({ kind: 'curly' })
], HasBlockParamsHelperSuite.prototype, "parameterized has-block-params (concatted attr, else) when else not supplied", null);
__decorate([
    test({ kind: 'curly' })
], HasBlockParamsHelperSuite.prototype, "parameterized has-block-params (concatted attr, default) when block supplied with block params", null);
__decorate([
    test({ kind: 'curly' })
], HasBlockParamsHelperSuite.prototype, "parameterized has-block-params (concatted attr, default) when block supplied without block params", null);
__decorate([
    test({ kind: 'curly' })
], HasBlockParamsHelperSuite.prototype, "parameterized has-block-params (concatted attr, default) when block not supplied", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGFzLWJsb2NrLXBhcmFtcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL2xpYi9zdWl0ZXMvaGFzLWJsb2NrLXBhcmFtcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFDNUMsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBRXpDLE1BQU0sT0FBTyx5QkFBMEIsU0FBUSxVQUFVO0lBSXZELHdGQUF3RjtRQUN0RixJQUFJLENBQUMsTUFBTSxDQUFDO1lBQ1YsTUFBTSxFQUFFLDBEQUEwRDtZQUNsRSxRQUFRLEVBQUUsWUFBWTtZQUN0QixJQUFJLEVBQUUsV0FBVztTQUNsQixDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzNCLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO0lBQzlCLENBQUM7SUFHRCx1RUFBdUU7UUFDckUsSUFBSSxDQUFDLE1BQU0sQ0FBQztZQUNWLE1BQU0sRUFBRSwwREFBMEQ7WUFDbEUsUUFBUSxFQUFFLFlBQVk7U0FDdkIsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMzQixJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztJQUM5QixDQUFDO0lBR0QseUZBQXlGO1FBQ3ZGLElBQUksQ0FBQyxNQUFNLENBQUM7WUFDVixNQUFNLEVBQUUsZ0RBQWdEO1lBQ3hELFdBQVcsRUFBRSxDQUFDLE9BQU8sQ0FBQztZQUN0QixRQUFRLEVBQUUsWUFBWTtTQUN2QixDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzVCLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO0lBQzlCLENBQUM7SUFHRCw0RkFBNEY7UUFDMUYsSUFBSSxDQUFDLE1BQU0sQ0FBQztZQUNWLE1BQU0sRUFBRSxnREFBZ0Q7WUFDeEQsUUFBUSxFQUFFLFlBQVk7U0FDdkIsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMzQixJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztJQUM5QixDQUFDO0lBR0QsMkVBQTJFO1FBQ3pFLElBQUksQ0FBQyxNQUFNLENBQUM7WUFDVixNQUFNLEVBQUUsZ0RBQWdEO1NBQ3pELENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDM0IsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7SUFDOUIsQ0FBQztJQUdELHdGQUF3RjtRQUN0RixJQUFJLENBQUMsTUFBTSxDQUFDO1lBQ1YsTUFBTSxFQUFFLGdDQUFnQztZQUN4QyxRQUFRLEVBQUUsWUFBWTtZQUN0QixJQUFJLEVBQUUsV0FBVztTQUNsQixDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzlCLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO0lBQzlCLENBQUM7SUFHRCx1RUFBdUU7UUFDckUsSUFBSSxDQUFDLE1BQU0sQ0FBQztZQUNWLE1BQU0sRUFBRSxnQ0FBZ0M7WUFDeEMsUUFBUSxFQUFFLFlBQVk7U0FDdkIsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUM5QixJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztJQUM5QixDQUFDO0lBR0QseUZBQXlGO1FBQ3ZGLElBQUksQ0FBQyxNQUFNLENBQUM7WUFDVixNQUFNLEVBQUUsc0JBQXNCO1lBQzlCLFdBQVcsRUFBRSxDQUFDLE9BQU8sQ0FBQztZQUN0QixRQUFRLEVBQUUsWUFBWTtTQUN2QixDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzdCLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO0lBQzlCLENBQUM7SUFHRCw0RkFBNEY7UUFDMUYsSUFBSSxDQUFDLE1BQU0sQ0FBQztZQUNWLE1BQU0sRUFBRSxzQkFBc0I7WUFDOUIsUUFBUSxFQUFFLFlBQVk7U0FDdkIsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUM5QixJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztJQUM5QixDQUFDO0lBR0QsMkVBQTJFO1FBQ3pFLElBQUksQ0FBQyxNQUFNLENBQUM7WUFDVixNQUFNLEVBQUUsc0JBQXNCO1lBQzlCLFFBQVEsRUFBRSxZQUFZO1NBQ3ZCLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDOUIsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7SUFDOUIsQ0FBQztJQUdELHFGQUFxRjtRQUNuRixJQUFJLENBQUMsTUFBTSxDQUFDO1lBQ1YsTUFBTSxFQUFFLHVEQUF1RDtZQUMvRCxRQUFRLEVBQUUsWUFBWTtZQUN0QixJQUFJLEVBQUUsV0FBVztTQUNsQixDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsZUFBZSxDQUFDLGdDQUFnQyxDQUFDLENBQUM7UUFDdkQsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7SUFDOUIsQ0FBQztJQUdELG9FQUFvRTtRQUNsRSxJQUFJLENBQUMsTUFBTSxDQUFDO1lBQ1YsTUFBTSxFQUFFLHVEQUF1RDtZQUMvRCxRQUFRLEVBQUUsWUFBWTtTQUN2QixDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsZUFBZSxDQUFDLGdDQUFnQyxDQUFDLENBQUM7UUFDdkQsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7SUFDOUIsQ0FBQztJQUdELHNGQUFzRjtRQUNwRixJQUFJLENBQUMsTUFBTSxDQUFDO1lBQ1YsTUFBTSxFQUFFLDZDQUE2QztZQUNyRCxXQUFXLEVBQUUsQ0FBQyxPQUFPLENBQUM7WUFDdEIsUUFBUSxFQUFFLFlBQVk7U0FDdkIsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLGVBQWUsQ0FBQywrQkFBK0IsQ0FBQyxDQUFDO1FBQ3RELElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO0lBQzlCLENBQUM7SUFHRCx5RkFBeUY7UUFDdkYsSUFBSSxDQUFDLE1BQU0sQ0FBQztZQUNWLE1BQU0sRUFBRSw2Q0FBNkM7WUFDckQsUUFBUSxFQUFFLFlBQVk7U0FDdkIsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLGVBQWUsQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDO1FBQ3ZELElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO0lBQzlCLENBQUM7SUFHRCx3RUFBd0U7UUFDdEUsSUFBSSxDQUFDLE1BQU0sQ0FBQztZQUNWLE1BQU0sRUFBRSw2Q0FBNkM7U0FDdEQsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLGVBQWUsQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDO1FBQ3ZELElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO0lBQzlCLENBQUM7SUFHRCxxRkFBcUY7UUFDbkYsSUFBSSxDQUFDLE1BQU0sQ0FBQztZQUNWLE1BQU0sRUFBRSwwRUFBMEU7WUFDbEYsUUFBUSxFQUFFLFlBQVk7WUFDdEIsSUFBSSxFQUFFLFdBQVc7U0FDbEIsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLGVBQWUsQ0FBQyxpREFBaUQsQ0FBQyxDQUFDO1FBQ3hFLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO0lBQzlCLENBQUM7SUFHRCxvRUFBb0U7UUFDbEUsSUFBSSxDQUFDLE1BQU0sQ0FBQztZQUNWLE1BQU0sRUFBRSwwRUFBMEU7WUFDbEYsUUFBUSxFQUFFLFlBQVk7WUFDdEIsSUFBSSxFQUFFLFdBQVc7U0FDbEIsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLGVBQWUsQ0FBQyxpREFBaUQsQ0FBQyxDQUFDO1FBQ3hFLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO0lBQzlCLENBQUM7SUFHRCxzRkFBc0Y7UUFDcEYsSUFBSSxDQUFDLE1BQU0sQ0FBQztZQUNWLE1BQU0sRUFBRSxnRUFBZ0U7WUFDeEUsV0FBVyxFQUFFLENBQUMsT0FBTyxDQUFDO1lBQ3RCLFFBQVEsRUFBRSxZQUFZO1NBQ3ZCLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxlQUFlLENBQUMsZ0RBQWdELENBQUMsQ0FBQztRQUN2RSxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztJQUM5QixDQUFDO0lBR0QseUZBQXlGO1FBQ3ZGLElBQUksQ0FBQyxNQUFNLENBQUM7WUFDVixNQUFNLEVBQUUsZ0VBQWdFO1lBQ3hFLFFBQVEsRUFBRSxZQUFZO1NBQ3ZCLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxlQUFlLENBQUMsaURBQWlELENBQUMsQ0FBQztRQUN4RSxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztJQUM5QixDQUFDO0lBR0Qsd0VBQXdFO1FBQ3RFLElBQUksQ0FBQyxNQUFNLENBQUM7WUFDVixNQUFNLEVBQUUsZ0VBQWdFO1lBQ3hFLFFBQVEsRUFBRSxZQUFZO1NBQ3ZCLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxlQUFlLENBQUMsaURBQWlELENBQUMsQ0FBQztRQUN4RSxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztJQUM5QixDQUFDO0lBR0QsK0ZBQStGO1FBQzdGLElBQUksQ0FBQyxNQUFNLENBQUM7WUFDVixNQUFNLEVBQUUsNkVBQTZFO1lBQ3JGLFFBQVEsRUFBRSxZQUFZO1lBQ3RCLElBQUksRUFBRSxXQUFXO1NBQ2xCLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxlQUFlLENBQUMsb0RBQW9ELENBQUMsQ0FBQztRQUMzRSxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztJQUM5QixDQUFDO0lBR0QsOEVBQThFO1FBQzVFLElBQUksQ0FBQyxNQUFNLENBQUM7WUFDVixNQUFNLEVBQUUsNkVBQTZFO1lBQ3JGLFFBQVEsRUFBRSxZQUFZO1NBQ3ZCLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxlQUFlLENBQUMsb0RBQW9ELENBQUMsQ0FBQztRQUMzRSxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztJQUM5QixDQUFDO0lBR0QsZ0dBQWdHO1FBQzlGLElBQUksQ0FBQyxNQUFNLENBQUM7WUFDVixNQUFNLEVBQUUsbUVBQW1FO1lBQzNFLFFBQVEsRUFBRSxZQUFZO1lBQ3RCLFdBQVcsRUFBRSxDQUFDLE9BQU8sQ0FBQztTQUN2QixDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsZUFBZSxDQUFDLG1EQUFtRCxDQUFDLENBQUM7UUFDMUUsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7SUFDOUIsQ0FBQztJQUdELG1HQUFtRztRQUNqRyxJQUFJLENBQUMsTUFBTSxDQUFDO1lBQ1YsTUFBTSxFQUFFLG1FQUFtRTtZQUMzRSxRQUFRLEVBQUUsWUFBWTtTQUN2QixDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsZUFBZSxDQUFDLG9EQUFvRCxDQUFDLENBQUM7UUFDM0UsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7SUFDOUIsQ0FBQztJQUdELGtGQUFrRjtRQUNoRixJQUFJLENBQUMsTUFBTSxDQUFDO1lBQ1YsTUFBTSxFQUFFLG1FQUFtRTtTQUM1RSxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsZUFBZSxDQUFDLG9EQUFvRCxDQUFDLENBQUM7UUFDM0UsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7SUFDOUIsQ0FBQzs7QUEzUk0sbUNBQVMsR0FBRyxrQkFBa0IsQ0FBQztBQUd0QztJQURDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsQ0FBQzt1SUFVdkI7QUFHRDtJQURDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsQ0FBQztzSEFTdkI7QUFHRDtJQURDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsQ0FBQzt3SUFVdkI7QUFHRDtJQURDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsQ0FBQzsySUFTdkI7QUFHRDtJQURDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsQ0FBQzswSEFRdkI7QUFHRDtJQURDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsQ0FBQzt1SUFVdkI7QUFHRDtJQURDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsQ0FBQztzSEFTdkI7QUFHRDtJQURDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsQ0FBQzt3SUFVdkI7QUFHRDtJQURDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsQ0FBQzsySUFTdkI7QUFHRDtJQURDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsQ0FBQzswSEFTdkI7QUFHRDtJQURDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsQ0FBQztvSUFVdkI7QUFHRDtJQURDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsQ0FBQzttSEFTdkI7QUFHRDtJQURDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsQ0FBQztxSUFVdkI7QUFHRDtJQURDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsQ0FBQzt3SUFTdkI7QUFHRDtJQURDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsQ0FBQzt1SEFRdkI7QUFHRDtJQURDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsQ0FBQztvSUFVdkI7QUFHRDtJQURDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsQ0FBQzttSEFVdkI7QUFHRDtJQURDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsQ0FBQztxSUFVdkI7QUFHRDtJQURDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsQ0FBQzt3SUFTdkI7QUFHRDtJQURDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsQ0FBQzt1SEFTdkI7QUFHRDtJQURDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsQ0FBQzs4SUFVdkI7QUFHRDtJQURDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsQ0FBQzs2SEFTdkI7QUFHRDtJQURDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsQ0FBQzsrSUFVdkI7QUFHRDtJQURDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsQ0FBQztrSkFTdkI7QUFHRDtJQURDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsQ0FBQztpSUFRdkIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBSZW5kZXJUZXN0IH0gZnJvbSAnLi4vcmVuZGVyLXRlc3QnO1xuaW1wb3J0IHsgdGVzdCB9IGZyb20gJy4uL3Rlc3QtZGVjb3JhdG9yJztcblxuZXhwb3J0IGNsYXNzIEhhc0Jsb2NrUGFyYW1zSGVscGVyU3VpdGUgZXh0ZW5kcyBSZW5kZXJUZXN0IHtcbiAgc3RhdGljIHN1aXRlTmFtZSA9ICdoYXMtYmxvY2stcGFyYW1zJztcblxuICBAdGVzdCh7IGtpbmQ6ICdjdXJseScgfSlcbiAgJ3BhcmFtZXRlcml6ZWQgaGFzLWJsb2NrLXBhcmFtcyAoc3ViZXhwciwgZWxzZSkgd2hlbiBlbHNlIHN1cHBsaWVkIHdpdGhvdXQgYmxvY2sgcGFyYW1zJygpIHtcbiAgICB0aGlzLnJlbmRlcih7XG4gICAgICBsYXlvdXQ6ICd7eyNpZiAoaGFzLWJsb2NrLXBhcmFtcyBcImludmVyc2VcIil9fVllc3t7ZWxzZX19Tm97ey9pZn19JyxcbiAgICAgIHRlbXBsYXRlOiAnYmxvY2sgaGVyZScsXG4gICAgICBlbHNlOiAnZWxzZSBoZXJlJyxcbiAgICB9KTtcblxuICAgIHRoaXMuYXNzZXJ0Q29tcG9uZW50KCdObycpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxuXG4gIEB0ZXN0KHsga2luZDogJ2N1cmx5JyB9KVxuICAncGFyYW1ldGVyaXplZCBoYXMtYmxvY2stcGFyYW1zIChzdWJleHByLCBlbHNlKSB3aGVuIGVsc2Ugbm90IHN1cHBsaWVkJygpIHtcbiAgICB0aGlzLnJlbmRlcih7XG4gICAgICBsYXlvdXQ6ICd7eyNpZiAoaGFzLWJsb2NrLXBhcmFtcyBcImludmVyc2VcIil9fVllc3t7ZWxzZX19Tm97ey9pZn19JyxcbiAgICAgIHRlbXBsYXRlOiAnYmxvY2sgaGVyZScsXG4gICAgfSk7XG5cbiAgICB0aGlzLmFzc2VydENvbXBvbmVudCgnTm8nKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG4gIH1cblxuICBAdGVzdCh7IGtpbmQ6ICdjdXJseScgfSlcbiAgJ3BhcmFtZXRlcml6ZWQgaGFzLWJsb2NrLXBhcmFtcyAoc3ViZXhwciwgZGVmYXVsdCkgd2hlbiBibG9jayBzdXBwbGllZCB3aXRoIGJsb2NrIHBhcmFtcycoKSB7XG4gICAgdGhpcy5yZW5kZXIoe1xuICAgICAgbGF5b3V0OiAne3sjaWYgKGhhcy1ibG9jay1wYXJhbXMpfX1ZZXN7e2Vsc2V9fU5ve3svaWZ9fScsXG4gICAgICBibG9ja1BhcmFtczogWydwYXJhbSddLFxuICAgICAgdGVtcGxhdGU6ICdibG9jayBoZXJlJyxcbiAgICB9KTtcblxuICAgIHRoaXMuYXNzZXJ0Q29tcG9uZW50KCdZZXMnKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG4gIH1cblxuICBAdGVzdCh7IGtpbmQ6ICdjdXJseScgfSlcbiAgJ3BhcmFtZXRlcml6ZWQgaGFzLWJsb2NrLXBhcmFtcyAoc3ViZXhwciwgZGVmYXVsdCkgd2hlbiBibG9jayBzdXBwbGllZCB3aXRob3V0IGJsb2NrIHBhcmFtcycoKSB7XG4gICAgdGhpcy5yZW5kZXIoe1xuICAgICAgbGF5b3V0OiAne3sjaWYgKGhhcy1ibG9jay1wYXJhbXMpfX1ZZXN7e2Vsc2V9fU5ve3svaWZ9fScsXG4gICAgICB0ZW1wbGF0ZTogJ2Jsb2NrIGhlcmUnLFxuICAgIH0pO1xuXG4gICAgdGhpcy5hc3NlcnRDb21wb25lbnQoJ05vJyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuICB9XG5cbiAgQHRlc3QoeyBraW5kOiAnY3VybHknIH0pXG4gICdwYXJhbWV0ZXJpemVkIGhhcy1ibG9jay1wYXJhbXMgKHN1YmV4cHIsIGRlZmF1bHQpIHdoZW4gYmxvY2sgbm90IHN1cHBsaWVkJygpIHtcbiAgICB0aGlzLnJlbmRlcih7XG4gICAgICBsYXlvdXQ6ICd7eyNpZiAoaGFzLWJsb2NrLXBhcmFtcyl9fVllc3t7ZWxzZX19Tm97ey9pZn19JyxcbiAgICB9KTtcblxuICAgIHRoaXMuYXNzZXJ0Q29tcG9uZW50KCdObycpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxuXG4gIEB0ZXN0KHsga2luZDogJ2N1cmx5JyB9KVxuICAncGFyYW1ldGVyaXplZCBoYXMtYmxvY2stcGFyYW1zIChjb250ZW50LCBlbHNlKSB3aGVuIGVsc2Ugc3VwcGxpZWQgd2l0aG91dCBibG9jayBwYXJhbXMnKCkge1xuICAgIHRoaXMucmVuZGVyKHtcbiAgICAgIGxheW91dDogJ3t7aGFzLWJsb2NrLXBhcmFtcyBcImludmVyc2VcIn19JyxcbiAgICAgIHRlbXBsYXRlOiAnYmxvY2sgaGVyZScsXG4gICAgICBlbHNlOiAnZWxzZSBoZXJlJyxcbiAgICB9KTtcblxuICAgIHRoaXMuYXNzZXJ0Q29tcG9uZW50KCdmYWxzZScpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxuXG4gIEB0ZXN0KHsga2luZDogJ2N1cmx5JyB9KVxuICAncGFyYW1ldGVyaXplZCBoYXMtYmxvY2stcGFyYW1zIChjb250ZW50LCBlbHNlKSB3aGVuIGVsc2Ugbm90IHN1cHBsaWVkJygpIHtcbiAgICB0aGlzLnJlbmRlcih7XG4gICAgICBsYXlvdXQ6ICd7e2hhcy1ibG9jay1wYXJhbXMgXCJpbnZlcnNlXCJ9fScsXG4gICAgICB0ZW1wbGF0ZTogJ2Jsb2NrIGhlcmUnLFxuICAgIH0pO1xuXG4gICAgdGhpcy5hc3NlcnRDb21wb25lbnQoJ2ZhbHNlJyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuICB9XG5cbiAgQHRlc3QoeyBraW5kOiAnY3VybHknIH0pXG4gICdwYXJhbWV0ZXJpemVkIGhhcy1ibG9jay1wYXJhbXMgKGNvbnRlbnQsIGRlZmF1bHQpIHdoZW4gYmxvY2sgc3VwcGxpZWQgd2l0aCBibG9jayBwYXJhbXMnKCkge1xuICAgIHRoaXMucmVuZGVyKHtcbiAgICAgIGxheW91dDogJ3t7aGFzLWJsb2NrLXBhcmFtc319JyxcbiAgICAgIGJsb2NrUGFyYW1zOiBbJ3BhcmFtJ10sXG4gICAgICB0ZW1wbGF0ZTogJ2Jsb2NrIGhlcmUnLFxuICAgIH0pO1xuXG4gICAgdGhpcy5hc3NlcnRDb21wb25lbnQoJ3RydWUnKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG4gIH1cblxuICBAdGVzdCh7IGtpbmQ6ICdjdXJseScgfSlcbiAgJ3BhcmFtZXRlcml6ZWQgaGFzLWJsb2NrLXBhcmFtcyAoY29udGVudCwgZGVmYXVsdCkgd2hlbiBibG9jayBzdXBwbGllZCB3aXRob3V0IGJsb2NrIHBhcmFtcycoKSB7XG4gICAgdGhpcy5yZW5kZXIoe1xuICAgICAgbGF5b3V0OiAne3toYXMtYmxvY2stcGFyYW1zfX0nLFxuICAgICAgdGVtcGxhdGU6ICdibG9jayBoZXJlJyxcbiAgICB9KTtcblxuICAgIHRoaXMuYXNzZXJ0Q29tcG9uZW50KCdmYWxzZScpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxuXG4gIEB0ZXN0KHsga2luZDogJ2N1cmx5JyB9KVxuICAncGFyYW1ldGVyaXplZCBoYXMtYmxvY2stcGFyYW1zIChjb250ZW50LCBkZWZhdWx0KSB3aGVuIGJsb2NrIG5vdCBzdXBwbGllZCcoKSB7XG4gICAgdGhpcy5yZW5kZXIoe1xuICAgICAgbGF5b3V0OiAne3toYXMtYmxvY2stcGFyYW1zfX0nLFxuICAgICAgdGVtcGxhdGU6ICdibG9jayBoZXJlJyxcbiAgICB9KTtcblxuICAgIHRoaXMuYXNzZXJ0Q29tcG9uZW50KCdmYWxzZScpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxuXG4gIEB0ZXN0KHsga2luZDogJ2N1cmx5JyB9KVxuICAncGFyYW1ldGVyaXplZCBoYXMtYmxvY2stcGFyYW1zIChwcm9wLCBlbHNlKSB3aGVuIGVsc2Ugc3VwcGxpZWQgd2l0aG91dCBibG9jayBwYXJhbXMnKCkge1xuICAgIHRoaXMucmVuZGVyKHtcbiAgICAgIGxheW91dDogJzxidXR0b24gbmFtZT17e2hhcy1ibG9jay1wYXJhbXMgXCJpbnZlcnNlXCJ9fT48L2J1dHRvbj4nLFxuICAgICAgdGVtcGxhdGU6ICdibG9jayBoZXJlJyxcbiAgICAgIGVsc2U6ICdlbHNlIGhlcmUnLFxuICAgIH0pO1xuXG4gICAgdGhpcy5hc3NlcnRDb21wb25lbnQoJzxidXR0b24gbmFtZT1cImZhbHNlXCI+PC9idXR0b24+Jyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuICB9XG5cbiAgQHRlc3QoeyBraW5kOiAnY3VybHknIH0pXG4gICdwYXJhbWV0ZXJpemVkIGhhcy1ibG9jay1wYXJhbXMgKHByb3AsIGVsc2UpIHdoZW4gZWxzZSBub3Qgc3VwcGxpZWQnKCkge1xuICAgIHRoaXMucmVuZGVyKHtcbiAgICAgIGxheW91dDogJzxidXR0b24gbmFtZT17e2hhcy1ibG9jay1wYXJhbXMgXCJpbnZlcnNlXCJ9fT48L2J1dHRvbj4nLFxuICAgICAgdGVtcGxhdGU6ICdibG9jayBoZXJlJyxcbiAgICB9KTtcblxuICAgIHRoaXMuYXNzZXJ0Q29tcG9uZW50KCc8YnV0dG9uIG5hbWU9XCJmYWxzZVwiPjwvYnV0dG9uPicpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxuXG4gIEB0ZXN0KHsga2luZDogJ2N1cmx5JyB9KVxuICAncGFyYW1ldGVyaXplZCBoYXMtYmxvY2stcGFyYW1zIChwcm9wLCBkZWZhdWx0KSB3aGVuIGJsb2NrIHN1cHBsaWVkIHdpdGggYmxvY2sgcGFyYW1zJygpIHtcbiAgICB0aGlzLnJlbmRlcih7XG4gICAgICBsYXlvdXQ6ICc8YnV0dG9uIG5hbWU9e3toYXMtYmxvY2stcGFyYW1zfX0+PC9idXR0b24+JyxcbiAgICAgIGJsb2NrUGFyYW1zOiBbJ3BhcmFtJ10sXG4gICAgICB0ZW1wbGF0ZTogJ2Jsb2NrIGhlcmUnLFxuICAgIH0pO1xuXG4gICAgdGhpcy5hc3NlcnRDb21wb25lbnQoJzxidXR0b24gbmFtZT1cInRydWVcIj48L2J1dHRvbj4nKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG4gIH1cblxuICBAdGVzdCh7IGtpbmQ6ICdjdXJseScgfSlcbiAgJ3BhcmFtZXRlcml6ZWQgaGFzLWJsb2NrLXBhcmFtcyAocHJvcCwgZGVmYXVsdCkgd2hlbiBibG9jayBzdXBwbGllZCB3aXRob3V0IGJsb2NrIHBhcmFtcycoKSB7XG4gICAgdGhpcy5yZW5kZXIoe1xuICAgICAgbGF5b3V0OiAnPGJ1dHRvbiBuYW1lPXt7aGFzLWJsb2NrLXBhcmFtc319PjwvYnV0dG9uPicsXG4gICAgICB0ZW1wbGF0ZTogJ2Jsb2NrIGhlcmUnLFxuICAgIH0pO1xuXG4gICAgdGhpcy5hc3NlcnRDb21wb25lbnQoJzxidXR0b24gbmFtZT1cImZhbHNlXCI+PC9idXR0b24+Jyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuICB9XG5cbiAgQHRlc3QoeyBraW5kOiAnY3VybHknIH0pXG4gICdwYXJhbWV0ZXJpemVkIGhhcy1ibG9jay1wYXJhbXMgKHByb3AsIGRlZmF1bHQpIHdoZW4gYmxvY2sgbm90IHN1cHBsaWVkJygpIHtcbiAgICB0aGlzLnJlbmRlcih7XG4gICAgICBsYXlvdXQ6ICc8YnV0dG9uIG5hbWU9e3toYXMtYmxvY2stcGFyYW1zfX0+PC9idXR0b24+JyxcbiAgICB9KTtcblxuICAgIHRoaXMuYXNzZXJ0Q29tcG9uZW50KCc8YnV0dG9uIG5hbWU9XCJmYWxzZVwiPjwvYnV0dG9uPicpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxuXG4gIEB0ZXN0KHsga2luZDogJ2N1cmx5JyB9KVxuICAncGFyYW1ldGVyaXplZCBoYXMtYmxvY2stcGFyYW1zIChhdHRyLCBlbHNlKSB3aGVuIGVsc2Ugc3VwcGxpZWQgd2l0aG91dCBibG9jayBwYXJhbXMnKCkge1xuICAgIHRoaXMucmVuZGVyKHtcbiAgICAgIGxheW91dDogJzxidXR0b24gZGF0YS1oYXMtYmxvY2stcGFyYW1zPVwie3toYXMtYmxvY2stcGFyYW1zIFwiaW52ZXJzZVwifX1cIj48L2J1dHRvbj4nLFxuICAgICAgdGVtcGxhdGU6ICdibG9jayBoZXJlJyxcbiAgICAgIGVsc2U6ICdlbHNlIGhlcmUnLFxuICAgIH0pO1xuXG4gICAgdGhpcy5hc3NlcnRDb21wb25lbnQoJzxidXR0b24gZGF0YS1oYXMtYmxvY2stcGFyYW1zPVwiZmFsc2VcIj48L2J1dHRvbj4nKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG4gIH1cblxuICBAdGVzdCh7IGtpbmQ6ICdjdXJseScgfSlcbiAgJ3BhcmFtZXRlcml6ZWQgaGFzLWJsb2NrLXBhcmFtcyAoYXR0ciwgZWxzZSkgd2hlbiBlbHNlIG5vdCBzdXBwbGllZCcoKSB7XG4gICAgdGhpcy5yZW5kZXIoe1xuICAgICAgbGF5b3V0OiAnPGJ1dHRvbiBkYXRhLWhhcy1ibG9jay1wYXJhbXM9XCJ7e2hhcy1ibG9jay1wYXJhbXMgXCJpbnZlcnNlXCJ9fVwiPjwvYnV0dG9uPicsXG4gICAgICB0ZW1wbGF0ZTogJ2Jsb2NrIGhlcmUnLFxuICAgICAgZWxzZTogJ2Vsc2UgaGVyZScsXG4gICAgfSk7XG5cbiAgICB0aGlzLmFzc2VydENvbXBvbmVudCgnPGJ1dHRvbiBkYXRhLWhhcy1ibG9jay1wYXJhbXM9XCJmYWxzZVwiPjwvYnV0dG9uPicpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxuXG4gIEB0ZXN0KHsga2luZDogJ2N1cmx5JyB9KVxuICAncGFyYW1ldGVyaXplZCBoYXMtYmxvY2stcGFyYW1zIChhdHRyLCBkZWZhdWx0KSB3aGVuIGJsb2NrIHN1cHBsaWVkIHdpdGggYmxvY2sgcGFyYW1zJygpIHtcbiAgICB0aGlzLnJlbmRlcih7XG4gICAgICBsYXlvdXQ6ICc8YnV0dG9uIGRhdGEtaGFzLWJsb2NrLXBhcmFtcz1cInt7aGFzLWJsb2NrLXBhcmFtc319XCI+PC9idXR0b24+JyxcbiAgICAgIGJsb2NrUGFyYW1zOiBbJ3BhcmFtJ10sXG4gICAgICB0ZW1wbGF0ZTogJ2Jsb2NrIGhlcmUnLFxuICAgIH0pO1xuXG4gICAgdGhpcy5hc3NlcnRDb21wb25lbnQoJzxidXR0b24gZGF0YS1oYXMtYmxvY2stcGFyYW1zPVwidHJ1ZVwiPjwvYnV0dG9uPicpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxuXG4gIEB0ZXN0KHsga2luZDogJ2N1cmx5JyB9KVxuICAncGFyYW1ldGVyaXplZCBoYXMtYmxvY2stcGFyYW1zIChhdHRyLCBkZWZhdWx0KSB3aGVuIGJsb2NrIHN1cHBsaWVkIHdpdGhvdXQgYmxvY2sgcGFyYW1zJygpIHtcbiAgICB0aGlzLnJlbmRlcih7XG4gICAgICBsYXlvdXQ6ICc8YnV0dG9uIGRhdGEtaGFzLWJsb2NrLXBhcmFtcz1cInt7aGFzLWJsb2NrLXBhcmFtc319XCI+PC9idXR0b24+JyxcbiAgICAgIHRlbXBsYXRlOiAnYmxvY2sgaGVyZScsXG4gICAgfSk7XG5cbiAgICB0aGlzLmFzc2VydENvbXBvbmVudCgnPGJ1dHRvbiBkYXRhLWhhcy1ibG9jay1wYXJhbXM9XCJmYWxzZVwiPjwvYnV0dG9uPicpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxuXG4gIEB0ZXN0KHsga2luZDogJ2N1cmx5JyB9KVxuICAncGFyYW1ldGVyaXplZCBoYXMtYmxvY2stcGFyYW1zIChhdHRyLCBkZWZhdWx0KSB3aGVuIGJsb2NrIG5vdCBzdXBwbGllZCcoKSB7XG4gICAgdGhpcy5yZW5kZXIoe1xuICAgICAgbGF5b3V0OiAnPGJ1dHRvbiBkYXRhLWhhcy1ibG9jay1wYXJhbXM9XCJ7e2hhcy1ibG9jay1wYXJhbXN9fVwiPjwvYnV0dG9uPicsXG4gICAgICB0ZW1wbGF0ZTogJ2Jsb2NrIGhlcmUnLFxuICAgIH0pO1xuXG4gICAgdGhpcy5hc3NlcnRDb21wb25lbnQoJzxidXR0b24gZGF0YS1oYXMtYmxvY2stcGFyYW1zPVwiZmFsc2VcIj48L2J1dHRvbj4nKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG4gIH1cblxuICBAdGVzdCh7IGtpbmQ6ICdjdXJseScgfSlcbiAgJ3BhcmFtZXRlcml6ZWQgaGFzLWJsb2NrLXBhcmFtcyAoY29uY2F0dGVkIGF0dHIsIGVsc2UpIHdoZW4gZWxzZSBzdXBwbGllZCB3aXRob3V0IGJsb2NrIHBhcmFtcycoKSB7XG4gICAgdGhpcy5yZW5kZXIoe1xuICAgICAgbGF5b3V0OiAnPGJ1dHRvbiBkYXRhLWhhcy1ibG9jay1wYXJhbXM9XCJpcy17e2hhcy1ibG9jay1wYXJhbXMgXCJpbnZlcnNlXCJ9fVwiPjwvYnV0dG9uPicsXG4gICAgICB0ZW1wbGF0ZTogJ2Jsb2NrIGhlcmUnLFxuICAgICAgZWxzZTogJ2Vsc2UgaGVyZScsXG4gICAgfSk7XG5cbiAgICB0aGlzLmFzc2VydENvbXBvbmVudCgnPGJ1dHRvbiBkYXRhLWhhcy1ibG9jay1wYXJhbXM9XCJpcy1mYWxzZVwiPjwvYnV0dG9uPicpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxuXG4gIEB0ZXN0KHsga2luZDogJ2N1cmx5JyB9KVxuICAncGFyYW1ldGVyaXplZCBoYXMtYmxvY2stcGFyYW1zIChjb25jYXR0ZWQgYXR0ciwgZWxzZSkgd2hlbiBlbHNlIG5vdCBzdXBwbGllZCcoKSB7XG4gICAgdGhpcy5yZW5kZXIoe1xuICAgICAgbGF5b3V0OiAnPGJ1dHRvbiBkYXRhLWhhcy1ibG9jay1wYXJhbXM9XCJpcy17e2hhcy1ibG9jay1wYXJhbXMgXCJpbnZlcnNlXCJ9fVwiPjwvYnV0dG9uPicsXG4gICAgICB0ZW1wbGF0ZTogJ2Jsb2NrIGhlcmUnLFxuICAgIH0pO1xuXG4gICAgdGhpcy5hc3NlcnRDb21wb25lbnQoJzxidXR0b24gZGF0YS1oYXMtYmxvY2stcGFyYW1zPVwiaXMtZmFsc2VcIj48L2J1dHRvbj4nKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG4gIH1cblxuICBAdGVzdCh7IGtpbmQ6ICdjdXJseScgfSlcbiAgJ3BhcmFtZXRlcml6ZWQgaGFzLWJsb2NrLXBhcmFtcyAoY29uY2F0dGVkIGF0dHIsIGRlZmF1bHQpIHdoZW4gYmxvY2sgc3VwcGxpZWQgd2l0aCBibG9jayBwYXJhbXMnKCkge1xuICAgIHRoaXMucmVuZGVyKHtcbiAgICAgIGxheW91dDogJzxidXR0b24gZGF0YS1oYXMtYmxvY2stcGFyYW1zPVwiaXMte3toYXMtYmxvY2stcGFyYW1zfX1cIj48L2J1dHRvbj4nLFxuICAgICAgdGVtcGxhdGU6ICdibG9jayBoZXJlJyxcbiAgICAgIGJsb2NrUGFyYW1zOiBbJ3BhcmFtJ10sXG4gICAgfSk7XG5cbiAgICB0aGlzLmFzc2VydENvbXBvbmVudCgnPGJ1dHRvbiBkYXRhLWhhcy1ibG9jay1wYXJhbXM9XCJpcy10cnVlXCI+PC9idXR0b24+Jyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuICB9XG5cbiAgQHRlc3QoeyBraW5kOiAnY3VybHknIH0pXG4gICdwYXJhbWV0ZXJpemVkIGhhcy1ibG9jay1wYXJhbXMgKGNvbmNhdHRlZCBhdHRyLCBkZWZhdWx0KSB3aGVuIGJsb2NrIHN1cHBsaWVkIHdpdGhvdXQgYmxvY2sgcGFyYW1zJygpIHtcbiAgICB0aGlzLnJlbmRlcih7XG4gICAgICBsYXlvdXQ6ICc8YnV0dG9uIGRhdGEtaGFzLWJsb2NrLXBhcmFtcz1cImlzLXt7aGFzLWJsb2NrLXBhcmFtc319XCI+PC9idXR0b24+JyxcbiAgICAgIHRlbXBsYXRlOiAnYmxvY2sgaGVyZScsXG4gICAgfSk7XG5cbiAgICB0aGlzLmFzc2VydENvbXBvbmVudCgnPGJ1dHRvbiBkYXRhLWhhcy1ibG9jay1wYXJhbXM9XCJpcy1mYWxzZVwiPjwvYnV0dG9uPicpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxuXG4gIEB0ZXN0KHsga2luZDogJ2N1cmx5JyB9KVxuICAncGFyYW1ldGVyaXplZCBoYXMtYmxvY2stcGFyYW1zIChjb25jYXR0ZWQgYXR0ciwgZGVmYXVsdCkgd2hlbiBibG9jayBub3Qgc3VwcGxpZWQnKCkge1xuICAgIHRoaXMucmVuZGVyKHtcbiAgICAgIGxheW91dDogJzxidXR0b24gZGF0YS1oYXMtYmxvY2stcGFyYW1zPVwiaXMte3toYXMtYmxvY2stcGFyYW1zfX1cIj48L2J1dHRvbj4nLFxuICAgIH0pO1xuXG4gICAgdGhpcy5hc3NlcnRDb21wb25lbnQoJzxidXR0b24gZGF0YS1oYXMtYmxvY2stcGFyYW1zPVwiaXMtZmFsc2VcIj48L2J1dHRvbj4nKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG4gIH1cbn1cbiJdfQ==