import bbox from "@turf/bbox";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point as turfPoint } from "@turf/helpers";
import { polygonToLine } from "@turf/polygon-to-line";
import { Feature, FeatureCollection, GeoJsonProperties } from "geojson";
import { Rectangle, Resource } from "terriajs-cesium";
import loadJson from "terriajs/lib/Core/loadJson";
import GeoJsonCatalogItem from "terriajs/lib/Models/Catalog/CatalogItems/GeoJsonCatalogItem";
import CommonStrata from "terriajs/lib/Models/Definition/CommonStrata";
import GlobeOrMap from "terriajs/lib/Models/GlobeOrMap";
import { removeMarker } from "terriajs/lib/Models/LocationMarkerUtils";
import Terria from "terriajs/lib/Models/Terria";

const BOUNDARY_LAYER_IDS = {
  base: "__VWORLD_PARCEL_BOUNDARY_BASE__",
  halo: "__VWORLD_PARCEL_BOUNDARY_HALO__",
  inner: "__VWORLD_PARCEL_BOUNDARY_INNER__",
  pulse: "__VWORLD_PARCEL_BOUNDARY_PULSE__"
} as const;

const WFS_TYPENAME = "lp_pa_cbnd_bubun,lp_pa_cbnd_bonbun";
const BBOX_PADDING_DEGREES = 0.0002;
const PULSE_PERIOD_MS = 1400;
const PULSE_INTERVAL_MS = 100;
const PULSE_MIN_WIDTH = 4;
const PULSE_MAX_WIDTH = 8;
const PULSE_MIN_ALPHA = 0.2;
const PULSE_MAX_ALPHA = 0.7;
const HALO_STROKE = "rgba(255, 255, 255, 0.95)";
const INNER_STROKE = "#ff3333";
const TRANSPARENT_FILL = "rgba(0, 0, 0, 0)";

const geometryCache = new Map<string, FeatureCollection>();

let pulseTimer: ReturnType<typeof setInterval> | undefined;
let pulseGeneration = 0;

export interface ParcelBoundaryRequest {
  terria: Terria;
  name: string;
  key: string;
  wfsUrl: string;
  useProxy: boolean;
  longitude: number;
  latitude: number;
  pnu?: string;
  flightDurationSeconds?: number;
}

export function removeParcelBoundaryHighlight(terria: Terria) {
  pulseGeneration++;
  stopPulseAnimation();

  Object.values(BOUNDARY_LAYER_IDS).forEach((id) => {
    const item = terria.getModelById(GeoJsonCatalogItem, id);
    if (item) {
      terria.overlays.remove(item);
    }
  });
}

export async function highlightParcelBoundary(
  request: ParcelBoundaryRequest
): Promise<boolean> {
  removeParcelBoundaryHighlight(request.terria);
  const activeGeneration = pulseGeneration;

  const cacheKey = request.pnu ?? `${request.longitude},${request.latitude}`;
  const cached = geometryCache.get(cacheKey);
  const featureCollection =
    cached ??
    (await fetchParcelFeatureCollection(request).catch(() => undefined));

  if (!featureCollection || featureCollection.features.length === 0) {
    return false;
  }

  geometryCache.set(cacheKey, featureCollection);
  const lineFeatureCollection = toHighlightLines(featureCollection);

  const baseOverlay = getOrCreateBoundaryOverlay(
    request.terria,
    BOUNDARY_LAYER_IDS.base,
    "VWorld Parcel Boundary"
  );
  const haloOverlay = getOrCreateBoundaryOverlay(
    request.terria,
    BOUNDARY_LAYER_IDS.halo,
    "VWorld Parcel Boundary Halo"
  );
  const innerOverlay = getOrCreateBoundaryOverlay(
    request.terria,
    BOUNDARY_LAYER_IDS.inner,
    "VWorld Parcel Boundary Inner"
  );

  applyOverlayStyle(
    baseOverlay,
    createStyledFeatureCollection(lineFeatureCollection, {
      stroke: "#ff3333",
      strokeWidth: 3
    })
  );
  applyOverlayStyle(
    haloOverlay,
    createStyledFeatureCollection(lineFeatureCollection, {
      stroke: HALO_STROKE,
      strokeWidth: 8
    })
  );
  applyOverlayStyle(
    innerOverlay,
    createStyledFeatureCollection(lineFeatureCollection, {
      stroke: INNER_STROKE,
      strokeWidth: 4
    })
  );

  request.terria.overlays.add(baseOverlay);
  request.terria.overlays.add(haloOverlay);
  request.terria.overlays.add(innerOverlay);
  await Promise.all([
    baseOverlay.loadMapItems(true),
    haloOverlay.loadMapItems(true),
    innerOverlay.loadMapItems(true)
  ]);

  removeMarker(request.terria);

  const [west, south, east, north] = bbox(featureCollection);
  const zoomRectangle = Rectangle.fromDegrees(west, south, east, north);
  await waitForNavigationEnd(
    request.terria.currentViewer,
    request.terria.leaflet?.map,
    zoomRectangle,
    request.flightDurationSeconds ?? 3.0
  );

  if (activeGeneration !== pulseGeneration) {
    return true;
  }

  if (
    request.terria.currentViewer.type !== "Cesium" &&
    !prefersReducedMotion()
  ) {
    const pulseOverlay = getOrCreateBoundaryOverlay(
      request.terria,
      BOUNDARY_LAYER_IDS.pulse,
      "VWorld Parcel Boundary Pulse"
    );
    request.terria.overlays.add(pulseOverlay);
    await startPulseAnimation(pulseOverlay, lineFeatureCollection);
  }

  return true;
}

interface ParcelWfsFeatureCollection {
  type?: string;
  features?: Feature[];
}

async function fetchParcelFeatureCollection(
  request: ParcelBoundaryRequest
): Promise<FeatureCollection> {
  const resource = new Resource({
    url: getRequestUrl(request),
    queryParameters: {
      key: request.key,
      service: "WFS",
      version: "1.1.0",
      request: "GetFeature",
      typename: WFS_TYPENAME,
      bbox: buildBbox(request.longitude, request.latitude),
      srsname: "EPSG:4326",
      output: "application/json"
    }
  });

  const response = await loadJson<ParcelWfsFeatureCollection>(resource);
  const features = Array.isArray(response?.features) ? response.features : [];
  const selectedFeature = selectFeature(features, request);

  return {
    type: "FeatureCollection",
    features: selectedFeature ? [selectedFeature] : []
  };
}

function getRequestUrl(request: ParcelBoundaryRequest) {
  return request.useProxy
    ? request.terria.corsProxy.getURLProxyIfNecessary(request.wfsUrl)
    : request.wfsUrl;
}

function buildBbox(longitude: number, latitude: number) {
  return [
    longitude - BBOX_PADDING_DEGREES,
    latitude - BBOX_PADDING_DEGREES,
    longitude + BBOX_PADDING_DEGREES,
    latitude + BBOX_PADDING_DEGREES
  ].join(",");
}

function selectFeature(
  features: Feature[],
  request: Pick<ParcelBoundaryRequest, "pnu" | "longitude" | "latitude">
) {
  if (features.length === 0) {
    return undefined;
  }

  if (request.pnu) {
    const pnuMatch = features.find(
      (feature) => getPnu(feature.properties) === request.pnu
    );
    if (pnuMatch) {
      return pnuMatch;
    }
  }

  const targetPoint = turfPoint([request.longitude, request.latitude]);
  const geometryMatch = features.find((feature) => {
    if (
      feature.geometry?.type !== "Polygon" &&
      feature.geometry?.type !== "MultiPolygon"
    ) {
      return false;
    }

    return booleanPointInPolygon(targetPoint, feature as Feature<any>);
  });

  return geometryMatch ?? features[0];
}

function getPnu(properties?: GeoJsonProperties | null) {
  if (!properties) {
    return undefined;
  }

  const match = Object.entries(properties).find(
    ([key]) => key.toLowerCase() === "pnu"
  );

  return typeof match?.[1] === "string" || typeof match?.[1] === "number"
    ? String(match[1])
    : undefined;
}

function getOrCreateBoundaryOverlay(terria: Terria, id: string, name: string) {
  let item = terria.getModelById(GeoJsonCatalogItem, id);
  if (!item) {
    item = new GeoJsonCatalogItem(id, terria);
    item.setTrait(CommonStrata.definition, "name", name);
    terria.addModel(item);
  }
  return item;
}

function applyOverlayStyle(
  overlay: GeoJsonCatalogItem,
  featureCollection: FeatureCollection
) {
  overlay.setTrait(CommonStrata.user, "geoJsonData", featureCollection as any);
  overlay.setTrait(CommonStrata.user, "clampToGround", true);
}

function createStyledFeatureCollection(
  featureCollection: FeatureCollection,
  style: {
    stroke: string;
    strokeWidth: number;
  }
): FeatureCollection {
  return {
    ...featureCollection,
    features: featureCollection.features.map((feature) => ({
      ...feature,
      properties: {
        ...(feature.properties ?? {}),
        stroke: style.stroke,
        "stroke-width": style.strokeWidth,
        "stroke-opacity": 1,
        "fill-opacity": 0,
        fill: TRANSPARENT_FILL
      }
    }))
  };
}

async function startPulseAnimation(
  overlay: GeoJsonCatalogItem,
  featureCollection: FeatureCollection
) {
  stopPulseAnimation();
  pulseGeneration++;
  const activeGeneration = pulseGeneration;

  const updatePulse = async () => {
    if (activeGeneration !== pulseGeneration) return;
    applyOverlayStyle(
      overlay,
      createStyledFeatureCollection(
        featureCollection,
        getPulseStyle(Date.now())
      )
    );
    await overlay.loadMapItems(true);
  };

  await updatePulse();

  pulseTimer = setInterval(() => {
    void updatePulse();
  }, PULSE_INTERVAL_MS);
}

function stopPulseAnimation() {
  if (pulseTimer !== undefined) {
    clearInterval(pulseTimer);
    pulseTimer = undefined;
  }
}

function getPulseStyle(now: number) {
  const progress = ((now % PULSE_PERIOD_MS) / PULSE_PERIOD_MS) * Math.PI * 2;
  const eased = (Math.sin(progress) + 1) / 2;
  const alpha = PULSE_MIN_ALPHA + (PULSE_MAX_ALPHA - PULSE_MIN_ALPHA) * eased;
  const strokeWidth =
    PULSE_MIN_WIDTH + (PULSE_MAX_WIDTH - PULSE_MIN_WIDTH) * eased;

  return {
    stroke: `rgba(255, 51, 51, ${alpha})`,
    strokeWidth
  };
}

function toHighlightLines(
  featureCollection: FeatureCollection
): FeatureCollection {
  const features = featureCollection.features.flatMap((feature) => {
    if (
      feature.geometry?.type !== "Polygon" &&
      feature.geometry?.type !== "MultiPolygon"
    ) {
      return [];
    }

    const lineResult = polygonToLine(feature as Feature<any>);
    if (lineResult.type === "FeatureCollection") {
      return lineResult.features;
    }

    return [lineResult];
  });

  return {
    type: "FeatureCollection",
    features
  };
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

type ZoomableViewer = Pick<GlobeOrMap, "type" | "zoomTo">;

type LeafletMoveEndSource = {
  once: (eventName: "moveend", callback: () => void) => void;
};

async function waitForNavigationEnd(
  viewer: ZoomableViewer,
  leafletMap: LeafletMoveEndSource | undefined,
  zoomRectangle: Rectangle,
  flightDurationSeconds: number
) {
  if (viewer.type === "Leaflet" && leafletMap && flightDurationSeconds > 0) {
    const moveEndPromise = new Promise<void>((resolve) => {
      let resolved = false;
      const complete = () => {
        if (!resolved) {
          resolved = true;
          resolve();
        }
      };

      leafletMap.once("moveend", complete);
      setTimeout(complete, flightDurationSeconds * 1000 + 250);
    });

    await viewer.zoomTo(zoomRectangle, flightDurationSeconds);
    await moveEndPromise;
    return;
  }

  await viewer.zoomTo(zoomRectangle, flightDurationSeconds);
}
