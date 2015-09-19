import DOMHelper from "../dom-helper";
var dom;
QUnit.module('DOM Helper (Node)', {
    afterEach: function () {
        dom = null;
    }
});
if (typeof document === 'undefined') {
    test('it throws when instantiated without document', function () {
        var throws = false;
        try {
            dom = new DOMHelper();
        }
        catch (e) {
            throws = true;
        }
        ok(throws, 'dom helper cannot instantiate');
    });
}
test('it instantiates with a stub document', function () {
    var called = false;
    var element = {};
    var doc = {
        createElement: function () {
            called = true;
            return element;
        }
    };
    dom = new DOMHelper(doc);
    ok(dom, 'dom helper can instantiate');
    var createdElement = dom.createElement('div');
    equal(createdElement, element, 'dom helper calls passed stub');
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9tLWhlbHBlci1ub2RlLXRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvaHRtbGJhcnMtY29tcGlsZXIvbGliL3Rlc3RzL2RvbS1oZWxwZXItbm9kZS10ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJPQUFPLFNBQVMsTUFBTSxlQUFlO0FBRXJDLElBQUksR0FBRyxDQUFDO0FBRVIsS0FBSyxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsRUFBRTtJQUNoQyxTQUFTLEVBQUU7UUFDVCxHQUFHLEdBQUcsSUFBSSxDQUFDO0lBQ2IsQ0FBQztDQUNGLENBQUMsQ0FBQztBQUVILEVBQUUsQ0FBQyxDQUFDLE9BQU8sUUFBUSxLQUFLLFdBQVcsQ0FBQyxDQUFDLENBQUM7SUFDcEMsSUFBSSxDQUFDLDhDQUE4QyxFQUFFO1FBQ25ELElBQUksTUFBTSxHQUFHLEtBQUssQ0FBQztRQUNuQixJQUFJLENBQUM7WUFDSCxHQUFHLEdBQUcsSUFBSSxTQUFTLEVBQUUsQ0FBQztRQUN4QixDQUFFO1FBQUEsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNYLE1BQU0sR0FBRyxJQUFJLENBQUM7UUFDaEIsQ0FBQztRQUNELEVBQUUsQ0FBQyxNQUFNLEVBQUUsK0JBQStCLENBQUMsQ0FBQztJQUM5QyxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFFRCxJQUFJLENBQUMsc0NBQXNDLEVBQUU7SUFDM0MsSUFBSSxNQUFNLEdBQUcsS0FBSyxDQUFDO0lBQ25CLElBQUksT0FBTyxHQUFHLEVBQUUsQ0FBQztJQUNqQixJQUFJLEdBQUcsR0FBRztRQUNSLGFBQWEsRUFBRTtZQUNiLE1BQU0sR0FBRyxJQUFJLENBQUM7WUFDZCxNQUFNLENBQUMsT0FBTyxDQUFDO1FBQ2pCLENBQUM7S0FDRixDQUFDO0lBQ0YsR0FBRyxHQUFHLElBQUksU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3pCLEVBQUUsQ0FBQyxHQUFHLEVBQUUsNEJBQTRCLENBQUMsQ0FBQztJQUN0QyxJQUFJLGNBQWMsR0FBRyxHQUFHLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzlDLEtBQUssQ0FBQyxjQUFjLEVBQUUsT0FBTyxFQUFFLDhCQUE4QixDQUFDLENBQUM7QUFDakUsQ0FBQyxDQUFDLENBQUMifQ==