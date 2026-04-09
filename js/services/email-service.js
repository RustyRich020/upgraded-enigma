/* ============================================================
   services/email-service.js — EmailJS integration
   ============================================================ */

/**
 * Send an email via EmailJS (loaded from CDN as window.emailjs).
 * @param {string} serviceId — EmailJS service ID
 * @param {string} templateId — EmailJS template ID
 * @param {object} params — template parameters (to_email, to_name, subject, message, etc.)
 * @param {string} publicKey — EmailJS public key
 * @returns {object} EmailJS send response
 */
export async function sendEmail(serviceId, templateId, params, publicKey) {
  const emailjs = window.emailjs;
  if (!emailjs) throw new Error('EmailJS SDK not loaded');
  if (!serviceId || !templateId || !publicKey) {
    throw new Error('EmailJS configuration incomplete — set all keys in Settings');
  }

  emailjs.init(publicKey);
  const result = await emailjs.send(serviceId, templateId, params);
  return result;
}

export default { sendEmail };
