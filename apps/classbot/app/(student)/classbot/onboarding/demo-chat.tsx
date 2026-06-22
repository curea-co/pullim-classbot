'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type DemoState = 'idle' | 'typing' | 'responded' | 'done';

const BOT_NAME = '수학이 형';
const BOT_REPLY =
  '안녕 서연! 나는 수학이 형이야. 오늘 진도·극값·도함수·삼각함수 뭐든 편하게 물어봐 😊';

/**
 * P3-19 온보딩 단계 3 — 인터랙티브 채팅 데모.
 * API 미연결: 입력 텍스트에 무관하게 고정 봇 응답 1회.
 * 데모 완료 후 onDone() 콜백으로 "다음 단계" 진행.
 */
export function DemoChat({ onDone }: { onDone?: () => void }) {
  const [input, setInput] = useState('');
  const [userMsg, setUserMsg] = useState<string | null>(null);
  const [state, setState] = useState<DemoState>('idle');
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // 메시지 등장 후 스크롤
  useEffect(() => {
    if (state !== 'idle') {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [state]);

  function handleSend() {
    const text = input.trim();
    if (!text || state !== 'idle') return;
    setUserMsg(text);
    setInput('');
    setState('typing');
    // 1.2s 후 봇 응답
    setTimeout(() => setState('responded'), 1200);
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleSend();
  }

  const isDisabled = state !== 'idle';

  return (
    <div className="border-pullim-slate-200 bg-card flex flex-col gap-0 overflow-hidden rounded-xl border text-sm shadow-sm">
      {/* 채팅 헤더 */}
      <div className="bg-pullim-blue-600 flex items-center gap-2 px-3 py-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-base font-bold text-white">
          형
        </span>
        <span className="font-bold text-white">{BOT_NAME}</span>
        <span className="bg-pullim-lemon text-pullim-lemon-ink ml-auto rounded-full px-2 py-0.5 text-micro font-bold">
          데모
        </span>
      </div>

      {/* 메시지 영역 */}
      <div className="flex min-h-[96px] flex-col gap-2 overflow-y-auto p-3">
        {/* 봇 첫 인사 */}
        <div className="flex items-end gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pullim-blue-600 text-2xs font-bold text-white">
            형
          </span>
          <div className="bg-pullim-slate-100 text-pullim-slate-800 max-w-[80%] rounded-2xl rounded-bl-none px-3 py-2 leading-snug">
            안녕! 궁금한 거 있으면 뭐든 물어봐 🙌
          </div>
        </div>

        {/* 사용자 메시지 */}
        {userMsg && (
          <div className="flex justify-end">
            <div className="bg-pullim-blue-600 max-w-[80%] rounded-2xl rounded-br-none px-3 py-2 leading-snug text-white">
              {userMsg}
            </div>
          </div>
        )}

        {/* 타이핑 인디케이터 */}
        {state === 'typing' && (
          <div className="flex items-end gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pullim-blue-600 text-2xs font-bold text-white">
              형
            </span>
            <div className="bg-pullim-slate-100 flex items-center gap-1 rounded-2xl rounded-bl-none px-3 py-2">
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-pullim-blue-400"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* 봇 응답 */}
        {state === 'responded' || state === 'done' ? (
          <div className="flex items-end gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pullim-blue-600 text-2xs font-bold text-white">
              형
            </span>
            <div className="bg-pullim-slate-100 text-pullim-slate-800 max-w-[80%] rounded-2xl rounded-bl-none px-3 py-2 leading-snug">
              {BOT_REPLY}
            </div>
          </div>
        ) : null}

        <div ref={bottomRef} />
      </div>

      {/* 입력 영역 */}
      <div className="border-pullim-slate-100 flex items-center gap-2 border-t px-3 py-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          disabled={isDisabled}
          placeholder={isDisabled ? '' : '"안녕!" 이라고 입력해 봐요'}
          className={cn(
            'text-pullim-slate-800 placeholder:text-pullim-slate-400 min-w-0 flex-1 bg-transparent text-sm outline-none',
            isDisabled && 'cursor-default',
          )}
          aria-label="데모 채팅 입력"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={isDisabled || !input.trim()}
          aria-label="보내기"
          className={cn(
            'focus-visible:ring-pullim-blue-400/50 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:ring-2',
            !isDisabled && input.trim()
              ? 'bg-pullim-blue-600 text-white hover:bg-pullim-blue-700'
              : 'bg-pullim-slate-100 text-pullim-slate-400',
          )}
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* 데모 완료 후 다음 단계 버튼 */}
      {(state === 'responded' || state === 'done') && onDone && (
        <div className="border-pullim-slate-100 border-t px-3 py-2">
          <button
            type="button"
            onClick={() => { setState('done'); onDone(); }}
            className="bg-pullim-blue-50 text-pullim-blue-700 hover:bg-pullim-blue-100 focus-visible:ring-pullim-blue-400/50 inline-flex w-full items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-colors focus-visible:ring-2"
          >
            첫 손맛 느꼈어요! 다음 단계로
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
