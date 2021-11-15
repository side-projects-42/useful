import expect from 'expect';
import NestableRecord from '../src';

import {List} from 'immutable';

// TODO: turn into tests
/*
const Point = Immutable.Record({x: 0, y: 0}, 'Point');

const Rect = NestableRecord({
  a: null,
  b: null,
}, {
  a: Point,
  b: Point,
}, 'Rect');

const PointCloud = NestableRecord({
  points: null,
}, {
  points: [Immutable.Set, Point],
}, 'PointCloud');

const rect = Rect({a: {x: 1, y: 1}, b: {x: 2, y: 2}});
console.log(rect);

const cloud = PointCloud({points: [{x: 1, y: 1}, {x: 2, y: 2}]});
console.log(cloud);
*/

describe('NestableRecord', () => {
  it('should exists', () => {
    expect(NestableRecord != null).toBe(true);
  });

  it('should nest deeply', () => {
    const MultiPolygon = NestableRecord({
      type: 'MultiPolygon',
      coordinates: List(),
    }, {
      type: 'MultiPolygon',
      coordinates: [List, List, List, List],
    }, 'MultiPolygon');

    const multiPolygon = MultiPolygon({
      coordinates: [
        [[[102.0, 2.0], [103.0, 2.0], [103.0, 3.0], [102.0, 3.0], [102.0, 2.0]]],
        [
          [[100.0, 0.0], [101.0, 0.0], [101.0, 1.0], [100.0, 1.0], [100.0, 0.0]],
          [[100.2, 0.2], [100.8, 0.2], [100.8, 0.8], [100.2, 0.8], [100.2, 0.2]],
        ],
      ],
    });

    expect(multiPolygon.coordinates instanceof List).toBe(true);
    expect(multiPolygon.coordinates.first() instanceof List).toBe(true);
    expect(multiPolygon.coordinates.first().first() instanceof List).toBe(true);
    expect(multiPolygon.coordinates.first().first().first() instanceof List).toBe(true);
    expect(multiPolygon.coordinates.first().first().first().size).toBe(2);
  });
});
