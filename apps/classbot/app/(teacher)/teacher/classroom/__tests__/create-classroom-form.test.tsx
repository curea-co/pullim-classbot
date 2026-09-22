/**
 * 반 만들기 폼 — `POST /classbot/classes`(계획 PR 5b). 이름만 필수, 비운 칸은 보내지 않는다, 만든 반과 첫 코드를 위로
 * 올린다, 실패는 서버가 가른 뜻대로 말한다.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { ApiError } from '@pullim-classbot/api-client';
import type { ClassDto, CreateClassBody, CreateClassResponse, JoinCodeDto } from '@/lib/api/classbot-dto';
import { CreateClassroomForm, createFailureMessage } from '../create-classroom-form';

const JOIN_CODE: JoinCodeDto = {
  id: 'jc_1', code: 'AB3K9M', classId: 'cls_1', createdAt: '2026-09-17T00:00:00.000Z', expiresAt: '2026-09-19T00:00:00.000Z',
};
function classDto(over: Partial<ClassDto>): ClassDto {
  return {
    id: 'cls_1', operatorId: 't1', orgId: null, name: '반', description: null, subject: null, grade: null, isActive: true, isSelfStudy: false,
    bot: null, joinCode: JOIN_CODE, createdAt: '', updatedAt: '', ...over,
  };
}

type Handlers = { onSuccess: (r: CreateClassResponse) => void };
const mutate = jest.fn((body: CreateClassBody, handlers: Handlers) => {
  handlers.onSuccess({ class: classDto({ name: body.name, subject: body.subject ?? null, grade: body.grade ?? null }), joinCode: JOIN_CODE });
});
let error: unknown = null;
jest.mock('@/hooks/api/classroom', () => ({
  useCreateClassroom: () => ({ mutate, isPending: false, isError: error !== null, error }),
}));

beforeEach(() => {
  mutate.mockClear();
  error = null;
});

describe('CreateClassroomForm', () => {
  it('이름이 비어 있으면 못 보낸다 — 과목·학년은 선택이다', () => {
    render(<CreateClassroomForm onCreated={jest.fn()} />);
    expect(screen.getByTestId('create-classroom-submit')).toBeDisabled();
    expect(screen.getByTestId('classroom-grade-select')).toHaveValue('');

    fireEvent.change(screen.getByTestId('classroom-name-input'), { target: { value: '고2 미적분 A반' } });
    expect(screen.getByTestId('create-classroom-submit')).toBeEnabled();
  });

  it('이름만 채우면 { name } 만 보낸다 — 비운 칸을 null 로 지어 보내지 않는다', () => {
    const onCreated = jest.fn();
    render(<CreateClassroomForm onCreated={onCreated} />);
    fireEvent.change(screen.getByTestId('classroom-name-input'), { target: { value: ' 고2 미적분 A반 ' } });
    fireEvent.click(screen.getByTestId('create-classroom-submit'));

    expect(mutate.mock.calls[0][0]).toEqual({ name: '고2 미적분 A반' });
    expect(onCreated).toHaveBeenCalledWith({ classId: 'cls_1', name: '고2 미적분 A반', joinCode: JOIN_CODE });
    // 보낸 뒤 폼은 비워진다 — 다음 반을 바로 만들 수 있게.
    expect(screen.getByTestId('classroom-name-input')).toHaveValue('');
  });

  it('과목·학년을 고르면 함께 보낸다', () => {
    render(<CreateClassroomForm onCreated={jest.fn()} />);
    fireEvent.change(screen.getByTestId('classroom-name-input'), { target: { value: '고1 국어' } });
    fireEvent.change(screen.getByTestId('classroom-subject-input'), { target: { value: '국어' } });
    fireEvent.change(screen.getByTestId('classroom-grade-select'), { target: { value: '고1' } });
    fireEvent.click(screen.getByTestId('create-classroom-submit'));

    expect(mutate.mock.calls[0][0]).toEqual({ name: '고1 국어', subject: '국어', grade: '고1' });
  });

  it('학원·학교 이름은 묻지 않는다 — 정본이 orgId 를 받지 않는다', () => {
    render(<CreateClassroomForm onCreated={jest.fn()} />);
    expect(screen.queryByTestId('classroom-org-input')).toBeNull();
    expect(screen.queryByText(/학원·학교/)).toBeNull();
  });

  it('실패하면 서버가 가른 뜻을 한 줄로', () => {
    error = new ApiError('forbidden', 403);
    render(<CreateClassroomForm onCreated={jest.fn()} />);
    expect(screen.getByTestId('create-classroom-error')).toHaveTextContent('선생님 계정만 반을 만들 수 있어요.');
  });
});

describe('createFailureMessage', () => {
  it.each([
    [400, '반 이름을 다시 확인해 주세요. 100자까지 적을 수 있어요.'],
    [401, '로그인이 필요해요.'],
    [403, '선생님 계정만 반을 만들 수 있어요.'],
    [404, '붙이려던 봇을 찾을 수 없어요.'],
    [500, '반을 만들지 못했어요. 잠시 후 다시 시도해 주세요.'],
  ])('%s → %s', (status, message) => {
    expect(createFailureMessage(new ApiError('x', status))).toBe(message);
  });

  it('ApiError 가 아니면(네트워크) 일반 실패', () => {
    expect(createFailureMessage(new Error('offline'))).toBe('반을 만들지 못했어요. 잠시 후 다시 시도해 주세요.');
  });
});
