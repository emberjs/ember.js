import { RehydrateBuilder } from '@glimmer/runtime';
export class DebugRehydrationBuilder extends RehydrateBuilder {
    constructor() {
        super(...arguments);
        this.clearedNodes = [];
    }
    remove(node) {
        let next = super.remove(node);
        let el = node;
        if (node.nodeType !== 8) {
            if (el.nodeType === 1) {
                // don't stat serialized cursor positions
                if (el.tagName !== 'SCRIPT' && !el.getAttribute('gmlr')) {
                    this.clearedNodes.push(node);
                }
            }
            else {
                this.clearedNodes.push(node);
            }
        }
        return next;
    }
}
export function debugRehydration(env, cursor) {
    return DebugRehydrationBuilder.forInitialRender(env, cursor);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVpbGRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL2xpYi9tb2Rlcy9yZWh5ZHJhdGlvbi9idWlsZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBSXBELE1BQU0sT0FBTyx1QkFBd0IsU0FBUSxnQkFBZ0I7SUFBN0Q7O1FBQ0UsaUJBQVksR0FBaUIsRUFBRSxDQUFDO0lBbUJsQyxDQUFDO0lBakJDLE1BQU0sQ0FBQyxJQUFnQjtRQUNyQixJQUFJLElBQUksR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzlCLElBQUksRUFBRSxHQUFHLElBQWUsQ0FBQztRQUV6QixJQUFJLElBQUksQ0FBQyxRQUFRLEtBQUssQ0FBQyxFQUFFO1lBQ3ZCLElBQUksRUFBRSxDQUFDLFFBQVEsS0FBSyxDQUFDLEVBQUU7Z0JBQ3JCLHlDQUF5QztnQkFDekMsSUFBSSxFQUFFLENBQUMsT0FBTyxLQUFLLFFBQVEsSUFBSSxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLEVBQUU7b0JBQ3ZELElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2lCQUM5QjthQUNGO2lCQUFNO2dCQUNMLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQzlCO1NBQ0Y7UUFFRCxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7Q0FDRjtBQUVELE1BQU0sVUFBVSxnQkFBZ0IsQ0FBQyxHQUFnQixFQUFFLE1BQWM7SUFDL0QsT0FBTyx1QkFBdUIsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLENBQUM7QUFDL0QsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFJlaHlkcmF0ZUJ1aWxkZXIgfSBmcm9tICdAZ2xpbW1lci9ydW50aW1lJztcbmltcG9ydCB7IFNpbXBsZU5vZGUgfSBmcm9tICdAc2ltcGxlLWRvbS9pbnRlcmZhY2UnO1xuaW1wb3J0IHsgRW52aXJvbm1lbnQsIEN1cnNvciwgRWxlbWVudEJ1aWxkZXIgfSBmcm9tICdAZ2xpbW1lci9pbnRlcmZhY2VzJztcblxuZXhwb3J0IGNsYXNzIERlYnVnUmVoeWRyYXRpb25CdWlsZGVyIGV4dGVuZHMgUmVoeWRyYXRlQnVpbGRlciB7XG4gIGNsZWFyZWROb2RlczogU2ltcGxlTm9kZVtdID0gW107XG5cbiAgcmVtb3ZlKG5vZGU6IFNpbXBsZU5vZGUpIHtcbiAgICBsZXQgbmV4dCA9IHN1cGVyLnJlbW92ZShub2RlKTtcbiAgICBsZXQgZWwgPSBub2RlIGFzIEVsZW1lbnQ7XG5cbiAgICBpZiAobm9kZS5ub2RlVHlwZSAhPT0gOCkge1xuICAgICAgaWYgKGVsLm5vZGVUeXBlID09PSAxKSB7XG4gICAgICAgIC8vIGRvbid0IHN0YXQgc2VyaWFsaXplZCBjdXJzb3IgcG9zaXRpb25zXG4gICAgICAgIGlmIChlbC50YWdOYW1lICE9PSAnU0NSSVBUJyAmJiAhZWwuZ2V0QXR0cmlidXRlKCdnbWxyJykpIHtcbiAgICAgICAgICB0aGlzLmNsZWFyZWROb2Rlcy5wdXNoKG5vZGUpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmNsZWFyZWROb2Rlcy5wdXNoKG5vZGUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBuZXh0O1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZWJ1Z1JlaHlkcmF0aW9uKGVudjogRW52aXJvbm1lbnQsIGN1cnNvcjogQ3Vyc29yKTogRWxlbWVudEJ1aWxkZXIge1xuICByZXR1cm4gRGVidWdSZWh5ZHJhdGlvbkJ1aWxkZXIuZm9ySW5pdGlhbFJlbmRlcihlbnYsIGN1cnNvcik7XG59XG4iXX0=