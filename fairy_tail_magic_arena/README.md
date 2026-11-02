# FAIRY TAIL : MAGIC ARENA

**온라인 2D 액션 대전 연습용 팬게임 프로토타입 (비공식)**

## 구현된 기능

- 온라인 1vs1 (2명) / 1vs1vs1 (3명) / 2vs2 (4명)
- 방 코드 생성/입장 및 초대 링크 공유
- 캐릭터 4명: 나츠, 루시, 엘자, 그레이 (각각 고유 기본 공격, 스킬 3개, 궁극기)
- 실시간 위치 동기화, 서버 권한 타격 및 체력/마나/쿨타임 판정
- 120초 대전, 사망/승패 판정, 재대결 대기실, 채팅
- 자체 제작 SVG 캐릭터 이미지와 Canvas 전투 이펙트
- 오디오 연동 슬롯: BGM 1개 + 캐릭터당 음성 5개 (실제 음원 미포함)
- Node.js **외부 패키지 없이 실행** (내장 HTTP + WebSocket 구현)

## Windows에서 실행

1. [Node.js](https://nodejs.org/) 20 이상 설치
2. 프로젝트 폴더의 `START_WINDOWS.bat` 더블클릭
3. 브라우저로 `http://localhost:3000` 접속
4. PC에서 브라우저 탭 2개를 열어 테스트하거나 같은 Wi-Fi의 친구에게 `http://내PCIP:3000` 공유

터미널 실행: `npm start` / 자동화 검증: `npm test`

## 친구들과 인터넷으로 접속하기: Render

1. 새로운 GitHub 저장소(예: `fairy-tail-magic-arena`) 만들기
2. **이 폴더 안의 내용**(`server.js`, `package.json`, `public/`, `render.yaml` 등)을 저장소 최상단에 업로드
3. [Render](https://dashboard.render.com/) → New → Blueprint 선택 후 저장소 연결 (`render.yaml` 자동 인식)
4. 또는 Web Service로 연결: Language Node, Region Singapore, Build `npm install`, Start `npm start`, Free 요금제 선택
5. Render Live 후 `https://서비스이름.onrender.com`에 접속, 방 만들기 → 친구에게 초대 링크 공유

**기존 버섯숲 RPG 서버와는 별도 프로젝트로 배포하세요.** 기존 서비스 설정을 변경할 필요 없습니다.

## 조작

| 키 | 동작 |
|---|---|
| WASD / 방향키 | 이동 |
| 마우스 이동 | 스킬 조준 |
| J 또는 마우스 왼쪽 버튼 | 기본 공격 |
| Q / E / R | 마법 스킬 |
| F | 궁극기 (게이지 100%) |
| Enter | 채팅 |

모바일용 터치 버튼은 기본 시범 구현이며 PC 브라우저에서 가장 안정적입니다.

## 사운드 파일

`public/assets/audio/README_KO.txt` 참고.

- BGM: `public/assets/audio/battle-theme.mp3`
- 한국어 더빙: `public/assets/audio/voices/{natsu|lucy|erza|gray}/{attack|skill-q|skill-e|skill-r|ultimate}.mp3`

**원작 메인 테마 및 원작 더빙 음성은 번들에 포함되지 않습니다.** 적절한 음원 파일을 직접 추가하면 게임 엔진이 파일을 찾아 재생하도록 설계했습니다. 외부에서 MP3 원본을 자동 다운로드하거나 특정 성우의 음성을 AI 복제하는 코드는 없습니다.

## 현재 버전 제한 사항

- 영구 계정 / 랭킹 / 게임 기록 저장 없음, 서버 재시작 시 모든 방 초기화
- 보안 및 치트 방지의 기본적인 서버 판정은 있으나 정식 경쟁 게임 수준의 보안/운영 대비는 미완성
- Render Free 플랜은 유휴 시 절전할 수 있고 재시작 후 진행 데이터는 초기화됨
- 브라우저 부하/네트워크 상태에 따라 지연이나 움직임 떨림이 있을 수 있음
- 본 게임은 비공식 개인 학습용 팬 프로젝트이며 원작 게임/제작사에서 제공하지 않음
