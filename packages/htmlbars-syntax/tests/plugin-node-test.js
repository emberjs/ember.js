import { parse, Walker } from '../htmlbars-syntax';
QUnit.module('[htmlbars-syntax] Plugins - AST Transforms');
test('AST plugins can be provided to the compiler', function () {
    expect(1);
    function Plugin() { }
    Plugin.prototype.transform = function () {
        ok(true, 'transform was called!');
    };
    parse('<div></div>', {
        plugins: {
            ast: [Plugin]
        }
    });
});
test('provides syntax package as `syntax` prop if value is null', function () {
    expect(1);
    function Plugin() { }
    Plugin.prototype.transform = function () {
        equal(this.syntax.Walker, Walker);
    };
    parse('<div></div>', {
        plugins: {
            ast: [Plugin]
        }
    });
});
test('AST plugins can modify the AST', function () {
    expect(1);
    var expected = "OOOPS, MESSED THAT UP!";
    function Plugin() { }
    Plugin.prototype.transform = function () {
        return expected;
    };
    var ast = parse('<div></div>', {
        plugins: {
            ast: [Plugin]
        }
    });
    equal(ast, expected, 'return value from AST transform is used');
});
test('AST plugins can be chained', function () {
    expect(2);
    var expected = "OOOPS, MESSED THAT UP!";
    function Plugin() { }
    Plugin.prototype.transform = function () {
        return expected;
    };
    function SecondaryPlugin() { }
    SecondaryPlugin.prototype.transform = function (ast) {
        equal(ast, expected, 'return value from AST transform is used');
        return 'BOOM!';
    };
    var ast = parse('<div></div>', {
        plugins: {
            ast: [
                Plugin,
                SecondaryPlugin
            ]
        }
    });
    equal(ast, 'BOOM!', 'return value from last AST transform is used');
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGx1Z2luLW5vZGUtdGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9odG1sYmFycy1zeW50YXgvdGVzdHMvcGx1Z2luLW5vZGUtdGVzdC50cyJdLCJuYW1lcyI6WyJQbHVnaW4iLCJTZWNvbmRhcnlQbHVnaW4iXSwibWFwcGluZ3MiOiJPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9CQUFvQjtBQUVsRCxLQUFLLENBQUMsTUFBTSxDQUFDLDRDQUE0QyxDQUFDLENBQUM7QUFFM0QsSUFBSSxDQUFDLDZDQUE2QyxFQUFFO0lBQ2xELE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUVWLG9CQUFvQkEsQ0FBQ0E7SUFDckIsTUFBTSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUc7UUFDM0IsRUFBRSxDQUFDLElBQUksRUFBRSx1QkFBdUIsQ0FBQyxDQUFDO0lBQ3BDLENBQUMsQ0FBQztJQUVGLEtBQUssQ0FBQyxhQUFhLEVBQUU7UUFDbkIsT0FBTyxFQUFFO1lBQ1AsR0FBRyxFQUFFLENBQUUsTUFBTSxDQUFFO1NBQ2hCO0tBQ0YsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUM7QUFFSCxJQUFJLENBQUMsMkRBQTJELEVBQUU7SUFDaEUsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRVYsb0JBQW9CQSxDQUFDQTtJQUNyQixNQUFNLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBRztRQUMzQixLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDcEMsQ0FBQyxDQUFDO0lBRUYsS0FBSyxDQUFDLGFBQWEsRUFBRTtRQUNuQixPQUFPLEVBQUU7WUFDUCxHQUFHLEVBQUUsQ0FBRSxNQUFNLENBQUU7U0FDaEI7S0FDRixDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQztBQUVILElBQUksQ0FBQyxnQ0FBZ0MsRUFBRTtJQUNyQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFVixJQUFJLFFBQVEsR0FBRyx3QkFBd0IsQ0FBQztJQUV4QyxvQkFBb0JBLENBQUNBO0lBQ3JCLE1BQU0sQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFHO1FBQzNCLE1BQU0sQ0FBQyxRQUFRLENBQUM7SUFDbEIsQ0FBQyxDQUFDO0lBRUYsSUFBSSxHQUFHLEdBQUcsS0FBSyxDQUFDLGFBQWEsRUFBRTtRQUM3QixPQUFPLEVBQUU7WUFDUCxHQUFHLEVBQUUsQ0FBRSxNQUFNLENBQUU7U0FDaEI7S0FDRixDQUFDLENBQUM7SUFFSCxLQUFLLENBQUMsR0FBRyxFQUFFLFFBQVEsRUFBRSx5Q0FBeUMsQ0FBQyxDQUFDO0FBQ2xFLENBQUMsQ0FBQyxDQUFDO0FBRUgsSUFBSSxDQUFDLDRCQUE0QixFQUFFO0lBQ2pDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUVWLElBQUksUUFBUSxHQUFHLHdCQUF3QixDQUFDO0lBRXhDLG9CQUFvQkEsQ0FBQ0E7SUFDckIsTUFBTSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUc7UUFDM0IsTUFBTSxDQUFDLFFBQVEsQ0FBQztJQUNsQixDQUFDLENBQUM7SUFFRiw2QkFBNkJDLENBQUNBO0lBQzlCLGVBQWUsQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFHLFVBQVMsR0FBRztRQUNoRCxLQUFLLENBQUMsR0FBRyxFQUFFLFFBQVEsRUFBRSx5Q0FBeUMsQ0FBQyxDQUFDO1FBRWhFLE1BQU0sQ0FBQyxPQUFPLENBQUM7SUFDakIsQ0FBQyxDQUFDO0lBRUYsSUFBSSxHQUFHLEdBQUcsS0FBSyxDQUFDLGFBQWEsRUFBRTtRQUM3QixPQUFPLEVBQUU7WUFDUCxHQUFHLEVBQUU7Z0JBQ0gsTUFBTTtnQkFDTixlQUFlO2FBQ2hCO1NBQ0Y7S0FDRixDQUFDLENBQUM7SUFFSCxLQUFLLENBQUMsR0FBRyxFQUFFLE9BQU8sRUFBRSw4Q0FBOEMsQ0FBQyxDQUFDO0FBQ3RFLENBQUMsQ0FBQyxDQUFDIn0=