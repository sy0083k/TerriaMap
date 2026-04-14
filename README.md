# Terria Map

[![Build Status](https://github.com/TerriaJS/TerriaMap/actions/workflows/ci.yml/badge.svg?branch=main&event=push)](https://github.com/TerriaJS/TerriaMap/actions/workflows/ci.yml) [![Docs](https://img.shields.io/badge/docs-online-blue.svg)](https://docs.terria.io/)

![Terria logo](terria-logo.png "Terria logo")

이 저장소는 TerriaJS 라이브러리를 사용해 구축된 완전한 웹사이트입니다. TerriaJS에 대한 정보와 이 저장소를 사용한 시작 방법은 [TerriaJS README](https://github.com/TerriaJS/TerriaJS)를 참고하세요.

지도를 배포하는 방법은 [여기 문서](doc/deploying/deploying-to-aws.md)를 참고하세요.

## 로컬 설정

`wwwroot/config.json`과 `wwwroot/init/simple.json`은 API 키가 커밋되지 않도록 로컬 전용 파일로 취급됩니다.

앱을 실행하기 전에 `wwwroot/config.json.example`을 `wwwroot/config.json`으로 복사한 뒤, `vworld-search-provider` 항목의 `YOUR_VWORLD_API_KEY`를 실제 값으로 바꾸세요.

그 다음 `wwwroot/init/simple.json.example`을 `wwwroot/init/simple.json`으로 복사하고, `YOUR_VWORLD_API_KEY`와 `YOUR_LOCAL_DOMAIN`을 로컬 환경에 맞는 값으로 바꾸세요.

문의 채널:

- [TerriaJS Github Discussion](https://github.com/TerriaJS/terriajs/discussions)에 참여하기
- [TerriaJS Github issue tracker](https://github.com/TerriaJS/terriajs/issues/new)에 이슈 등록하기

---

## 주요 공지

아래는 포크를 유지보수하는 사용자에게 영향을 줄 수 있는 주요 공지와 업그레이드 목록입니다([TerriaJS announcements](https://github.com/TerriaJS/terriajs/discussions/categories/announcements)에서 가져옴). 각 릴리스에 포함된 최신 TerriaJS 버전을 포함한 TerriaMap 전체 변경 사항은 [CHANGES.md](https://github.com/TerriaJS/TerriaMap/blob/main/CHANGES.md)를 참고하세요.

### TerriaJS v8.3.0 릴리스 (2023-05-22)

TerriaJS `8.3.0`에는 몇 가지 호환성 영향이 있는 변경 사항이 포함되어 있습니다.

    - Upgrade to Typescript version 4.9.x
    - Upgrade to Mobx version 6.9.x

이 변경은 사용자 정의 데이터 제공자(즉, catalog items)처럼 로컬 모델 레이어를 수정한 경우에만 지도에 영향을 줄 수 있습니다. 그런 수정이 없다면 일반적인 업그레이드처럼 진행하면 됩니다. 로컬 수정이 있는 지도를 업그레이드하는 방법은 [upgrade guide](https://github.com/TerriaJS/terriajs/discussions/6787)를 참고하세요.

### PM2 지원 종료 (2023-03-21)

의존성에서 pm2를 제거했으며, 더 이상 pm2로 terriajs-server를 실행하기 위한 설정을 제공하지 않습니다.

이제 `npm start`는 pm2를 사용하지 않기 때문에 포그라운드에서 실행됩니다. 개발을 더 쉽게 하기 위해 새 작업인 `gulp dev`가 도입되었습니다. 이 작업은 terriajs-server를 실행하고, 변경 사항을 감시하며 점진적으로 빌드하는 `gulp watch`를 함께 시작합니다. 배경과 대응 방법은 https://github.com/TerriaJS/terriajs/discussions/6731 를 참고하세요.

### 코드베이스를 [Prettier](https://prettier.io/)로 재포맷함 (2022-08-29)

이 변경으로 `main`을 포크에 병합할 때 큰 merge conflict가 발생할 수 있습니다. 이 포맷 변경을 병합하는 방법은 https://github.com/TerriaJS/terriajs/discussions/6517 를 참고하세요.

### TerriaJS v8 릴리스 (2021-08-13)

의미하는 바는 다음과 같습니다.

- [TerriaMap의 main 브랜치](https://github.com/TerriaJS/TerriaMap/tree/main)는 이제 TerriaJS v8+를 사용합니다
- [TerriaMap의 terriajs7 브랜치](https://github.com/TerriaJS/TerriaMap/tree/terriajs7)는 TerriaJS v7을 사용하지만 더 이상 업데이트되지 않습니다
- TerriaJS v7 사용자가 애플리케이션을 TerriaJS v8로 업그레이드할 수 있도록 [migration guide](https://docs.terria.io/guide/contributing/migration-guide/)를 제공합니다
- [GitHub discussions forum](https://github.com/TerriaJS/terriajs/discussions)에서 저희와 커뮤니티에 문의해 주세요
