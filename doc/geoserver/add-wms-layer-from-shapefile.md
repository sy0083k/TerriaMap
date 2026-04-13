# GeoServer에서 Shapefile로 WMS 레이어 추가하기

## 문서 목적

이 문서는 GeoServer에서 Shapefile 데이터를 등록하고 WMS(Web Map Service) 레이어로 발행하는 가장 기본적인 절차를 설명한다.

처음 접하는 사용자가 `작업 공간 생성 → 저장소 연결 → 레이어 발행 → 결과 확인` 순서로 따라 할 수 있도록 구성했다.

## 사전 준비

작업을 시작하기 전에 다음을 준비한다.

- GeoServer가 실행 중이어야 한다.
- 발행할 Shapefile 세트가 준비되어 있어야 한다.
- 최소한 `.shp`, `.shx`, `.dbf` 파일이 같은 이름으로 함께 있어야 한다.

예시:

```text
seoul_data.shp
seoul_data.shx
seoul_data.dbf
```

### WSL 환경 주의사항

WSL 환경에서는 GeoServer가 실제로 접근할 수 있는 경로에 Shapefile을 두는 것이 중요하다.

권장 방식은 발행할 파일을 GeoServer `data_dir` 내부 또는 GeoServer가 읽을 수 있는 로컬 디렉터리로 미리 옮겨두는 것이다.

예를 들어 다음과 같이 준비해 둔다.

```text
GEOSERVER_DATA_DIR/data/my_project/seoul_data.shp
GEOSERVER_DATA_DIR/data/my_project/seoul_data.shx
GEOSERVER_DATA_DIR/data/my_project/seoul_data.dbf
```

웹 UI에서 파일을 선택할 때 경로 접근 문제를 줄이려면 이 준비를 먼저 끝내는 편이 안전하다.

## 1. 작업 공간 생성

작업 공간은 관련 레이어를 하나로 묶어 관리하는 단위다.

1. 왼쪽 메뉴에서 `데이터 > 작업 공간`을 클릭한다.
2. `새 작업 공간 추가`를 클릭한다.
3. 다음 값을 입력한다.

- `이름(Name)`: `my_project`
- `네임스페이스 URI(Namespace URI)`: `http://localhost/my_project`

`네임스페이스 URI` 는 실제 접속 가능한 URL일 필요는 없지만, 다른 작업 공간과 겹치지 않는 고유한 값이어야 한다.

4. `저장`을 클릭한다.

정상적으로 저장되면 `my_project` 작업 공간이 목록에 표시된다.

## 2. 저장소 생성

저장소는 GeoServer에 실제 데이터 파일의 위치를 알려주는 설정이다.

1. 왼쪽 메뉴에서 `데이터 > 저장소`를 클릭한다.
2. `새로운 저장소 생성`을 클릭한다.
3. `벡터 데이터 소스`에서 `Shapefile`을 선택한다.
4. 다음 값을 입력한다.

- `작업 공간`: `my_project`
- `데이터 소스 이름`: `seoul_data`

5. `연결 매개변수`에서 Shapefile 경로를 지정한다.

- `찾아보기...` 버튼으로 미리 준비한 `.shp` 파일을 선택한다.
- WSL 환경에서는 앞서 준비한 `data_dir` 내부 파일을 선택하는 것이 좋다.

6. `저장`을 클릭한다.

정상적으로 저장되면 새 레이어 선택 화면으로 이동하거나, 방금 등록한 저장소가 목록에 표시된다.

## 3. 레이어 발행

저장소를 만들었다고 바로 WMS 레이어가 서비스되는 것은 아니다. 실제로 지도로 배포하려면 레이어를 발행해야 한다.

1. 저장소 저장 후 새 레이어 선택 화면으로 이동했다면 해당 레이어를 선택한다.
2. 자동으로 이동하지 않았다면 왼쪽 메뉴에서 `데이터 > 레이어`를 클릭한다.
3. 방금 만든 저장소의 레이어 옆 `발행(Publish)`을 클릭한다.

### 데이터 탭에서 확인할 항목

레이어 발행 화면의 `데이터` 탭에서 다음 항목을 반드시 확인한다.

- `좌표 참조 체계(SRS)`
- `경계 박스(Bounding Boxes)`

#### 1) SRS 확인

`데이터에서 선언된 SRS` 값이 실제 데이터와 맞는지 확인한다.

보통 다음과 같은 좌표계를 많이 사용한다.

- `EPSG:4326`
- `EPSG:5186`

좌표계가 잘못 지정되면 미리보기나 외부 클라이언트에서 레이어 위치가 어긋날 수 있다.

#### 2) Bounding Boxes 계산

다음 두 버튼을 순서대로 클릭한다.

1. `데이터로부터 계산`
2. `원본 영역으로부터 산출`

이 과정을 생략하면 레이어 미리보기나 GetMap 요청에서 화면 범위가 올바르게 잡히지 않을 수 있다.

3. `저장`을 클릭한다.

정상적으로 저장되면 레이어가 GeoServer에 발행된다.

## 4. 결과 확인

이제 레이어가 실제로 WMS로 서비스되는지 확인한다.

1. 왼쪽 메뉴에서 `데이터 > 레이어 미리보기`를 클릭한다.
2. 방금 만든 레이어 이름을 찾는다.
3. 해당 레이어의 `OpenLayers` 링크를 클릭한다.

새 창에서 지도가 정상적으로 보이면 WMS 레이어 발행이 완료된 것이다.

## 외부 클라이언트에서 WMS 호출하기

Leaflet, OpenLayers, QGIS 같은 외부 클라이언트에서 이 서비스를 사용하려면 다음 주소를 기본 WMS URL로 사용한다.

```text
http://localhost:8080/geoserver/my_project/wms
```

필요한 경우 여기에 `service=WMS`, `request=GetCapabilities` 같은 표준 파라미터를 붙여 사용할 수 있다.

## 참고

레이어는 정상 발행되었지만 TerriaMap이나 브라우저 환경에서 다음과 같은 문제가 발생할 수 있다.

- `GetCapabilities` 호출 실패
- CORS 또는 프록시 문제
- 범례 한글 깨짐
- GeoServer 폰트 문제

GeoServer 자체 설치와 최초 실행 오류 해결이 먼저 필요하면 [WSL2 Ubuntu에서 GeoServer 설치 및 최초 접속 오류 해결](./install-geoserver-on-wsl2-and-fix-first-run.md)을 참고한다.

레이어 발행 후 채우기 색상, 외곽선, 속성값 기반 분류 스타일을 적용하려면 [GeoServer에서 WMS 레이어 스타일링과 한글 속성값 문제 해결](./style-wms-layer-and-fix-korean-attribute-filter.md)을 참고한다.

이 경우에는 [로컬 GeoServer WMS를 TerriaMap에 연동할 때의 문제 해결 가이드](./local-geoserver-wms-troubleshooting.md)를 참고한다.
