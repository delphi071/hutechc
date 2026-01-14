---
description: 
---

1. 아래 구조도의 예 처럼 화면당 코드 파일을 따로 분리해서 작업하고, App.js는 라우팅만 한다는것을 기억해서 작업해.

/MyProject
  ├── /src
  │    ├── /components    (재사용하는 작은 부품들)
  │    │    ├── MyButton.js
  │    │    ├── Header.js
  │    │    └── UserCard.js
  │    ├── /screens       (실제 페이지 화면들)
  │    │    ├── HomeScreen.js
  │    │    ├── LoginScreen.js
  │    │    └── ProfileScreen.js
  │    ├── /navigation    (화면 이동 설정)
  │    │    └── AppNavigator.js
  │    ├── /styles        (공통 디자인/색상)
  │    └── /utils         (날짜 계산 등 도구 함수)
  └── App.js (이 파일은 단지 시작점일 뿐)

2. 제일 중요한것은 파일 하나에 모든 작업을 하는게 아니고 화면마다, 별도의 파일을 만들어서 라우팅을 한다는거야.
2. React+Tailwind로 작업할거야. 템플릿은 이미 완성되어 있으니, 임의대로 수정하지 말고 있는 디자인 그대로 작업해.
3. 상수는 하나의 파일에서 관리가 되어야해.
4. STITCH 폴더는 참고만 하고 절대 수정 하면 안돼.