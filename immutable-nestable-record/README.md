Immutable Nestable Record
=========================

Record factory that supports nesting of Immutable.js recods and collections.

```js
const Point = Immutable.Record({x: 0, y: 0}, 'Point');

const Rect = NestableRecord({
  a: null,
  b: null,
}, {
  a: Point,
  b: Point,
}, 'Rect');

Rect({a: {x: 1, y: 1}, b: {x: 2, y: 2}});
// => Rect { "a": Point { "x": 1, "y": 1 }, "b": Point { "x": 2, "y": 2 } }

const PointCloud = NestableRecord({
  points: null,
}, {
  points: [Immutable.Set, Point],
}, 'PointCloud');

PointCloud({points: [{x: 1, y: 1}, {x: 2, y: 2}]});
// => PointCloud { "points": Set { Point { "x": 1, "y": 1 }, Point { "x": 2, "y": 2 } } }
```
