# WSL2 Ubuntu에서 GeoServer 설치 및 최초 접속 오류 해결

## 문서 목적

이 문서는 Windows 11의 WSL2 Ubuntu 환경에서 GeoServer를 설치하고, 최초 접속 시 실제로 겪었던 초기 오류를 해결하는 과정을 정리한 것이다.

처음 설치하는 사용자가 `자바 설치 → GeoServer 다운로드 → 환경 변수 설정 → 서버 실행 → 초기 접속 오류 해결` 순서로 따라갈 수 있도록 구성했다.

## 환경 기준

이 문서의 예시는 다음 환경을 기준으로 한다.

- Windows 11
- WSL2 Ubuntu
- GeoServer `2.24.1`
- OpenJDK `11`
- 설치 경로: `/home/<username>/projects/geoserver`

`/home/<username>/projects/geoserver` 자체는 문제가 되는 경로가 아니다. 실제 문제는 최초 실행 시 `GEOSERVER_DATA_DIR` 이 상대 경로 형태로 해석된 점이었다.

## 1. Java 설치

GeoServer는 Java 기반 소프트웨어이므로 먼저 Java 런타임이 필요하다.

1. 패키지 목록을 갱신한다.

```bash
sudo apt update
sudo apt upgrade -y
```

2. Java 11을 설치한다.

```bash
sudo apt install openjdk-11-jre-headless -y
```

필요하면 전체 개발 도구가 포함된 JDK를 사용해도 되지만, 이번 사례에서는 Java 버전 자체가 문제는 아니었다.

3. 설치가 끝나면 버전을 확인한다.

```bash
java -version
```

예시:

```text
openjdk version "11.0.30"
```

Java 11이 출력되면 GeoServer 실행 조건은 충족한 것이다.

## 2. GeoServer 다운로드 및 압축 해제

GeoServer는 설치 프로그램보다 Platform Independent Binary 배포본을 사용하는 편이 단순하다.

1. 설치 디렉터리를 만든다.

```bash
mkdir -p ~/projects/geoserver
cd ~/projects/geoserver
```

2. GeoServer 바이너리를 다운로드한다.

```bash
wget https://sourceforge.net/projects/geoserver/files/GeoServer/2.24.1/geoserver-2.24.1-bin.zip
```

3. 압축 해제 도구를 설치한다.

```bash
sudo apt install unzip -y
```

4. 다운로드한 파일을 압축 해제한다.

```bash
unzip geoserver-2.24.1-bin.zip
```

압축이 정상적으로 풀리면 `bin`, `data_dir`, `webapps` 같은 디렉터리가 생성된다.

## 3. 환경 변수 설정

이번 사례에서 가장 중요한 부분이다.

GeoServer 2.24.x 환경에서는 `GEOSERVER_DATA_DIR` 이 `bin/../data_dir` 같은 상대 경로 형태로 해석되면 내부 보안 검증에 걸릴 수 있다. 따라서 환경 변수는 절대 경로로 고정하는 것이 안전하다.

1. `~/.bashrc` 파일을 연다.

```bash
nano ~/.bashrc
```

2. 파일 끝에 다음 내용을 추가한다.

```bash
export GEOSERVER_HOME=/home/<username>/projects/geoserver
export GEOSERVER_DATA_DIR=/home/<username>/projects/geoserver/data_dir
```

중요한 점:

- `GEOSERVER_HOME` 과 실제 설치 경로가 정확히 일치해야 한다.
- `GEOSERVER_DATA_DIR=$GEOSERVER_HOME/data_dir` 처럼 써도 셸에서는 동작할 수 있지만, 이번 사례에서는 최종 값을 절대 경로로 명시하는 편이 더 안전했다.

3. 설정을 적용한다.

```bash
source ~/.bashrc
```

4. 값이 올바른지 확인한다.

```bash
echo $GEOSERVER_HOME
echo $GEOSERVER_DATA_DIR
```

정상 예시:

```text
/home/<username>/projects/geoserver
/home/<username>/projects/geoserver/data_dir
```

## 4. GeoServer 실행 및 접속

1. 실행 디렉터리로 이동한다.

```bash
cd ~/projects/geoserver/bin
```

2. 실행 권한을 부여한다.

```bash
chmod +x startup.sh shutdown.sh
```

3. GeoServer를 시작한다.

```bash
./startup.sh
```

4. 브라우저에서 다음 주소로 접속한다.

```text
http://localhost:8080/geoserver
```

초기 로그인 정보:

- ID: `admin`
- Password: `geoserver`

정상이라면 GeoServer 관리자 첫 화면이 열린다.

## 5. 최초 접속 시 발생한 초기 오류

이번 사례에서는 서버가 기동된 것처럼 보였지만, 메인 페이지 접속 시 다음과 같은 예외가 발생했다.

- `org.apache.wicket.WicketRuntimeException`
- `Can't instantiate page using constructor 'public org.geoserver.web.GeoServerHomePage()'`
- `Caused by: java.lang.NullPointerException`

처음에는 홈 페이지 렌더링 오류처럼 보였지만, 실제 핵심 원인은 아래 로그에 있었다.

```text
Caused by: java.lang.IllegalArgumentException: Contains invalid '..' path: /home/<username>/projects/geoserver/bin/../data_dir
```

## 6. 실제 원인

원인은 설치 경로나 Java 버전이 아니라 `GEOSERVER_DATA_DIR` 이 상대 경로 형태로 해석된 점이었다.

GeoServer `2.24.x` 계열에서는 보안 강화로 인해 `..` 가 포함된 경로를 일부 내부 리소스 로딩 과정에서 허용하지 않는다. 이번 사례에서는 다음 경로가 문제였다.

```text
/home/<username>/projects/geoserver/bin/../data_dir
```

이 경로는 운영체제 입장에서는 해석 가능한 경로이지만, GeoServer 내부 검증에서는 유효하지 않은 경로로 간주되었다.

그 결과:

- 기본 데이터스토어 일부가 로드되지 못했고
- 카탈로그 초기화가 불완전해졌으며
- 최종적으로 홈 페이지 구성 중 `NullPointerException` 이 연쇄적으로 발생했다

즉, `WicketRuntimeException` 은 표면 증상이고, 실제 원인은 `GEOSERVER_DATA_DIR` 경로 검증 실패였다.

## 7. 해결 방법

해결은 단순하다. GeoServer가 사용하는 경로를 모두 절대 경로로 고정하면 된다.

1. `~/.bashrc` 의 환경 변수를 다시 확인한다.

```bash
export GEOSERVER_HOME=/home/<username>/projects/geoserver
export GEOSERVER_DATA_DIR=/home/<username>/projects/geoserver/data_dir
```

2. 셸 설정을 다시 적용한다.

```bash
source ~/.bashrc
```

3. 현재 프로세스를 종료한 뒤 다시 시작한다.

```bash
cd ~/projects/geoserver/bin
./shutdown.sh
./startup.sh
```

4. 재시작 로그를 확인한다.

정상 상태에서는 다음처럼 `bin/../data_dir` 대신 절대 경로가 직접 보여야 한다.

```text
GEOSERVER DATA DIR is /home/<username>/projects/geoserver/data_dir
```

이후 브라우저에서 다시 접속했을 때 관리자 홈 화면이 정상적으로 열리면 해결된 것이다.

## 8. 빠른 점검 체크리스트

- `java -version` 이 Java 11 이상인지 확인
- `echo $GEOSERVER_HOME` 값이 실제 설치 경로와 일치하는지 확인
- `echo $GEOSERVER_DATA_DIR` 값이 절대 경로인지 확인
- 시작 로그에 `bin/../data_dir` 문구가 보이는지 확인
- 예외 로그에 `Contains invalid '..' path` 가 보이면 경로 해석 문제가 맞다

## 9. 다음 단계

GeoServer 설치와 초기 접속이 끝났다면 다음 문서를 이어서 보면 된다.

- Shapefile로 WMS 레이어를 발행하려면 [GeoServer에서 Shapefile로 WMS 레이어 추가하기](./add-wms-layer-from-shapefile.md)
- TerriaMap 연동 후 WMS metadata, CORS, 범례 문제를 해결하려면 [로컬 GeoServer WMS를 TerriaMap에 연동할 때의 문제 해결 가이드](./local-geoserver-wms-troubleshooting.md)
