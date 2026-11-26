// Shared by scripts/fetch-terrain-tiles.mjs and scripts/generate-map-terrain.mjs.
// Each tier is one shaded-relief image covering a lon/lat box of the map.
// `zoom` is the elevation tile zoom read; `ppu` is output pixels per map unit
// (10 map units = 1° of latitude). Finer tiers are only loaded when zoomed in.
export const TIERS = [
  { name: "world", lon: [-10, 70], lat: [5, 48], zoom: 5, ppu: 2.6, exaggeration: 7 },
  { name: "region", lon: [23, 50], lat: [25, 42], zoom: 7, ppu: 8, exaggeration: 3.5 },
  { name: "holyland", lon: [33.8, 37], lat: [29.3, 33.7], zoom: 9, ppu: 34, exaggeration: 2.6 },
];

export const TILE_URL = (z, x, y) => `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;

const lonToX = (lon, n) => ((lon + 180) / 360) * n;
const latToY = (lat, n) => {
  const r = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n;
};
/** Fractional global tile coordinates (Web Mercator) for a lon/lat at zoom z. */
export const tileXY = (lon, lat, z) => [lonToX(lon, 2 ** z), latToY(lat, 2 ** z)];

export function tilesFor(tier) {
  const [x0, y0] = tileXY(tier.lon[0], tier.lat[1], tier.zoom);
  const [x1, y1] = tileXY(tier.lon[1], tier.lat[0], tier.zoom);
  const out = [];
  for (let x = Math.floor(x0); x <= Math.floor(x1); x++)
    for (let y = Math.floor(y0); y <= Math.floor(y1); y++) out.push(`${tier.zoom}/${x}/${y}`);
  return out;
}
