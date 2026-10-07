import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterAll, describe, expect, it, vi } from 'vitest';
import type { PipelineTask } from '@/types/analytics';
import CreateTaskModal from './CreateTaskModal';
import EditTaskModal from './EditTaskModal';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    currentLanguage: 'pt-BR',
  }),
}));

const originalTZ = process.env.TZ;
process.env.TZ = 'America/Sao_Paulo';

afterAll(() => {
  process.env.TZ = originalTZ;
});

const dueDate = '2099-03-10T11:40:00.000Z';

const buildTask = (): PipelineTask => ({
  id: 'task-1',
  pipeline_item_id: 'item-1',
  created_by_id: 'user-1',
  title: 'Ligar',
  description: '',
  due_date: dueDate,
  task_type: 'call',
  status: 'pending',
  priority: 'medium',
  created_at: '2099-03-01T10:00:00.000Z',
  updated_at: '2099-03-01T10:00:00.000Z',
});

const submitForm = () => {
  fireEvent.submit(document.querySelector('form')!);
};

describe('task modals — due date in local time', () => {
  it('runs in a timezone other than UTC', () => {
    expect(new Date(dueDate).getTimezoneOffset()).toBe(180);
  });

  it('creates the task with the typed local time as an ISO instant', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<CreateTaskModal open onOpenChange={vi.fn()} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/tasks\.form\.title/), { target: { value: 'Ligar' } });
    fireEvent.change(screen.getByLabelText('tasks.form.dueDate'), { target: { value: '2099-03-10T08:40' } });
    submitForm();

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ due_date: dueDate }));
    });
  });

  it('fills the edit field with the local time of due_date', () => {
    render(<EditTaskModal open onOpenChange={vi.fn()} task={buildTask()} onSubmit={vi.fn()} />);
    expect(screen.getByLabelText('tasks.form.dueDate')).toHaveValue('2099-03-10T08:40');
  });

  it('does not send due_date when the task is saved without touching it', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<EditTaskModal open onOpenChange={vi.fn()} task={buildTask()} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/tasks\.form\.title/), { target: { value: 'Ligar de novo' } });
    submitForm();

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][1]).not.toHaveProperty('due_date');
  });

  it('saves the edited time typed by the user', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<EditTaskModal open onOpenChange={vi.fn()} task={buildTask()} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('tasks.form.dueDate'), { target: { value: '2099-03-10T09:15' } });
    submitForm();

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        'task-1',
        expect.objectContaining({ due_date: '2099-03-10T12:15:00.000Z' }),
      );
    });
  });
});
