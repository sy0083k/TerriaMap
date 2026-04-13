import primitiveTrait from "terriajs/lib/Traits/Decorators/primitiveTrait";
import mixTraits from "terriajs/lib/Traits/mixTraits";
import LocationSearchProviderTraits from "terriajs/lib/Traits/SearchProviders/LocationSearchProviderTraits";

export default class VWorldSearchProviderTraits extends mixTraits(
  LocationSearchProviderTraits
) {
  url: string = "https://api.vworld.kr/req/search";

  @primitiveTrait({
    type: "string",
    name: "Key",
    description: "The VWorld API key used for address search."
  })
  key?: string;

  @primitiveTrait({
    type: "string",
    name: "Category",
    description:
      "The VWorld address category. Use PARCEL for lot-number addresses or ROAD for street addresses."
  })
  category: string = "PARCEL";

  @primitiveTrait({
    type: "boolean",
    name: "Use proxy",
    description:
      "Whether to send requests through the Terria proxy when the target domain is allowed."
  })
  useProxy: boolean = true;
}
