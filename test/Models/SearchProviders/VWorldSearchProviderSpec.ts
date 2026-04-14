import { http, HttpResponse } from "msw";
import CommonStrata from "terriajs/lib/Models/Definition/CommonStrata";
import Terria from "terriajs/lib/Models/Terria";
import VWorldSearchProvider from "../../../lib/Models/SearchProviders/VWorldSearchProvider";
import { worker } from "../../../node_modules/terriajs/test/mocks/browser";

const validFixture = {
  response: {
    service: {
      name: "search",
      version: "2.0",
      operation: "search",
      time: "12(ms)"
    },
    status: "OK",
    record: {
      total: "1",
      current: "1"
    },
    page: {
      total: "1",
      current: "1",
      size: "5"
    },
    result: {
      crs: "EPSG:4326",
      type: "ADDRESS",
      items: [
        {
          id: "4421036023116340000",
          address: {
            zipcode: "31931",
            category: "PARCEL",
            road: "성연3로 133-14",
            parcel: "충청남도 서산시 성연면 오사리 1634",
            bldnm: ""
          },
          point: {
            x: "126.4481405089845",
            y: "36.83139733381893"
          }
        }
      ]
    }
  }
};

describe("VWorldSearchProvider", () => {
  let terria: Terria;
  let searchProvider: VWorldSearchProvider;

  beforeEach(function () {
    terria = new Terria({
      baseUrl: "./"
    });
    searchProvider = new VWorldSearchProvider("test-vworld", terria);
    searchProvider.setTrait(CommonStrata.definition, "key", "testkey");
    searchProvider.setTrait(
      CommonStrata.definition,
      "url",
      "http://api.test.com"
    );
  });

  it("Handles valid wrapped results", async () => {
    worker.use(
      http.get("http://api.test.com", () => HttpResponse.json(validFixture))
    );

    const result = searchProvider.search("오사리 1634");
    await result.resultsCompletePromise;
    expect(result.results.length).toBe(1);
    expect(result.results[0].name).toBe("충청남도 서산시 성연면 오사리 1634");
    expect(result.results[0].location?.longitude).toBe(126.4481405089845);
    expect(result.results[0].location?.latitude).toBe(36.83139733381893);
    expect((result.results[0] as any).pnu).toBe("4421036023116340000");
  });

  it("Handles not found response", async () => {
    worker.use(
      http.get("http://api.test.com", () =>
        HttpResponse.json({
          response: {
            status: "NOT_FOUND"
          }
        })
      )
    );

    const result = searchProvider.search("missing");
    await result.resultsCompletePromise;
    expect(result.results.length).toBe(0);
    expect(result.message?.content).toBe(
      "translate#viewModels.searchNoLocations"
    );
  });

  it("Handles malformed response", async () => {
    worker.use(http.get("http://api.test.com", () => HttpResponse.json({})));

    const result = searchProvider.search("broken");
    await result.resultsCompletePromise;
    expect(result.results.length).toBe(0);
    expect(result.message?.content).toBe(
      "translate#viewModels.searchErrorOccurred"
    );
  });

  it("Shows translated message when API key is missing", async () => {
    searchProvider.setTrait(CommonStrata.definition, "key", "");

    const result = searchProvider.search("missing-key");
    await result.resultsCompletePromise;

    expect(result.results.length).toBe(0);
    expect(result.message?.content).toBe(
      "translate#viewModels.vworldApiKeyMissing"
    );
  });

  it("Handles ERROR status response", async () => {
    worker.use(
      http.get("http://api.test.com", () =>
        HttpResponse.json({
          response: {
            status: "ERROR",
            error: { text: "Invalid API key" }
          }
        })
      )
    );

    const result = searchProvider.search("error-query");
    await result.resultsCompletePromise;
    expect(result.results.length).toBe(0);
    expect(result.message?.content).toBe(
      "translate#viewModels.searchErrorOccurred"
    );
  });

  it("Handles nested items object format", async () => {
    worker.use(
      http.get("http://api.test.com", () =>
        HttpResponse.json({
          response: {
            status: "OK",
            result: {
              items: {
                item: [
                  {
                    id: "nested-id-1",
                    address: { parcel: "서울특별시 중구 세종대로 110" },
                    point: { x: "126.9784", y: "37.5665" }
                  },
                  {
                    id: "nested-id-2",
                    address: { parcel: "서울특별시 중구 세종대로 111" },
                    point: { x: "126.9785", y: "37.5666" }
                  }
                ]
              }
            }
          }
        })
      )
    );

    const result = searchProvider.search("세종대로");
    await result.resultsCompletePromise;
    expect(result.results.length).toBe(2);
    expect(result.results[0].name).toBe("서울특별시 중구 세종대로 110");
  });

  it("Excludes items with missing point coordinates", async () => {
    worker.use(
      http.get("http://api.test.com", () =>
        HttpResponse.json({
          response: {
            status: "OK",
            result: {
              items: [
                {
                  id: "valid-item",
                  address: { parcel: "서울특별시 강남구 테헤란로 152" },
                  point: { x: "127.0276", y: "37.4979" }
                },
                {
                  id: "no-point-item",
                  address: { parcel: "좌표 없는 주소" }
                  // point 필드 없음
                }
              ]
            }
          }
        })
      )
    );

    const result = searchProvider.search("테헤란로");
    await result.resultsCompletePromise;
    expect(result.results.length).toBe(1);
    expect(result.results[0].name).toBe("서울특별시 강남구 테헤란로 152");
  });

  it("Uses road address as fallback when parcel is missing", async () => {
    worker.use(
      http.get("http://api.test.com", () =>
        HttpResponse.json({
          response: {
            status: "OK",
            result: {
              items: [
                {
                  id: "road-only",
                  address: { road: "세종대로 110" },
                  point: { x: "126.9784", y: "37.5665" }
                },
                {
                  id: "id-only-fallback",
                  address: {},
                  point: { x: "126.9785", y: "37.5666" }
                }
              ]
            }
          }
        })
      )
    );

    const result = searchProvider.search("세종대로");
    await result.resultsCompletePromise;
    expect(result.results.length).toBe(2);
    expect(result.results[0].name).toBe("세종대로 110");
    expect(result.results[1].name).toBe("id-only-fallback");
  });

  it("Calls API URL directly when useProxy is false", async () => {
    searchProvider.setTrait(CommonStrata.definition, "useProxy", false);

    let requestedUrl = "";
    worker.use(
      http.get("http://api.test.com", ({ request }) => {
        requestedUrl = request.url;
        return HttpResponse.json({ response: { status: "NOT_FOUND" } });
      })
    );

    const result = searchProvider.search("proxy-test");
    await result.resultsCompletePromise;
    expect(requestedUrl).toContain("api.test.com");
    expect(result.results.length).toBe(0);
  });
});
