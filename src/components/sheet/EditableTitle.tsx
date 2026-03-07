'use client';
import { logger } from '@/lib/utils/logger';
import { useState, useRef, useEffect } from 'react';
import { updateDocumentTitle } from '@/lib/firebase/documents';
import { cn } from '@/lib/utils/cn';

interface EditableTitleProps {
  docId: string;
  initialTitle: string;
}

export function EditableTitle({ docId, initialTitle }: EditableTitleProps) {
  const [title, setTitle] = useState(initialTitle);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitle(initialTitle);
  }, [initialTitle]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  async function handleCommit() {
    setIsEditing(false);
    const trimmed = title.trim();
    if (!trimmed || trimmed === initialTitle) {
      setTitle(initialTitle);
      return;
    }
    setSaving(true);
    try {
      await updateDocumentTitle(docId, trimmed);
    } catch (err) {
      logger.error('Failed to update title', err);
      setTitle(initialTitle);
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleCommit();
    if (e.key === 'Escape') {
      setTitle(initialTitle);
      setIsEditing(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {isEditing ? (
        <input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleCommit}
          onKeyDown={handleKeyDown}
          className="rounded-md border border-blue-400 bg-white px-2 py-0.5 text-sm font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-blue-100 w-48"
        />
      ) : (
        <button
          onClick={() => setIsEditing(true)}
          className={cn(
            'rounded-md px-2 py-0.5 text-sm font-semibold text-gray-900 transition hover:bg-gray-100 max-w-48 truncate',
            saving && 'opacity-50'
          )}
          title="Click to rename"
        >
          {title}
        </button>
      )}
    </div>
  );
}