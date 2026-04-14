import i18next from "i18next";
import { makeObservable, override, runInAction } from "mobx";
import Rectangle from "terriajs-cesium/Source/Core/Rectangle";
import Resource from "terriajs-cesium/Source/Core/Resource";
import { Category } from "terriajs/lib/Core/Analytics/analyticEvents";
import loadJson from "terriajs/lib/Core/loadJson";
import { applyTranslationIfExists } from "terriajs/lib/Language/languageHelpers";
import LocationSearchProviderMixin from "terriajs/lib/ModelMixins/SearchProviders/LocationSearchProviderMixin";
import CreateModel from "terriajs/lib/Models/Definition/CreateModel";
import SearchProviderResults from "terriajs/lib/Models/SearchProviders/SearchProviderResults";
import SearchResult from "terriajs/lib/Models/SearchProviders/SearchResult";
import Terria from "terriajs/lib/Models/Terria";
import VWorldSearchProviderTraits from "../../Traits/SearchProviders/VWorldSearchProviderTraits";
import { highlightParcelBoundary } from "./VWorldParcelBoundaryUtils";

interface VWorldAddressItem {
  id?: string;
  address?: {
    parcel?: string;
    road?: string;
    category?: string;
    bldnm?: string;
    bldnmdc?: string;
  };
  point?: {
    x?: number | string;
    y?: number | string;
  };
}

interface VWorldSearchResponse {
  response?: {
    status?: "OK" | "NOT_FOUND" | "ERROR";
    error?: {
      text?: string;
    };
    result?: {
      items?:
        | VWorldAddressItem[]
        | { item?: VWorldAddressItem[] | VWorldAddressItem };
    };
  };
}

const RESULT_DELTA_DEGREES = 0.01;

class VWorldParcelSearchResult extends SearchResult {
  pnu?: string;
}

export default class VWorldSearchProvider extends LocationSearchProviderMixin(
  CreateModel(VWorldSearchProviderTraits)
) {
  static readonly type = "vworld-search-provider";

  get type() {
    return VWorldSearchProvider.type;
  }

  constructor(uniqueId: string | undefined, terria: Terria) {
    super(uniqueId, terria);
    makeObservable(this);
  }

  @override
  override showWarning() {
    if (!this.key || this.key === "") {
      console.warn(
        `The ${applyTranslationIfExists(this.name, i18next)}(${
          this.type
        }) search provider will return no results until searchProvider.key is set in config.json.`
      );
    }
  }

  protected logEvent(searchText: string) {
    this.terria.analytics.logEvent(Category.search, "VWorld", searchText);
  }

  protected async doSearch(
    searchText: string,
    searchResults: SearchProviderResults
  ): Promise<void> {
    searchResults.results.length = 0;
    searchResults.message = undefined;

    if (!this.key || this.key === "") {
      searchResults.message = {
        content: "translate#viewModels.vworldApiKeyMissing"
      };
      return;
    }

    try {
      const response = await loadJson<VWorldSearchResponse>(
        new Resource({
          url: this.getRequestUrl(),
          queryParameters: this.buildQueryParameters(searchText)
        })
      );
      const payload = response.response;

      if (searchResults.isCanceled) {
        return;
      }

      if (!payload) {
        searchResults.message = {
          content: "translate#viewModels.searchErrorOccurred"
        };
        return;
      }

      if (payload.status !== "OK") {
        if (payload.status === "ERROR") {
          const errorDetail = payload.error?.text ?? "알 수 없는 오류";
          console.error(`VWorld 검색 API 오류: ${errorDetail}`);
        }
        searchResults.message = {
          content:
            payload.status === "NOT_FOUND"
              ? "translate#viewModels.searchNoLocations"
              : "translate#viewModels.searchErrorOccurred"
        };
        return;
      }

      const locations = this.extractItems(payload)
        .map((item) => this.itemToSearchResult(item))
        .filter((result): result is SearchResult => result !== undefined);

      runInAction(() => {
        searchResults.results.push(...locations);
      });

      if (searchResults.results.length === 0) {
        searchResults.message = {
          content: "translate#viewModels.searchNoLocations"
        };
      }
    } catch (_error) {
      if (searchResults.isCanceled) {
        return;
      }

      searchResults.message = {
        content: "translate#viewModels.searchErrorOccurred"
      };
    }
  }

  private getRequestUrl() {
    return this.useProxy
      ? this.terria.corsProxy.getURLProxyIfNecessary(this.url)
      : this.url;
  }

  private buildQueryParameters(searchText: string) {
    const parameters: Record<string, string | number> = {
      service: "search",
      request: "search",
      version: "2.0",
      format: "json",
      errorFormat: "json",
      crs: "EPSG:4326",
      type: "ADDRESS",
      category: this.category,
      size: this.recommendedListLength,
      page: 1,
      query: searchText,
      key: this.key!
    };

    return parameters;
  }

  private extractItems(payload: NonNullable<VWorldSearchResponse["response"]>) {
    const items = payload.result?.items;
    if (!items) {
      return [];
    }

    if (Array.isArray(items)) {
      return items;
    }

    const nestedItems = items.item;
    if (!nestedItems) {
      return [];
    }

    return Array.isArray(nestedItems) ? nestedItems : [nestedItems];
  }

  private itemToSearchResult(item: VWorldAddressItem) {
    // VWorld API 응답은 EPSG:4326(WGS84) 좌표계를 사용: x = 경도(longitude), y = 위도(latitude)
    const longitude = this.parseCoordinate(item.point?.x);
    const latitude = this.parseCoordinate(item.point?.y);

    if (longitude === undefined || latitude === undefined) {
      return undefined;
    }

    const name = item.address?.parcel ?? item.address?.road ?? item.id;
    if (!name) {
      return undefined;
    }

    const tooltip =
      item.address?.road && item.address?.parcel
        ? `${item.address.road}\n${item.address.parcel}`
        : undefined;

    const result = new VWorldParcelSearchResult({
      name,
      tooltip,
      location: {
        latitude,
        longitude
      }
    });

    result.pnu = item.id;
    result.clickAction = createZoomToFunction(
      this,
      name,
      longitude,
      latitude,
      result.pnu
    );

    return result;
  }

  private parseCoordinate(value?: number | string) {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : undefined;
    }

    if (typeof value === "string") {
      const parsed = parseFloat(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    }

    return undefined;
  }
}

function createZoomToFunction(
  model: VWorldSearchProvider,
  name: string,
  longitude: number,
  latitude: number,
  pnu?: string
) {
  const rectangle = Rectangle.fromDegrees(
    longitude - RESULT_DELTA_DEGREES,
    latitude - RESULT_DELTA_DEGREES,
    longitude + RESULT_DELTA_DEGREES,
    latitude + RESULT_DELTA_DEGREES
  );

  return function () {
    model.terria.currentViewer.zoomTo(rectangle, model.flightDurationSeconds);
    void highlightParcelBoundary({
      terria: model.terria,
      name,
      key: model.key!,
      wfsUrl: model.wfsUrl,
      useProxy: model.useProxy,
      longitude,
      latitude,
      pnu,
      flightDurationSeconds: model.flightDurationSeconds
    });
  };
}
