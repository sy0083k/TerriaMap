# GeoServer에서 WMS 레이어 스타일링과 한글 속성값 문제 해결

## 문서 목적

이 문서는 GeoServer에 발행한 WMS 레이어에 스타일을 적용하는 기본 방법과, 한글 속성값을 기준으로 필터링할 때 스타일이 제대로 적용되지 않는 문제를 해결하는 방법을 설명한다.

처음 접하는 사용자가 `스타일 생성 → SLD 작성 → 레이어에 적용 → 결과 확인 → 한글 속성값 문제 해결` 순서로 따라갈 수 있도록 구성했다.

## 스타일링의 핵심: SLD

GeoServer에서 WMS 레이어의 채우기 색상, 외곽선 색상, 선 두께, 투명도 등을 지정하는 대표적인 방법은 `SLD(Styled Layer Descriptor)` 이다.

SLD에서는 보통 다음 세 요소를 조합해 스타일을 만든다.

- `Rule`: 스타일 규칙의 단위
- `Filter`: 어떤 속성값에 이 규칙을 적용할지 정하는 조건
- `Symbolizer`: 실제로 어떻게 그릴지 정하는 표현 방식

예를 들어 속성값이 `forest` 이면 초록색, `residential` 이면 노란색으로 채우는 식으로 분류 스타일을 만들 수 있다.

## 1. 스타일 생성

1. 왼쪽 메뉴에서 `데이터 > 스타일`을 클릭한다.
2. `새로운 스타일 추가`를 클릭한다.
3. 다음 값을 입력한다.

- `이름`: `landuse_style`
- `작업 공간`: 필요하면 해당 작업 공간을 선택

스타일 이름은 관리용 이름이므로 레이어 성격이 드러나게 짓는 것이 좋다.

## 2. SLD 작성

이제 속성값 기반 스타일을 정의한다.

예를 들어 `land_use` 속성값에 따라 서로 다른 채우기 색상과 외곽선을 주려면 다음과 같은 SLD를 사용할 수 있다.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<StyledLayerDescriptor version="1.0.0"
  xsi:schemaLocation="http://www.opengis.net/sld StyledLayerDescriptor.xsd"
  xmlns="http://www.opengis.net/sld"
  xmlns:ogc="http://www.opengis.net/ogc"
  xmlns:xlink="http://www.w3.org/1999/xlink"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <NamedLayer>
    <Name>landuse_style</Name>
    <UserStyle>
      <Title>Land Use Style</Title>
      <FeatureTypeStyle>
        <Rule>
          <Title>Residential</Title>
          <ogc:Filter>
            <ogc:PropertyIsEqualTo>
              <ogc:PropertyName>land_use</ogc:PropertyName>
              <ogc:Literal>residential</ogc:Literal>
            </ogc:PropertyIsEqualTo>
          </ogc:Filter>
          <PolygonSymbolizer>
            <Fill>
              <CssParameter name="fill">#ffff00</CssParameter>
              <CssParameter name="fill-opacity">0.7</CssParameter>
            </Fill>
            <Stroke>
              <CssParameter name="stroke">#666666</CssParameter>
              <CssParameter name="stroke-width">1</CssParameter>
            </Stroke>
          </PolygonSymbolizer>
        </Rule>

        <Rule>
          <Title>Forest</Title>
          <ogc:Filter>
            <ogc:PropertyIsEqualTo>
              <ogc:PropertyName>land_use</ogc:PropertyName>
              <ogc:Literal>forest</ogc:Literal>
            </ogc:PropertyIsEqualTo>
          </ogc:Filter>
          <PolygonSymbolizer>
            <Fill>
              <CssParameter name="fill">#228b22</CssParameter>
              <CssParameter name="fill-opacity">0.8</CssParameter>
            </Fill>
            <Stroke>
              <CssParameter name="stroke">#2f4f2f</CssParameter>
              <CssParameter name="stroke-width">1.2</CssParameter>
            </Stroke>
          </PolygonSymbolizer>
        </Rule>
      </FeatureTypeStyle>
    </UserStyle>
  </NamedLayer>
</StyledLayerDescriptor>
```

이 예시에서 핵심은 다음과 같다.

- `PropertyName`: 비교할 속성명
- `Literal`: 비교할 실제 값
- `fill`: 채우기 색상
- `fill-opacity`: 채우기 투명도
- `stroke`: 외곽선 색상
- `stroke-width`: 외곽선 두께

## 3. 스타일 검증 및 저장

1. 스타일 편집기에 SLD를 입력한다.
2. 하단의 `Validate` 를 눌러 XML 문법과 구조를 확인한다.
3. 오류가 없으면 `저장`을 클릭한다.

검증 단계에서 실패하면 태그 누락, 네임스페이스 오타, 속성명 오타를 먼저 확인하는 것이 빠르다.

## 4. 레이어에 스타일 적용

스타일을 저장했다고 바로 레이어에 적용되지는 않는다. 해당 레이어의 기본 스타일로 연결해야 한다.

1. 왼쪽 메뉴에서 `데이터 > 레이어`를 클릭한다.
2. 대상 레이어를 선택한다.
3. 상단의 `게시(Publishing)` 관련 설정으로 이동한다.
4. `WMS 설정` 또는 스타일 설정 영역에서 `Default Style` 을 방금 만든 `landuse_style` 로 변경한다.
5. 최하단에서 `저장`을 클릭한다.

정상적으로 저장되면 이후 WMS 요청에서 해당 레이어는 기본적으로 이 스타일을 사용한다.

## 5. 결과 확인

1. 왼쪽 메뉴에서 `데이터 > 레이어 미리보기`를 클릭한다.
2. 대상 레이어를 찾는다.
3. `OpenLayers` 링크를 열어 지도에서 스타일이 적용되었는지 확인한다.

속성값이 `residential` 인 영역과 `forest` 인 영역이 서로 다른 색으로 보이면 정상이다.

## 자주 쓰는 스타일 속성

스타일 작성 시 가장 자주 쓰는 항목은 다음과 같다.

- `fill`: 채우기 색상
- `fill-opacity`: 채우기 투명도
- `stroke`: 외곽선 색상
- `stroke-width`: 외곽선 두께
- `stroke-dasharray`: 점선 패턴

처음에는 이 정도만 알아도 대부분의 분류 스타일을 만들 수 있다.

## 한글 속성값 기준 스타일이 적용되지 않을 때

예를 들어 `재산관리관` 속성값이 `당진시` 일 때만 특정 색으로 채우도록 설정했는데 스타일이 먹지 않는 경우가 있다.

이 문제는 보통 다음 두 가지 중 하나다.

- SLD XML 인코딩 문제
- Shapefile의 DBF 인코딩과 GeoServer 저장소 설정 불일치

## 6. SLD 인코딩 선언 확인

스타일 편집기 상단에 XML 인코딩 선언이 들어 있는지 확인한다.

```xml
<?xml version="1.0" encoding="UTF-8"?>
```

이 선언이 없거나 다른 인코딩으로 저장되면 한글 `Literal` 비교가 기대대로 동작하지 않을 수 있다.

한글 조건 예시:

```xml
<ogc:Filter>
  <ogc:PropertyIsEqualTo>
    <ogc:PropertyName>재산관리관</ogc:PropertyName>
    <ogc:Literal>당진시</ogc:Literal>
  </ogc:PropertyIsEqualTo>
</ogc:Filter>
```

이때 다음도 함께 확인한다.

- 속성명 오타가 없는지
- 값 앞뒤 공백이 없는지
- 실제 데이터 값과 완전히 일치하는지

## 7. 저장소의 DBF charset 확인

Shapefile을 사용하는 경우 속성값은 `.dbf` 파일에 저장된다. 국내 공공기관 데이터는 `UTF-8` 이 아니라 `EUC-KR` 또는 `CP949` 인 경우가 많다.

1. 왼쪽 메뉴에서 `데이터 > 저장소`를 클릭한다.
2. 해당 Shapefile 저장소를 선택한다.
3. `연결 매개변수` 에서 `DBF charset` 또는 유사한 문자셋 설정을 찾는다.
4. 아래 값으로 바꿔 가며 확인한다.

- `UTF-8`
- `EUC-KR`
- `CP949`

국내 공공 SHP 데이터라면 `EUC-KR` 이 먼저 맞는 경우가 많다.

설정을 바꾼 뒤 저장하고, 레이어 미리보기에서 속성 표시와 스타일 적용 여부를 다시 확인한다.

## 8. 무엇이 문제인지 구분하는 방법

가장 빠른 방법은 `레이어 미리보기` 또는 `GetFeatureInfo` 로 실제 속성값이 어떻게 보이는지 확인하는 것이다.

다음처럼 판단한다.

1. 객체를 클릭했을 때 속성값 한글이 깨져 보인다.

- 이 경우는 대체로 저장소 인코딩 문제다.
- `DBF charset` 설정을 먼저 수정해야 한다.

2. 객체를 클릭했을 때 한글은 정상인데 스타일만 적용되지 않는다.

- 이 경우는 대체로 SLD 쪽 문제다.
- XML 인코딩 선언, `PropertyName`, `Literal`, 공백, 오타를 점검한다.

즉, 한글 표시 자체가 깨졌는지 여부가 원인 분리에 가장 중요하다.

## 9. 잘 안 풀릴 때의 회피책

인코딩 문제가 반복되면 한글명 대신 코드 컬럼을 기준으로 스타일링하는 것이 가장 안정적이다.

예:

- `재산관리관 = 당진시`
- `관리코드 = 1`

이 경우 SLD에서는 문자열 대신 숫자나 코드값으로 비교하면 된다.

```xml
<ogc:Literal>1</ogc:Literal>
```

실무에서는 이 방식이 운영 안정성이 더 높다.

## 대안 도구

SLD XML 작성이 번거롭다면 다음 방법도 사용할 수 있다.

- QGIS에서 스타일을 만든 뒤 SLD로 내보내기
- GeoServer CSS 확장을 사용해 CSS 문법으로 스타일 작성

다만 기본 동작을 이해하려면 먼저 SLD 방식에 익숙해지는 편이 좋다.

## 다음 단계

GeoServer 설치나 레이어 발행이 아직 끝나지 않았다면 다음 문서를 먼저 본다.

- GeoServer 설치와 초기 실행 오류 해결: [WSL2 Ubuntu에서 GeoServer 설치 및 최초 접속 오류 해결](./install-geoserver-on-wsl2-and-fix-first-run.md)
- Shapefile로 WMS 레이어 발행: [GeoServer에서 Shapefile로 WMS 레이어 추가하기](./add-wms-layer-from-shapefile.md)

TerriaMap 연동 후 WMS metadata, CORS, 범례 문제를 확인하려면 [로컬 GeoServer WMS를 TerriaMap에 연동할 때의 문제 해결 가이드](./local-geoserver-wms-troubleshooting.md)를 참고한다.
