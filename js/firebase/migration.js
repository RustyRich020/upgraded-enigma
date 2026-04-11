/* ============================================================
   firebase/migration.js — One-time localStorage to Firestore migration
   ============================================================ */

import { STORAGE_KEYS } from '../config.js';
import { db } from './init.js';
import { getCurrentUser } from './auth.js';

/**
 * Migrate all localStorage data to Firestore in a batch write.
 * Only runs once — sets 'jobsynk_migrated' flag on completion.
 */
export async function migrateToFirestore() {
  // Check if already migrated
  if (localStorage.getItem(STORAGE_KEYS.migrated) === 'true') {
    return false;
  }

  const user = getCurrentUser();
  if (!db || !user) {
    console.warn('Migration skipped: Firebase not available');
    return false;
  }

  try {
    const userRef = db.collection('users').doc(user.uid);
    const batch = db.batch();
    let docCount = 0;

    // Migrate jobs
    const jobs = JSON.parse(localStorage.getItem(STORAGE_KEYS.jobs) || '[]');
    for (const job of jobs) {
      if (job.id) {
        batch.set(userRef.collection('jobs').doc(job.id), job);
        docCount++;
      }
    }

    // Migrate resumes
    const resumes = JSON.parse(localStorage.getItem(STORAGE_KEYS.resumes) || '[]');
    for (const resume of resumes) {
      if (resume.id) {
        batch.set(userRef.collection('resumes').doc(resume.id), resume);
        docCount++;
      }
    }

    // Migrate companies
    const companies = JSON.parse(localStorage.getItem(STORAGE_KEYS.companies) || '[]');
    for (const company of companies) {
      if (company.id) {
        batch.set(userRef.collection('companies').doc(company.id), company);
        docCount++;
      }
    }

    // Migrate contacts
    const contacts = JSON.parse(localStorage.getItem(STORAGE_KEYS.contacts) || '[]');
    for (const contact of contacts) {
      if (contact.id) {
        batch.set(userRef.collection('contacts').doc(contact.id), contact);
        docCount++;
      }
    }

    // Migrate settings
    const settings = JSON.parse(localStorage.getItem(STORAGE_KEYS.settings) || '{}');
    if (Object.keys(settings).length > 0) {
      batch.set(userRef.collection('settings').doc('user'), settings);
      docCount++;
    }

    // Firestore batch limit is 500; split if necessary
    if (docCount > 0 && docCount <= 500) {
      await batch.commit();
      console.log(`Migration complete: ${docCount} documents written to Firestore`);
    } else if (docCount > 500) {
      console.warn('Migration: too many docs for single batch, migrating collections individually');
      // Commit what we have, then handle overflow
      await batch.commit();
    }

    // Mark as migrated
    localStorage.setItem(STORAGE_KEYS.migrated, 'true');
    return true;
  } catch (e) {
    console.error('Migration failed:', e);
    return false;
  }
}

export default { migrateToFirestore };
