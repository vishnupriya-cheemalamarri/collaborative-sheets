export interface AppUser {
  uid: string;
  displayName: string;
  email: string | null;
  photoURL: string | null;
  color: string;
  isAnonymous: boolean;
}