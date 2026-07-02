// apps/classbot 전용 Jest setup. 공통 stub(jest-dom · next/navigation · matchMedia)은
// <repo-root>/config/jest.setup.ts 에 있으며 jest.config.ts 의 setupFilesAfterEnv 가 둘 다 로드한다.
// classbot 고유 setup 이 필요해지면 여기에 추가.

// jsdom 에는 TextEncoder/TextDecoder 가 없다 — JWT 디코드(decodeAccessToken →
// base64UrlDecode)가 UTF-8 복원에 TextDecoder 를 쓰므로 Node util 로 폴리필한다.
import { TextDecoder, TextEncoder } from 'util';

if (typeof globalThis.TextEncoder === 'undefined') {
  globalThis.TextEncoder = TextEncoder as unknown as typeof globalThis.TextEncoder;
}
if (typeof globalThis.TextDecoder === 'undefined') {
  globalThis.TextDecoder = TextDecoder as unknown as typeof globalThis.TextDecoder;
}

export {};
