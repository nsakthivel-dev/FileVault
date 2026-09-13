// Firebase has been deprecated and removed in favor of Supabase (Auth + Storage + Database)
export function initFirebase() {
  return { db: null, bucket: null };
}

export const firebaseAdmin: any = null;

