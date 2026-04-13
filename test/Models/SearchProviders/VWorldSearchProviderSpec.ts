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
});
