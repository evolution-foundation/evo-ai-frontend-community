import { getFormattingLocale } from '@/lib/formattingLocale';
import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Button,
  Card,
  CardContent,
  Textarea,
  Skeleton,
} from '@evoapi/design-system';
import { Pencil, StickyNote, Trash, X, Check } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { usePermissions } from '@/contexts/PermissionsContext';
import { contactsService } from '@/services/contacts';
import type { ContactNote } from '@/types/contacts';

interface ContactNotesCardProps {
  contactId: string;
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString(getFormattingLocale(), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ContactNotesCard({ contactId }: ContactNotesCardProps) {
  const { t } = useLanguage('contacts');
  const { can, isReady } = usePermissions();
  const canUpdate = isReady && can('contacts', 'update');
  const canDelete = isReady && can('contacts', 'delete');

  const [notes, setNotes] = useState<ContactNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [savingEditId, setSavingEditId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const response = await contactsService.getContactNotes(contactId);
      const list = [...(response.data ?? [])].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      setNotes(list);
    } catch (error) {
      console.error('Error loading contact notes:', error);
      toast.error(t('notes.messages.loadError'));
    } finally {
      setLoading(false);
    }
  }, [contactId, t]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const handleAddNote = async () => {
    const content = newNote.trim();
    if (!content) return;

    setSubmitting(true);
    try {
      const created = await contactsService.createContactNote(contactId, content);
      setNotes(prev => [created, ...prev]);
      setNewNote('');
      toast.success(t('notes.messages.createSuccess'));
    } catch (error) {
      console.error('Error creating contact note:', error);
      toast.error(t('notes.messages.createError'));
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (note: ContactNote) => {
    setEditingId(note.id);
    setEditingContent(note.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingContent('');
  };

  const handleSaveEdit = async (noteId: string) => {
    const content = editingContent.trim();
    if (!content) return;

    setSavingEditId(noteId);
    try {
      const updated = await contactsService.updateContactNote(contactId, noteId, content);
      setNotes(prev => prev.map(n => (n.id === noteId ? updated : n)));
      toast.success(t('notes.messages.updateSuccess'));
      cancelEdit();
    } catch (error) {
      console.error('Error updating contact note:', error);
      toast.error(t('notes.messages.updateError'));
    } finally {
      setSavingEditId(null);
    }
  };

  const handleDelete = async (noteId: string) => {
    setDeletingId(noteId);
    try {
      await contactsService.deleteContactNote(contactId, noteId);
      setNotes(prev => prev.filter(n => n.id !== noteId));
      toast.success(t('notes.messages.deleteSuccess'));
    } catch (error) {
      console.error('Error deleting contact note:', error);
      toast.error(t('notes.messages.deleteError'));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card>
      <CardContent className="p-5">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-primary" />
          {t('notes.title')}
        </h3>

        {canUpdate && (
          <div className="flex flex-col gap-2 mb-4">
            <Textarea
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              placeholder={t('notes.addPlaceholder')}
              rows={3}
              disabled={submitting}
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={handleAddNote}
                disabled={submitting || !newNote.trim()}
              >
                {submitting ? t('notes.actions.adding') : t('notes.actions.add')}
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-6">
            {t('notes.empty')}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {notes.map(note => (
              <div key={note.id} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="text-xs text-muted-foreground truncate">
                    <span className="font-medium text-foreground">{note.user?.name}</span>
                    {' · '}
                    {formatDateTime(note.created_at)}
                  </div>
                  {editingId !== note.id && (canUpdate || canDelete) && (
                    <div className="flex items-center gap-1 shrink-0">
                      {canUpdate && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => startEdit(note)}
                          aria-label={t('notes.actions.edit')}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(note.id)}
                          disabled={deletingId === note.id}
                          aria-label={t('notes.actions.delete')}
                        >
                          <Trash className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {editingId === note.id ? (
                  <div className="flex flex-col gap-2">
                    <Textarea
                      value={editingContent}
                      onChange={e => setEditingContent(e.target.value)}
                      rows={3}
                      disabled={savingEditId === note.id}
                    />
                    <div className="flex items-center justify-end gap-1.5">
                      <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={savingEditId === note.id}>
                        <X className="h-3.5 w-3.5 mr-1" />
                        {t('notes.actions.cancel')}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSaveEdit(note.id)}
                        disabled={savingEditId === note.id || !editingContent.trim()}
                      >
                        <Check className="h-3.5 w-3.5 mr-1" />
                        {t('notes.actions.save')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap break-words">{note.content}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
