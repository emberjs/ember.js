import { compile } from "../htmlbars-compiler/compiler";
QUnit.module('compile: buildMeta');
test('is merged into meta in template', function () {
    var template = compile('Hi, {{name}}!', {
        buildMeta: function () {
            return { blah: 'zorz' };
        }
    });
    equal(template.meta.blah, 'zorz', 'return value from buildMeta was pass through');
});
test('the program is passed to the callback function', function () {
    var template = compile('Hi, {{name}}!', {
        buildMeta: function (program) {
            return { loc: program.loc };
        }
    });
    equal(template.meta.loc.start.line, 1, 'the loc was passed through from program');
});
test('value keys are properly stringified', function () {
    var template = compile('Hi, {{name}}!', {
        buildMeta: function () {
            return { 'loc-derp.lol': 'zorz' };
        }
    });
    equal(template.meta['loc-derp.lol'], 'zorz', 'return value from buildMeta was pass through');
});
test('returning undefined does not throw errors', function () {
    var template = compile('Hi, {{name}}!', {
        buildMeta: function () {
            return;
        }
    });
    ok(template.meta, 'meta is present in template, even if empty');
});
test('options are not required for `compile`', function () {
    var template = compile('Hi, {{name}}!');
    ok(template.meta, 'meta is present in template, even if empty');
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGlsZS10ZXN0cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9odG1sYmFycy1jb21waWxlci90ZXN0cy9jb21waWxlLXRlc3RzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCO0FBRXZELEtBQUssQ0FBQyxNQUFNLENBQUMsb0JBQW9CLENBQUMsQ0FBQztBQUVuQyxJQUFJLENBQUMsaUNBQWlDLEVBQUU7SUFDdEMsSUFBSSxRQUFRLEdBQUcsT0FBTyxDQUFDLGVBQWUsRUFBRTtRQUN0QyxTQUFTLEVBQUU7WUFDVCxNQUFNLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLENBQUM7UUFDMUIsQ0FBQztLQUNGLENBQUMsQ0FBQztJQUVILEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsOENBQThDLENBQUMsQ0FBQztBQUNwRixDQUFDLENBQUMsQ0FBQztBQUVILElBQUksQ0FBQyxnREFBZ0QsRUFBRTtJQUNyRCxJQUFJLFFBQVEsR0FBRyxPQUFPLENBQUMsZUFBZSxFQUFFO1FBQ3RDLFNBQVMsRUFBRSxVQUFTLE9BQU87WUFDekIsTUFBTSxDQUFDLEVBQUUsR0FBRyxFQUFFLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUM5QixDQUFDO0tBQ0YsQ0FBQyxDQUFDO0lBRUgsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLHlDQUF5QyxDQUFDLENBQUM7QUFDcEYsQ0FBQyxDQUFDLENBQUM7QUFFSCxJQUFJLENBQUMscUNBQXFDLEVBQUU7SUFDMUMsSUFBSSxRQUFRLEdBQUcsT0FBTyxDQUFDLGVBQWUsRUFBRTtRQUN0QyxTQUFTLEVBQUU7WUFDVCxNQUFNLENBQUMsRUFBRSxjQUFjLEVBQUUsTUFBTSxFQUFFLENBQUM7UUFDcEMsQ0FBQztLQUNGLENBQUMsQ0FBQztJQUVILEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxFQUFFLE1BQU0sRUFBRSw4Q0FBOEMsQ0FBQyxDQUFDO0FBQy9GLENBQUMsQ0FBQyxDQUFDO0FBRUgsSUFBSSxDQUFDLDJDQUEyQyxFQUFFO0lBQ2hELElBQUksUUFBUSxHQUFHLE9BQU8sQ0FBQyxlQUFlLEVBQUU7UUFDdEMsU0FBUyxFQUFFO1lBQ1QsTUFBTSxDQUFDO1FBQ1QsQ0FBQztLQUNGLENBQUMsQ0FBQztJQUVILEVBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLDRDQUE0QyxDQUFDLENBQUM7QUFDbEUsQ0FBQyxDQUFDLENBQUM7QUFFSCxJQUFJLENBQUMsd0NBQXdDLEVBQUU7SUFDN0MsSUFBSSxRQUFRLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0lBRXhDLEVBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLDRDQUE0QyxDQUFDLENBQUM7QUFDbEUsQ0FBQyxDQUFDLENBQUMifQ==