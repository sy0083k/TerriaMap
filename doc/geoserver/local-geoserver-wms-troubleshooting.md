# 로컬 GeoServer WMS를 TerriaMap에 연동할 때의 문제 해결 가이드

## 환경 요약

이 문서는 로컬 GeoServer에서 서비스하는 WMS 레이어를 TerriaMap 웹앱에 연결하는 과정에서 실제로 겪었던 문제와 해결 방법을 정리한 것이다.

- GeoServer는 로컬 환경에서 `localhost:8080` 으로 서비스
- TerriaMap 웹앱은 로컬 개발 서버에서 실행
- 같은 WMS는 QGIS Desktop에서는 정상 로드
- 하지만 TerriaMap에서는 metadata 로드 오류, 한글 깨짐, 범례 레이블 상자 표시 문제가 순차적으로 발생

핵심적으로는 다음 세 가지 범주를 구분하는 것이 중요했다.

- WMS metadata 자체를 읽지 못하는 문제
- 한글 깨짐이 인코딩 문제인지 폰트 문제인지 구분하는 문제
- 워크벤치의 범례 이미지 안 심볼로지 레이블이 깨지는 문제

---

## 문제 1. WMS metadata를 불러오지 못하는 오류

### 증상

TerriaMap에서 로컬 GeoServer WMS를 추가할 때 다음과 같은 오류가 발생했다.

- `Failed to load http://localhost:8080/geoserver/.../wms metadata`
- `Request has failed`
- 데이터가 추가되지 않음

반면 QGIS Desktop에서는 같은 WMS가 정상적으로 열렸다.

### 원인

원인은 WMS 서비스 자체의 장애보다는 웹앱에서 로컬 WMS에 접근하는 방식에 있었다.

- GeoServer WMS 자체는 정상 응답
- TerriaMap은 metadata 요청을 브라우저 직접 호출이 아니라 프록시 경로로 우회하려는 경우가 있음
- Terria 프록시 서버는 보안상 `localhost`, `127.0.0.1`, loopback 대역 접근을 차단할 수 있음
- 직접 브라우저 요청으로 우회하더라도 GeoServer에 CORS가 설정되지 않으면 `localhost:3001 -> localhost:8080` 교차 출처 요청이 막힐 수 있음

즉, QGIS는 브라우저가 아니므로 제한이 없었고, TerriaMap은 브라우저와 프록시 제약을 동시에 받았다.

### 확인 방법

1. GeoServer WMS가 실제로 살아 있는지 확인

```bash
curl -I "http://localhost:8080/geoserver/my_project/wms?service=WMS&request=GetCapabilities"
```

`200 OK` 면 WMS 자체는 살아 있는 것이다.

2. 브라우저 DevTools Network에서 실패한 요청 확인

- `GetCapabilities`
- `proxy/...GetCapabilities...`
- `GetLegendGraphic`

중 어느 요청이 실패하는지 본다.

3. GeoServer 응답 헤더에서 CORS 설정 확인

- `Access-Control-Allow-Origin`

이 헤더가 없으면 브라우저 직접 호출은 실패할 수 있다.

### 해결 방법

다음 중 하나로 해결한다.

1. 권장 방식

- GeoServer에 CORS 허용 설정 추가
- Terria가 프록시 없이 직접 접근할 수 있게 설정 조정

2. 개발 환경 한정 방식

- Terria 프록시의 loopback 차단 정책을 완화
- 단, 이 방법은 SSRF 방어를 약화시키므로 로컬 개발 전용으로만 사용

3. 실행 환경 분리 이슈 확인

- Docker, WSL, VM 환경에서는 `localhost` 가 서로 다른 네임스페이스일 수 있음
- 이 경우 `localhost` 대신 실제 호스트 IP 또는 브리지 주소를 사용

### 재발 방지

- QGIS에서 되더라도 웹앱에서는 CORS와 프록시를 별도로 확인해야 한다
- `localhost` 기반 WMS는 로컬 브라우저 앱에서 항상 예외 케이스로 취급한다

---

## 문제 2. 범례 이미지 안 심볼로지 한글 레이블이 상자로 보이는 문제

### 증상

처음에는 워크벤치 텍스트가 깨진 것으로 보였지만, 실제로는 WMS `Title` 이 아니라 범례 이미지 안의 심볼로지 레이블이 상자로 표시되고 있었다.

이번 사례에서 중요한 관찰 포인트는 다음과 같았다.

- 깨진 문자열 형태가 `ìì¸` 같은 인코딩 깨짐이 아니라 `□` 형태였다
- `GetCapabilities` 응답은 `UTF-8` 선언이었고 본문 자체에서 인코딩 이상 징후가 없었다
- 따라서 문제는 metadata 인코딩보다 범례 이미지 렌더링 폰트에 있을 가능성이 높았다

### 원인

Terria는 GeoServer WMS 범례를 보통 `LegendURL` 또는 `GetLegendGraphic` 이미지로 받아서 표시한다.

즉, 이 레이블은 브라우저 DOM 텍스트가 아니라 GeoServer가 서버에서 렌더링한 이미지 안 글자다.

이 구조에서는 다음 사실이 중요하다.

- `wwwroot/config.json` 의 웹폰트 설정은 브라우저 UI에만 영향
- GeoServer 범례 이미지 안 글자에는 영향 없음

또한 Terria의 GeoServer용 legend 요청 생성 로직에서는 `LEGEND_OPTIONS` 를 붙이고 있었고, 여기서 `fontName:Courier` 를 사용하고 있었다.

예시 개념:

```text
LEGEND_OPTIONS=fontName:Courier;fontStyle:bold;fontSize:12;forceLabels:on;...
```

`Courier` 는 한글 표시용 폰트가 아니며, GeoServer/JVM 환경에서 한글 글리프를 제공하지 못하면 범례 이미지 안 한글이 상자로 나온다.

### 확인 방법

1. DevTools Network에서 `GetLegendGraphic` 요청 확인
2. 요청 URL의 `LEGEND_OPTIONS` 확인
3. 해당 범례 URL을 브라우저에서 직접 열어 범례 이미지 안 한글이 깨지는지 확인

이때 다음이 확인되면 원인이 거의 확정된다.

- UI 본문 텍스트는 정상
- 범례 이미지 안 글자만 상자
- `LEGEND_OPTIONS` 에 `fontName:Courier` 포함

### 해결 방법

Terria의 GeoServer legend 요청에서 `Courier` 대신 한글 지원 폰트를 사용하도록 수정한다.

권장 예:

- `Noto Sans CJK KR`
- `Noto Sans KR`
- `NanumGothic`

중요한 점:

- Terria 코드에서 폰트 이름을 바꾸는 것만으로 충분하지 않을 수 있음
- GeoServer 실행 환경에 그 폰트가 실제 설치되어 있어야 함

### WSL Ubuntu에서 해결한 사례

이번 사례에서는 WSL Ubuntu 환경에 다음 패키지를 설치한 뒤 문제가 해결되었다.

```bash
sudo apt-get update
sudo apt-get install -y fonts-noto-cjk
fc-cache -f -v
```

필요하면 GeoServer 또는 Tomcat 프로세스를 재시작한다.

### 해석

이 결과는 다음을 강하게 시사한다.

- GeoServer 실행 환경에 한글 글리프가 포함된 폰트가 없었다
- `Courier` 지정은 그 문제를 더 분명하게 드러내는 조건이었다
- `fonts-noto-cjk` 설치 후 GeoServer/JVM 이 한글을 렌더링할 수 있게 되어 범례 이미지가 정상화되었다

### `Courier` 가 원인이라고 볼 수 있는가

실무적으로는 원인이라고 봐도 된다. 다만 더 정확히는 다음과 같이 보는 편이 좋다.

- 직접 원인: GeoServer 실행 환경의 한글 글리프 부족
- 촉발 요인: `fontName:Courier` 지정

즉, `Courier` 하나만의 문제가 아니라 서버 폰트 환경과 결합된 문제였다.

### 재발 방지

- 범례만 깨지면 UI 폰트가 아니라 `GetLegendGraphic` 경로를 먼저 확인
- `LEGEND_OPTIONS` 의 `fontName` 과 서버에 실제 설치된 폰트가 일치하는지 확인
- GeoServer 기반 범례는 항상 서버 폰트 의존성이 있다는 점을 염두에 둔다

---

## 빠른 점검 체크리스트

### WMS metadata 로드 실패 시

- `curl -I` 로 GeoServer WMS 응답 확인
- DevTools Network에서 `GetCapabilities` 실패 여부 확인
- CORS 헤더 존재 여부 확인
- 프록시가 `localhost` 를 차단하는지 확인
- Docker/WSL 환경이면 `localhost` 가 올바른 대상인지 확인

### 한글 깨짐 진단 시

- `ìì¸` 형태면 인코딩 문제 의심
- `□` 형태면 폰트 글리프 부족 의심
- `GetCapabilities` 응답 본문이 실제로 깨졌는지 먼저 확인

### 범례만 깨질 시

- `GetLegendGraphic` 요청 URL 확인
- `LEGEND_OPTIONS` 의 `fontName` 확인
- GeoServer 실행 환경에 CJK 폰트 설치 여부 확인
- 필요한 경우 GeoServer 또는 Tomcat 재시작

---

## 결론

이번 사례에서 로컬 GeoServer WMS를 TerriaMap에 안정적으로 연동하기 위해 확인해야 했던 핵심은 다음과 같았다.

- QGIS에서 된다고 브라우저 웹앱에서도 되는 것은 아님
- metadata 실패는 WMS 자체가 아니라 프록시/CORS/localhost 접근 문제일 수 있음
- 범례 심볼로지 레이블은 브라우저 UI가 아니라 GeoServer가 생성한 이미지 안 텍스트임
- GeoServer 범례 한글 문제는 서버 폰트 설치와 `LEGEND_OPTIONS` 폰트 설정이 핵심임

같은 유형의 문제가 다시 발생하면 다음 순서로 보는 것이 가장 빠르다.

1. `GetCapabilities` 가 실제로 열리는지 확인
2. 깨진 문자열 모양으로 인코딩/폰트 문제를 구분
3. 범례만 깨지면 `GetLegendGraphic` 과 GeoServer 폰트를 우선 점검
