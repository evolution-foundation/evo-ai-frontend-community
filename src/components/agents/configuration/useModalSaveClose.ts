import { useEffect, useRef } from 'react';

interface UseModalSaveCloseOptions<T> {
  open: boolean;
  value: T;
  onChange: (value: T) => void;
  onOpenChange: (open: boolean) => void;
  onSave?: () => Promise<boolean> | boolean | void;
  isSaving?: boolean;
}

// Save/close contract of the agent-config modals (CRM-213). They edit parent
// state live via onChange, so closing without saving restores the value captured
// at open; Save persists via the agent's save and closes unless it resolves false.
export function useModalSaveClose<T>({
  open,
  value,
  onChange,
  onOpenChange,
  onSave,
  isSaving = false,
}: UseModalSaveCloseOptions<T>) {
  const valueRef = useRef(value);
  valueRef.current = value;
  const snapshotRef = useRef(value);

  useEffect(() => {
    if (open) snapshotRef.current = valueRef.current;
  }, [open]);

  // Cancel path: ignored while saving; discards edits (sections update
  // immutably, so reference inequality means something changed).
  const handleOpenChange = (next: boolean) => {
    if (next) {
      onOpenChange(true);
      return;
    }
    if (isSaving) return;
    if (valueRef.current !== snapshotRef.current) onChange(snapshotRef.current);
    onOpenChange(false);
  };

  const handleSave = async () => {
    if (!onSave) {
      onOpenChange(false);
      return;
    }
    const result = await onSave();
    if (result !== false) onOpenChange(false);
  };

  return { handleOpenChange, handleSave };
}
