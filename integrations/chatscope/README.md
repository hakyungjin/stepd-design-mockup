# React 채팅 UI 적용

Chatscope Chat UI Kit 2.1.1로 메시지, 메시지 목록, 입력창과 작성 표시를 교체하는 연동 코드입니다.
최근 대화, 예약 작업, 채팅 내부 예약 제안 카드는 유지합니다. 스타일은 STEP D 토큰으로 조정합니다.

패키지 설치와 적용이 완료되었습니다. 실제 채팅 UI 소스는 `src/features/chat/ChatSurface.tsx`이며,
Chatscope 기본 스타일은 `src/features/chat/chatscope.module.css`에서 STEP D 디자인에 맞춰 조정합니다.
이 폴더에는 초기 적용용 템플릿을 보관합니다. 실행 중인 화면을 수정할 때는 `src/features/chat`의 소스를 수정하세요.

프로젝트 폴더의 일반 터미널에서 실행하세요.

```powershell
npm install @chatscope/chat-ui-kit-react@2.1.1 @chatscope/chat-ui-kit-styles@1.4.0
npm run chat-ui:activate
```

적용 스크립트는 ChatPage의 채팅 영역을 라이브러리 컴포넌트로 교체하고 타입 검사와 Vite 빌드를 수행합니다.
소스 구조가 달라졌으면 적용을 중단하고, 검증에 실패하면 채팅 소스를 원래 상태로 복원합니다.

공식 자료:

- https://github.com/chatscope/chat-ui-kit-react/releases/tag/v2.1.1 (React 19 지원)
- https://github.com/chatscope/chat-ui-kit-react (라이브러리와 MIT 라이선스)
- https://chatscope.io/docs/ (컴포넌트 문서)
