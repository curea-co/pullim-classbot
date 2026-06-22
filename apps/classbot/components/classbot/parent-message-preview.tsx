'use client';

import { useState } from 'react';
import { Mail, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ComingSoonButton } from '@/components/classbot/coming-soon-button';

/**
 * 학부모 카카오 BIZ MESSAGE 미리보기 + 발송 워크플로.
 * spec 13 § 3.3.2, § 5.4.
 */
export function ParentMessagePreview({ initialMessage, status }: { initialMessage: string; status: string }) {
  const [message, setMessage] = useState(initialMessage);
  const [sent, setSent] = useState(status === 'sent');

  function handleSend() {
    // P0: console.log mock (실 발송은 v2)
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line no-console
      console.log('[KAKAO BIZ MOCK]', message);
    }
    setSent(true);
  }

  return (
    <section className="bg-card rounded-2xl border p-4">
      <header className="mb-3 flex items-center gap-2">
        <Mail className="text-pullim-blue-600 h-4 w-4" />
        <div className="flex-1">
          <h3 className="text-pullim-slate-900 text-sm font-bold">학부모 발송 미리보기</h3>
          <p className="text-pullim-slate-500 text-micro">카카오 BIZ MESSAGE 템플릿 · 24시간 안에 자동 발송돼요</p>
        </div>
        {sent && (
          <span className="bg-pullim-blue-50 text-pullim-blue-700 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-micro font-bold">
            <Check className="h-3 w-3" /> 발송됨
          </span>
        )}
      </header>

      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        readOnly={sent}
        rows={8}
        aria-label="학부모 발송 메시지"
        className="bg-pullim-slate-50/50 rounded-xl font-mono text-xs leading-relaxed"
      />

      {!sent && (
        <div className="mt-3 flex items-center gap-2">
          <ComingSoonButton asButton variant="secondary" note="발송 보류 큐" className="bg-pullim-slate-100 hover:bg-pullim-slate-200 text-pullim-slate-700">
            보류
          </ComingSoonButton>
          <Button
            type="button"
            size="lg"
            onClick={handleSend}
            className="bg-pullim-blue-600 hover:bg-pullim-blue-700 ml-auto text-white"
          >
            <Mail />
            발송 승인
          </Button>
        </div>
      )}
    </section>
  );
}
