import {
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
  signInAnonymously,
  updateProfile,
  type User,
} from 'firebase/auth';
import { auth } from './config';

const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signInAsGuest(displayName: string): Promise<User> {
  const result = await signInAnonymously(auth);
  await updateProfile(result.user, { displayName });
  return result.user;
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}