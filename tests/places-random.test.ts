// places-random.test.ts: heatmap cells get honest place names (nearest large city, or none), and an empty brief gets
// a random known title that never repeats the previous one.
import assert from "node:assert/strict";
import test from "node:test";
import { distanceKm, nearestCity, topAreas } from "../lib/ui/places.ts";
import { RANDOM_WORKS, randomWork } from "../lib/ui/random.ts";

test("a cell is named after the nearest listed city within 120 km, else left unnamed", () => {
  assert.equal(nearestCity({ lat: 40.73, lon: -73.99 })?.name, "New York, NY");
  assert.equal(nearestCity({ lat: 37.8, lon: -122.27 })?.name, "San Francisco, CA");
  assert.equal(nearestCity({ lat: 44.0, lon: -103.0 }), null, "rural South Dakota stays unnamed");
  assert.ok(Math.abs(distanceKm({ lat: 40.71, lon: -74.01 }, { lat: 42.36, lon: -71.06 }) - 306) < 10);
});

test("top areas count cells per city, most first", () => {
  const cells = [{ lat: 40.7, lon: -74 }, { lat: 40.8, lon: -73.9 }, { lat: 34.05, lon: -118.2 }, { lat: 44, lon: -103 }];
  assert.deepEqual(topAreas(cells).map((a) => [a.city.name, a.cells]), [["New York, NY", 2], ["Los Angeles, CA", 1]]);
});

test("a random title comes from the list and never repeats the previous one", () => {
  for (let i = 0; i < 50; i++) {
    const w = randomWork("Dune");
    assert.ok(RANDOM_WORKS.includes(w as (typeof RANDOM_WORKS)[number]));
    assert.notEqual(w, "Dune");
  }
  assert.equal(randomWork("", () => 0.999999), RANDOM_WORKS[RANDOM_WORKS.length - 1]);
});
