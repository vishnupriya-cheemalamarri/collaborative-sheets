export interface PresenceUser {
  uid: string;
  displayName: string;
  color: string;
  lastSeen: number;
  activeCellId: string | null;
}

export type PresenceMap = Record<string, PresenceUser>;