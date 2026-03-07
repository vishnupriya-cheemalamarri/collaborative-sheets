export interface SpreadsheetDocument {
  id: string;
  title: string;
  ownerId: string;
  ownerName: string;
  createdAt: number;
  updatedAt: number;
  members?: Record<string, 'owner' | 'editor' | 'viewer'>;
}

// Separate type for deleted documents — keeps the main type clean
export interface DeletedDocument extends SpreadsheetDocument {
  deletedBy: string;
  deletedAt: number;
}

export type DocumentCreateInput = Pick<SpreadsheetDocument, 'title'>;