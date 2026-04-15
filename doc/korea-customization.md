# korea-customization 브랜치 변경 사항

이 문서는 `korea-customization` 브랜치가 upstream `main` 대비 어떤 기능과 설정을 추가하는지 정리한 기준 문서입니다. 빠른 시작만 필요하면 [README](../README.md)를 먼저 보고, 여기서는 브랜치 차이와 관련 문서를 확인하면 됩니다.

## 추가된 기능

이 브랜치는 한국 환경에서 바로 시작하기 쉽도록 다음 기능을 추가합니다.

- VWorld 주소 검색 제공자
  - `config.json`의 `searchProviders`에 `vworld-search-provider`를 추가해 주소 검색을 사용할 수 있습니다.
  - 검색 결과 클릭 시 해당 위치로 이동하며, 필지 검색 결과는 경계 강조 표시를 지원합니다.
- 한국형 베이스맵 및 예시 카탈로그
  - `simple.json.example`에 VWorld 일반, 백지도, 영상, 하이브리드 베이스맵 예시가 포함되어 있습니다.
  - 예시 카탈로그에는 VWorld WMS 연결 예시가 포함되어 있습니다.
- 한국어 현지화
  - 한국어/영어 언어 설정이 활성화되어 있습니다.
  - 검색 관련 메시지와 일부 UI 텍스트의 한국어 번역이 보강되어 있습니다.
- GeoServer 연동 문서
  - 로컬 GeoServer 설치, WMS 추가, 한글 관련 문제 해결 문서를 `doc/geoserver/` 아래에 제공합니다.

## 설정 차이

브랜치에서 기본적으로 달라지는 설정 포인트는 다음과 같습니다.

- `wwwroot/config.json.example`
  - `languageConfiguration`이 활성화되어 있습니다.
  - VWorld 주소 검색 제공자가 기본 예시로 등록되어 있습니다.
  - `YOUR_VWORLD_API_KEY` 값을 실제 키로 교체해야 합니다.
- `wwwroot/init/simple.json.example`
  - 기본 홈 카메라와 뷰어 모드가 한국 사용 사례에 맞게 조정되어 있습니다.
  - VWorld WMTS 베이스맵과 VWorld WMS 예시가 포함되어 있습니다.
  - `YOUR_VWORLD_API_KEY`, `YOUR_LOCAL_DOMAIN` 값을 실제 환경에 맞게 교체해야 합니다.
- `serverconfig.json`
  - 개발 환경에서 VWorld 및 로컬 연동에 필요한 프록시 허용 대상이 추가되어 있습니다.

## 시작 방법

로컬에서 이 브랜치를 실행할 때 사용자가 직접 해야 하는 최소 작업은 다음과 같습니다.

1. `wwwroot/config.json.example`을 `wwwroot/config.json`으로 복사합니다.
2. `wwwroot/init/simple.json.example`을 `wwwroot/init/simple.json`으로 복사합니다.
3. 두 파일의 `YOUR_VWORLD_API_KEY`를 실제 VWorld API 키로 바꿉니다.
4. `simple.json`의 `YOUR_LOCAL_DOMAIN`을 현재 개발 환경에서 사용하는 도메인으로 바꿉니다.

그 뒤 일반적인 TerriaMap 실행 절차에 따라 앱을 실행하면 됩니다.

## 관련 문서

- [GeoServer에서 shapefile WMS 추가](geoserver/add-wms-layer-from-shapefile.md)
- [WSL2에서 GeoServer 설치 및 첫 실행 문제 해결](geoserver/install-geoserver-on-wsl2-and-fix-first-run.md)
- [로컬 GeoServer WMS 문제 해결](geoserver/local-geoserver-wms-troubleshooting.md)
- [WMS 스타일링 및 한글 필터 문제 해결](geoserver/style-wms-layer-and-fix-korean-attribute-filter.md)

## 유지보수 메모

upstream `main`을 병합할 때는 다음 영역에서 충돌 가능성이 큽니다.

- `index.js`의 검색 제공자 등록 지점
- `wwwroot/config.json.example`의 언어 및 검색 설정
- `wwwroot/init/simple.json.example`의 베이스맵과 예시 카탈로그 설정
- `serverconfig.json`의 프록시 허용 목록
