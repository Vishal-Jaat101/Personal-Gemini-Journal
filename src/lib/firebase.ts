import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { stripUndefined } from "./sanitizer";
import { JournalEntry, Habit } from "./types";

export const firebaseConfig = {
  apiKey: "AIzaSyC91sxxLetprQO-6CE6w0SDqy8IXMv1ul0",
  authDomain: "personal-gemini-journal-b0379.firebaseapp.com",
  projectId: "personal-gemini-journal-b0379",
  storageBucket: "personal-gemini-journal-b0379.firebasestorage.app",
  messagingSenderId: "118565817749",
  appId: "1:118565817749:web:46f01c2a66e55a0e473a9c",
  measurementId: "G-E2T4DSRHBZ",
};

// Initialize Firebase App instance singleton
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// Authentication Functions
export async function signInUser(email: string, pass: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, email.trim(), pass);
  return credential.user;
}

export async function signUpUser(
  email: string,
  pass: string,
  displayName?: string
): Promise<User> {
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), pass);
  if (displayName && credential.user) {
    try {
      await updateProfile(credential.user, { displayName });
    } catch {
      // Non-blocking profile name update
    }
  }
  return credential.user;
}

export async function signInWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  const credential = await signInWithPopup(auth, provider);
  return credential.user;
}

export async function logOut(): Promise<void> {
  await signOut(auth);
}

export function subscribeToAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Cloud Firestore Persistence strictly scoped to /users/{uid}/journals/{entryId}
 */
export async function saveJournalEntry(
  uid: string,
  entry: JournalEntry
): Promise<{ success: boolean; error?: string }> {
  if (!uid) {
    return { success: false, error: "Authentication required to persist journal entry." };
  }

  try {
    const entryRef = doc(db, "users", uid, "journals", entry.id);
    const cleanPayload = stripUndefined({
      ...entry,
      userId: uid,
      updatedAt: new Date().toISOString(),
    });

    await setDoc(entryRef, cleanPayload, { merge: true });

    // Local mirror backup in localStorage for offline resilience
    try {
      const localBackupKey = `pgj_backup_${uid}`;
      const existingRaw = localStorage.getItem(localBackupKey);
      const existing: JournalEntry[] = existingRaw ? JSON.parse(existingRaw) : [];
      const updated = [entry, ...existing.filter((e) => e.id !== entry.id)];
      localStorage.setItem(localBackupKey, JSON.stringify(updated.slice(0, 50)));
    } catch {
      // Local storage full or private browsing
    }

    return { success: true };
  } catch (err: any) {
    console.error(`[Firestore Save Error for /users/${uid}/journals/${entry.id}]:`, err);
    return {
      success: false,
      error: err?.message || "Failed to save journal entry to Cloud Firestore.",
    };
  }
}

/**
 * Loads all journal entries scoped to the authenticated user's UID
 */
export async function fetchUserJournals(uid: string): Promise<JournalEntry[]> {
  if (!uid) return [];

  try {
    const journalsRef = collection(db, "users", uid, "journals");
    const q = query(journalsRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    const entries: JournalEntry[] = [];
    snapshot.forEach((docSnapshot) => {
      entries.push(docSnapshot.data() as JournalEntry);
    });

    if (entries.length > 0) {
      // Sync local mirror
      try {
        localStorage.setItem(`pgj_backup_${uid}`, JSON.stringify(entries));
      } catch {}
      return entries;
    }
  } catch (err: any) {
    console.warn(`[Firestore Fetch Warning] Could not query remote Firestore (${err?.message}). Checking local cache.`);
  }

  // Fallback to local mirror if remote was unreachable or network restricted
  try {
    const localRaw = localStorage.getItem(`pgj_backup_${uid}`);
    if (localRaw) {
      return JSON.parse(localRaw);
    }
  } catch {}

  return [];
}

/**
 * Deletes a journal entry scoped strictly to /users/{uid}/journals/{entryId}
 */
export async function removeJournalEntry(
  uid: string,
  entryId: string
): Promise<{ success: boolean; error?: string }> {
  if (!uid || !entryId) return { success: false, error: "Invalid parameters." };

  try {
    const entryRef = doc(db, "users", uid, "journals", entryId);
    await deleteDoc(entryRef);

    // Update local mirror
    try {
      const localBackupKey = `pgj_backup_${uid}`;
      const existingRaw = localStorage.getItem(localBackupKey);
      if (existingRaw) {
        const existing: JournalEntry[] = JSON.parse(existingRaw);
        const filtered = existing.filter((e) => e.id !== entryId);
        localStorage.setItem(localBackupKey, JSON.stringify(filtered));
      }
    } catch {}

    return { success: true };
  } catch (err: any) {
    console.error(`[Firestore Delete Error]:`, err);
    return { success: false, error: err?.message || "Failed to delete journal entry." };
  }
}

/**
 * Formats a Date object into YYYY-MM-DD local format
 */
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Calculates current streak for a habit based on completed dates
 */
export function calculateHabitStreak(completedDates: Record<string, boolean> = {}): number {
  const today = new Date();
  let streak = 0;
  
  const todayStr = getLocalDateString(today);
  const todayCompleted = !!completedDates[todayStr];

  const checkDate = new Date();
  if (!todayCompleted) {
    // If today is not marked complete yet, check if yesterday was complete
    checkDate.setDate(checkDate.getDate() - 1);
    const yesterdayStr = getLocalDateString(checkDate);
    if (!completedDates[yesterdayStr]) {
      return 0;
    }
  }

  // Count backwards consecutive completed days
  while (true) {
    const dateStr = getLocalDateString(checkDate);
    if (completedDates[dateStr]) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Saves or updates a Habit document in Cloud Firestore under /users/{uid}/habits/{habitId}
 */
export async function saveHabit(
  uid: string,
  habit: Habit
): Promise<{ success: boolean; error?: string }> {
  if (!uid) {
    return { success: false, error: "Authentication required to persist habit." };
  }

  try {
    const habitRef = doc(db, "users", uid, "habits", habit.id);
    const streak = calculateHabitStreak(habit.completedDates || {});
    const cleanPayload = stripUndefined({
      ...habit,
      userId: uid,
      streak,
      updatedAt: new Date().toISOString(),
    });

    await setDoc(habitRef, cleanPayload, { merge: true });

    // Sync local mirror
    try {
      const localBackupKey = `pgj_habits_backup_${uid}`;
      const existingRaw = localStorage.getItem(localBackupKey);
      const existing: Habit[] = existingRaw ? JSON.parse(existingRaw) : [];
      const updated = [{ ...habit, streak }, ...existing.filter((h) => h.id !== habit.id)];
      localStorage.setItem(localBackupKey, JSON.stringify(updated));
    } catch {}

    return { success: true };
  } catch (err: any) {
    console.error(`[Firestore Habit Save Error for /users/${uid}/habits/${habit.id}]:`, err);
    return {
      success: false,
      error: err?.message || "Failed to save habit to Cloud Firestore.",
    };
  }
}

/**
 * Fetches all user habits scoped strictly to /users/{uid}/habits
 */
export async function fetchUserHabits(uid: string): Promise<Habit[]> {
  if (!uid) return [];

  try {
    const habitsRef = collection(db, "users", uid, "habits");
    const q = query(habitsRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    const habits: Habit[] = [];
    snapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data() as Habit;
      data.streak = calculateHabitStreak(data.completedDates || {});
      habits.push(data);
    });

    if (habits.length > 0) {
      try {
        localStorage.setItem(`pgj_habits_backup_${uid}`, JSON.stringify(habits));
      } catch {}
      return habits;
    }
  } catch (err: any) {
    console.warn(`[Firestore Habit Fetch Warning]: ${err?.message}. Checking local mirror.`);
  }

  // Fallback to local mirror
  try {
    const localRaw = localStorage.getItem(`pgj_habits_backup_${uid}`);
    if (localRaw) {
      const habits: Habit[] = JSON.parse(localRaw);
      return habits.map((h) => ({
        ...h,
        streak: calculateHabitStreak(h.completedDates || {}),
      }));
    }
  } catch {}

  return [];
}

/**
 * Toggles habit completion for a specific date in /users/{uid}/habits/{habitId}
 */
export async function toggleHabitDay(
  uid: string,
  habit: Habit,
  dateStr: string
): Promise<{ success: boolean; updatedHabit?: Habit; error?: string }> {
  if (!uid || !habit) return { success: false, error: "Invalid parameters" };

  const currentStatus = !!habit.completedDates?.[dateStr];
  const updatedCompletedDates = {
    ...(habit.completedDates || {}),
    [dateStr]: !currentStatus,
  };

  // If set to false, we can delete the key or keep it false
  if (currentStatus) {
    delete updatedCompletedDates[dateStr];
  }

  const newStreak = calculateHabitStreak(updatedCompletedDates);
  const updatedHabit: Habit = {
    ...habit,
    completedDates: updatedCompletedDates,
    streak: newStreak,
    updatedAt: new Date().toISOString(),
  };

  const saveRes = await saveHabit(uid, updatedHabit);
  if (saveRes.success) {
    return { success: true, updatedHabit };
  } else {
    return { success: false, error: saveRes.error };
  }
}

/**
 * Deletes a habit from /users/{uid}/habits/{habitId}
 */
export async function removeHabit(
  uid: string,
  habitId: string
): Promise<{ success: boolean; error?: string }> {
  if (!uid || !habitId) return { success: false, error: "Invalid parameters." };

  try {
    const habitRef = doc(db, "users", uid, "habits", habitId);
    await deleteDoc(habitRef);

    // Update local mirror
    try {
      const localBackupKey = `pgj_habits_backup_${uid}`;
      const existingRaw = localStorage.getItem(localBackupKey);
      if (existingRaw) {
        const existing: Habit[] = JSON.parse(existingRaw);
        const filtered = existing.filter((h) => h.id !== habitId);
        localStorage.setItem(localBackupKey, JSON.stringify(filtered));
      }
    } catch {}

    return { success: true };
  } catch (err: any) {
    console.error(`[Firestore Habit Delete Error]:`, err);
    return { success: false, error: err?.message || "Failed to delete habit." };
  }
}
