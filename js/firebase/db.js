/* ============================================================
   firebase/db.js — Firestore CRUD scoped to authenticated user
   All document paths: users/{uid}/{collection}/{docId}
   ============================================================ */

import { db } from './init.js';
import { getCurrentUser } from './auth.js';

/**
 * Get the user-scoped collection reference.
 */
function userCollection(collectionName) {
  const user = getCurrentUser();
  if (!db || !user) return null;
  return db.collection('users').doc(user.uid).collection(collectionName);
}

/**
 * Get all documents from a user-scoped collection.
 * Returns an array of objects with { id, ...data }.
 */
export async function getAllDocs(collectionName) {
  const ref = userCollection(collectionName);
  if (!ref) return [];
  try {
    const snapshot = await ref.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (e) {
    console.warn(`getAllDocs(${collectionName}) failed:`, e);
    return [];
  }
}

/**
 * Get a specific collection reference (for advanced queries).
 */
export function getCollection(collectionName) {
  return userCollection(collectionName);
}

/**
 * Set a document (create or overwrite) in a user-scoped collection.
 */
export async function setDoc(collectionName, id, data) {
  const ref = userCollection(collectionName);
  if (!ref) return false;
  try {
    await ref.doc(id).set(data, { merge: false });
    return true;
  } catch (e) {
    console.warn(`setDoc(${collectionName}, ${id}) failed:`, e);
    return false;
  }
}

/**
 * Update (merge) fields on an existing document.
 */
export async function updateDoc(collectionName, id, patch) {
  const ref = userCollection(collectionName);
  if (!ref) return false;
  try {
    await ref.doc(id).update(patch);
    return true;
  } catch (e) {
    console.warn(`updateDoc(${collectionName}, ${id}) failed:`, e);
    return false;
  }
}

/**
 * Delete a document from a user-scoped collection.
 */
export async function deleteDoc(collectionName, id) {
  const ref = userCollection(collectionName);
  if (!ref) return false;
  try {
    await ref.doc(id).delete();
    return true;
  } catch (e) {
    console.warn(`deleteDoc(${collectionName}, ${id}) failed:`, e);
    return false;
  }
}

export default { getCollection, setDoc, updateDoc, deleteDoc, getAllDocs };
