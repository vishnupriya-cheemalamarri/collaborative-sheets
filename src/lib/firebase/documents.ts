import {
  ref, push, set, get, query,
  orderByChild, equalTo, update, remove,
} from 'firebase/database';
import { database } from './config';
import type {
  SpreadsheetDocument,
  DeletedDocument,
  DocumentCreateInput,
} from '@/types/document';

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createDocument(
  input: DocumentCreateInput,
  userId: string,
  userName: string
): Promise<SpreadsheetDocument> {
  const documentsRef = ref(database, 'documents');
  const newDocRef    = push(documentsRef);

  if (!newDocRef.key) throw new Error('Failed to generate document ID');

  const now: number = Date.now();
  const document: SpreadsheetDocument = {
    id:        newDocRef.key,
    title:     input.title,
    ownerId:   userId,
    ownerName: userName,
    createdAt: now,
    updatedAt: now,
    members: {
      [userId]: 'owner',
    },
  };

  await set(newDocRef, document);
  return document;
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getDocuments(userId: string): Promise<SpreadsheetDocument[]> {
  const ownedSnap = await get(
    query(
      ref(database, 'documents'),
      orderByChild('ownerId'),
      equalTo(userId)
    )
  );

  const docsMap = new Map<string, SpreadsheetDocument>();

  if (ownedSnap.exists()) {
    ownedSnap.forEach((child) => {
      const doc = child.val() as SpreadsheetDocument;
      docsMap.set(doc.id, doc);
    });
  }

  return Array.from(docsMap.values()).sort((a, b) => b.updatedAt - a.updatedAt);
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateDocumentTitle(
  docId: string,
  title: string
): Promise<void> {
  await update(ref(database, `documents/${docId}`), {
    title,
    updatedAt: Date.now(),
  });
}

export async function addMember(
  docId: string,
  userId: string,
  role: 'editor' | 'viewer'
): Promise<void> {
  await update(ref(database, `documents/${docId}`), {
    [`members/${userId}`]: role,
    updatedAt: Date.now(),
  });
}

export async function removeMember(
  docId: string,
  userId: string
): Promise<void> {
  await update(ref(database, `documents/${docId}`), {
    [`members/${userId}`]: null,
    updatedAt: Date.now(),
  });
}

// ─── Delete / Restore ─────────────────────────────────────────────────────────

export async function deleteDocument(
  docId: string,
  userId: string
): Promise<void> {
  const docRef     = ref(database, `documents/${docId}`);
  const deletedRef = ref(database, `deleted_documents/${docId}`);

  const snap = await get(docRef);
  if (!snap.exists()) throw new Error('Document not found');

  const doc = snap.val() as SpreadsheetDocument;

  const deletedDoc: DeletedDocument = {
    ...doc,
    deletedBy: userId,
    deletedAt: Date.now(),
  };

  // Write to deleted_documents first, verify, then remove from active
  await set(deletedRef, deletedDoc);

  const verifySnap = await get(deletedRef);
  if (!verifySnap.exists()) {
    throw new Error('Failed to write to deleted_documents — aborting delete');
  }

  await remove(docRef);
}

export async function restoreDocument(
  docId: string
): Promise<void> {
  const deletedRef = ref(database, `deleted_documents/${docId}`);
  const docRef     = ref(database, `documents/${docId}`);

  const snap = await get(deletedRef);

  if (!snap.exists()) {
    // Fallback: already back in documents (e.g. double-restore)
    const activeSnap = await get(docRef);
    if (activeSnap.exists()) return;
    throw new Error('Deleted document not found');
  }

  const deletedDoc = snap.val() as DeletedDocument;
  const restoredDoc: SpreadsheetDocument = { ...deletedDoc };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (restoredDoc as any).deletedBy;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (restoredDoc as any).deletedAt;

  await set(docRef, { ...restoredDoc, updatedAt: Date.now() });
  await remove(deletedRef);
}

export async function getDeletedDocuments(
  userId: string
): Promise<DeletedDocument[]> {
  const snap = await get(
    query(
      ref(database, 'deleted_documents'),
      orderByChild('ownerId'),
      equalTo(userId)
    )
  );

  if (!snap.exists()) return [];

  const docs: DeletedDocument[] = [];
  snap.forEach((child) => {
    docs.push(child.val() as DeletedDocument);
  });

  return docs.sort((a, b) => b.deletedAt - a.deletedAt);
}