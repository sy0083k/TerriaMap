import bbox from "@turf/bbox";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point as turfPoint } from "@turf/helpers";
import { Feature, FeatureCollection, GeoJsonProperties } from "geojson";
import { Rectangle, Resource } from "terriajs-cesium";
import loadJson from "terriajs/lib/Core/loadJson";
import GeoJsonCatalogItem from "terriajs/lib/Models/Catalog/CatalogItems/GeoJsonCatalogItem";
import CommonStrata from "terriajs/lib/Models/Definition/CommonStrata";
import { removeMarker } from "terriajs/lib/Models/LocationMarkerUtils";
import Terria from "terriajs/lib/Models/Terria";

const PARCEL_BOUNDARY_UNIQUE_ID = "__VWORLD_PARCEL_BOUNDARY__";
const WFS_TYPENAME = "lp_pa_cbnd_bubun,lp_pa_cbnd_bonbun";
const BBOX_PADDING_DEGREES = 0.0002;

const geometryCache = new Map<string, FeatureCollection>();

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
  const item = terria.getModelById(
    GeoJsonCatalogItem,
    PARCEL_BOUNDARY_UNIQUE_ID
  );
  if (item) {
    terria.overlays.remove(item);
  }
}

export async function highlightParcelBoundary(
  request: ParcelBoundaryRequest
): Promise<boolean> {
  removeParcelBoundaryHighlight(request.terria);

  const cacheKey = request.pnu ?? `${request.longitude},${request.latitude}`;
  const cached = geometryCache.get(cacheKey);
  const featureCollection =
    cached ??
    (await fetchParcelFeatureCollection(request).catch(() => undefined));

  if (!featureCollection || featureCollection.features.length === 0) {
    return false;
  }

  geometryCache.set(cacheKey, featureCollection);

  const overlay = getOrCreateBoundaryOverlay(request.terria);
  overlay.setTrait(
    CommonStrata.user,
    "geoJsonData",
    styleFeatureCollection(featureCollection) as any
  );
  overlay.setTrait(CommonStrata.user, "clampToGround", true);
  request.terria.overlays.add(overlay);

  removeMarker(request.terria);

  const [west, south, east, north] = bbox(featureCollection);
  request.terria.currentViewer.zoomTo(
    Rectangle.fromDegrees(west, south, east, north),
    request.flightDurationSeconds
  );

  return true;
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

  const response = await loadJson<any>(resource);
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

function getOrCreateBoundaryOverlay(terria: Terria) {
  let item = terria.getModelById(GeoJsonCatalogItem, PARCEL_BOUNDARY_UNIQUE_ID);
  if (!item) {
    item = new GeoJsonCatalogItem(PARCEL_BOUNDARY_UNIQUE_ID, terria);
    item.setTrait(CommonStrata.definition, "name", "VWorld Parcel Boundary");
    terria.addModel(item);
  }
  return item;
}

function styleFeatureCollection(
  featureCollection: FeatureCollection
): FeatureCollection {
  return {
    ...featureCollection,
    features: featureCollection.features.map((feature) => ({
      ...feature,
      properties: {
        ...(feature.properties ?? {}),
        stroke: "#00A8D8",
        "stroke-width": 3,
        "stroke-opacity": 1,
        fill: "#00A8D8",
        "fill-opacity": 0.12
      }
    }))
  };
}
