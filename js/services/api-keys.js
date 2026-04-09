/* ============================================================
   services/api-keys.js — API key management via localStorage
   ============================================================ */

import { STORAGE_KEYS } from '../config.js';

let keys = {};

/**
 * Get a specific API key value.
 */
export function getApi(key) {
  return keys[key] || '';
}

/**
 * Check if a specific API key is set and non-empty.
 */
export function hasApi(key) {
  return !!keys[key];
}

/**
 * Save all API keys from an object.
 */
export function saveAllKeys(obj) {
  keys = { ...obj };
  localStorage.setItem(STORAGE_KEYS.apiKeys, JSON.stringify(keys));
}

/**
 * Load API keys from localStorage.
 */
export function loadKeys() {
  try {
    keys = JSON.parse(localStorage.getItem(STORAGE_KEYS.apiKeys) || '{}');
  } catch {
    keys = {};
  }
  return keys;
}

/**
 * Clear all stored API keys.
 */
export function clearKeys() {
  keys = {};
  localStorage.removeItem(STORAGE_KEYS.apiKeys);
}

/**
 * Get the full keys object (read-only copy).
 */
export function getAllKeys() {
  return { ...keys };
}

export default { getApi, hasApi, saveAllKeys, loadKeys, clearKeys, getAllKeys };
