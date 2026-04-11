/**
 * JobGrid Pro — Firebase Cloud Functions
 *
 * 1. API Proxy: Hides all API keys server-side
 * 2. Scheduled Agent: Runs job searches even when browser is closed
 * 3. Firestore Triggers: Auto-enrich resumes and jobs on write
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require("node-fetch");

admin.initializeApp();
const db = admin.firestore();

// ============================================================
// CONFIG — API keys from Firebase environment config
// Set via: firebase functions:config:set adzuna.id="xxx" adzuna.key="xxx" etc.
// Or use .env file with Firebase Functions v2
// ============================================================
const CONFIG = {
  adzuna: { id: process.env.ADZUNA_ID || "", key: process.env.ADZUNA_KEY || "" },
  jsearch: { key: process.env.JSEARCH_KEY || "" },
  gemini: { key: process.env.GEMINI_KEY || "" },
  groq: { key: process.env.GROQ_KEY || "" },
  abstract: { key: process.env.ABSTRACT_KEY || "" },
  hunter: { key: process.env.HUNTER_KEY || "" },
  emailjs: { public: process.env.EMAILJS_PUBLIC || "", service: process.env.EMAILJS_SERVICE || "", template: process.env.EMAILJS_TEMPLATE || "" },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || "",
    authToken: process.env.TWILIO_AUTH_TOKEN || "",
    fromNumber: process.env.TWILIO_FROM_NUMBER || "",
  },
};

// ============================================================
// 1. API PROXY — Callable function for all external API calls
// ============================================================
exports.apiProxy = functions.https.onCall(async (data, context) => {
  // Require authentication
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be signed in");
  }

  const { action, params } = data;
  const uid = context.auth.uid;

  try {
    // Load user's API keys from Firestore (per-user keys override defaults)
    const userKeysDoc = await db.collection("users").doc(uid).collection("config").doc("apiKeys").get();
    const userKeys = userKeysDoc.exists ? userKeysDoc.data() : {};

    // Merge: user keys take priority, fallback to server env keys
    const keys = {
      adzunaId: userKeys.adzunaId || CONFIG.adzuna.id,
      adzunaKey: userKeys.adzunaKey || CONFIG.adzuna.key,
      jsearchKey: userKeys.jsearchKey || CONFIG.jsearch.key,
      geminiKey: userKeys.geminiKey || CONFIG.gemini.key,
      groqKey: userKeys.groqKey || CONFIG.groq.key,
      abstractKey: userKeys.abstractKey || CONFIG.abstract.key,
      hunterKey: userKeys.hunterKey || CONFIG.hunter.key,
    };

    switch (action) {
      case "search-remotive":
        return await searchRemotive(params.query);

      case "search-arbeitnow":
        return await searchArbeitnow(params.query);

      case "search-adzuna":
        if (!keys.adzunaId || !keys.adzunaKey) throw new functions.https.HttpsError("failed-precondition", "Adzuna keys not configured");
        return await searchAdzuna(params.query, params.location || "us", keys.adzunaId, keys.adzunaKey);

      case "search-jsearch":
        if (!keys.jsearchKey) throw new functions.https.HttpsError("failed-precondition", "JSearch key not configured");
        return await searchJSearch(params.query, keys.jsearchKey);

      case "ai-gemini":
        if (!keys.geminiKey) throw new functions.https.HttpsError("failed-precondition", "Gemini key not configured");
        return await callGemini(params.prompt, keys.geminiKey);

      case "ai-groq":
        if (!keys.groqKey) throw new functions.https.HttpsError("failed-precondition", "Groq key not configured");
        return await callGroq(params.prompt, keys.groqKey);

      case "enrich-company":
        if (!keys.abstractKey) throw new functions.https.HttpsError("failed-precondition", "Abstract key not configured");
        return await enrichCompany(params.domain, keys.abstractKey);

      case "verify-email":
        if (!keys.hunterKey) throw new functions.https.HttpsError("failed-precondition", "Hunter key not configured");
        return await verifyEmail(params.email, keys.hunterKey);

      case "send-sms":
        return await sendTwilioSMS(params.to, params.message, uid);

      case "send-notification":
        return await sendAllNotifications(params.message, params.channels, uid);

      default:
        throw new functions.https.HttpsError("invalid-argument", `Unknown action: ${action}`);
    }
  } catch (err) {
    if (err instanceof functions.https.HttpsError) throw err;
    console.error(`apiProxy error (${action}):`, err);
    throw new functions.https.HttpsError("internal", err.message);
  }
});

// ============================================================
// 2. SCHEDULED AGENT — Runs every 6 hours for all enabled users
// ============================================================
exports.scheduledAgent = functions.pubsub
  .schedule("every 6 hours")
  .timeZone("America/New_York")
  .onRun(async () => {
    console.log("Starting scheduled agent run...");

    // Find all users with agent enabled
    const usersSnap = await db.collection("users").get();
    let processed = 0;
    let skipped = 0;

    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data();
      const uid = userDoc.id;

      // Check if agent is enabled (from agentConfig in Firestore or local)
      const agentConfigDoc = await db.collection("users").doc(uid).collection("config").doc("agentConfig").get();
      const agentConfig = agentConfigDoc.exists ? agentConfigDoc.data() : null;

      if (!agentConfig || !agentConfig.enabled) {
        skipped++;
        continue;
      }

      try {
        await runAgentForUser(uid, userData, agentConfig);
        processed++;
      } catch (err) {
        console.error(`Agent failed for user ${uid}:`, err);
      }
    }

    console.log(`Scheduled agent complete: ${processed} processed, ${skipped} skipped`);
    return null;
  });

/**
 * Run the job agent pipeline for a single user.
 */
async function runAgentForUser(uid, userData, agentConfig) {
  const startTime = Date.now();
  const userRef = db.collection("users").doc(uid);

  // 1. Get user's resumes for skill extraction
  const resumesSnap = await userRef.collection("resumes").get();
  const resumes = resumesSnap.docs
    .filter(d => d.id !== "_meta")
    .map(d => d.data());

  if (resumes.length === 0) return;

  // 2. Extract skills from resumes
  const skills = new Set();
  const SKILL_RE = /\b(python|javascript|typescript|react|angular|vue|node\.?js|sql|nosql|mongodb|postgresql|aws|azure|gcp|docker|kubernetes|git|machine learning|deep learning|nlp|tensorflow|pytorch|pandas|numpy|tableau|power bi|excel|agile|java|c\+\+|c#|\.net|ruby|go|rust|swift|kotlin|html|css|graphql|rest|api|linux|terraform|spark|hadoop|kafka|redis|elasticsearch|devops|data analysis|data science)\b/gi;

  for (const r of resumes) {
    if (r.skills) r.skills.forEach(s => skills.add(s.toLowerCase()));
    if (r.text) {
      const matches = r.text.match(SKILL_RE) || [];
      matches.forEach(m => skills.add(m.toLowerCase()));
    }
  }

  if (skills.size === 0) return;
  const skillList = [...skills];

  // 3. Generate search queries (heuristic — AI optional)
  const queries = [];
  if (skillList.length >= 2) queries.push(`${skillList[0]} ${skillList[1]} developer`);
  if (skillList.length >= 3) queries.push(`${skillList[2]} engineer remote`);
  queries.push(`${skillList[0]} analyst`);
  if (skillList.length >= 4) queries.push(`${skillList[3]} ${skillList[0]} jobs`);

  // 4. Get user's API keys
  const keysDoc = await userRef.collection("config").doc("apiKeys").get();
  const userKeys = keysDoc.exists ? keysDoc.data() : {};
  const keys = {
    adzunaId: userKeys.adzunaId || CONFIG.adzuna.id,
    adzunaKey: userKeys.adzunaKey || CONFIG.adzuna.key,
    jsearchKey: userKeys.jsearchKey || CONFIG.jsearch.key,
  };

  // 5. Search across APIs (free APIs always, keyed if available)
  let allResults = [];
  for (const q of queries.slice(0, 2)) {
    try {
      const remotiveJobs = await searchRemotive(q);
      allResults = allResults.concat(remotiveJobs);
    } catch (e) { console.warn("Remotive failed:", e.message); }

    try {
      const arbeitnowJobs = await searchArbeitnow(q);
      allResults = allResults.concat(arbeitnowJobs);
    } catch (e) { console.warn("Arbeitnow failed:", e.message); }
  }

  // Keyed APIs (1 query each to conserve limits)
  if (keys.adzunaId && keys.adzunaKey) {
    try {
      const adzunaJobs = await searchAdzuna(queries[0], "us", keys.adzunaId, keys.adzunaKey);
      allResults = allResults.concat(adzunaJobs);
    } catch (e) { console.warn("Adzuna failed:", e.message); }
  }

  if (keys.jsearchKey) {
    try {
      const jsearchJobs = await searchJSearch(queries[0], keys.jsearchKey);
      allResults = allResults.concat(jsearchJobs);
    } catch (e) { console.warn("JSearch failed:", e.message); }
  }

  // 6. Deduplicate against existing jobs
  const existingJobsSnap = await userRef.collection("jobs").get();
  const existingJobs = existingJobsSnap.docs.filter(d => d.id !== "_meta").map(d => d.data());

  const seen = new Set();
  existingJobs.forEach(j => {
    if (j.url) seen.add(normalizeUrl(j.url));
    seen.add(`${(j.title || "").toLowerCase().trim()}|${(j.company || "").toLowerCase().trim()}`);
  });

  const unique = [];
  const duplicates = [];
  for (const job of allResults) {
    const urlKey = job.url ? normalizeUrl(job.url) : null;
    const titleKey = `${(job.title || "").toLowerCase().trim()}|${(job.company || "").toLowerCase().trim()}`;

    if ((urlKey && seen.has(urlKey)) || seen.has(titleKey)) {
      duplicates.push(job);
      continue;
    }

    seen.add(titleKey);
    if (urlKey) seen.add(urlKey);
    unique.push(job);
  }

  // 7. Score relevance
  const scored = [];
  for (const job of unique) {
    const jobText = `${job.title} ${job.description || ""} ${job.tags || ""}`.toLowerCase();
    const matched = skillList.filter(s => jobText.includes(s));
    const score = Math.min(100, Math.round((matched.length / Math.max(skillList.length, 1)) * 60) + (matched.length > 0 ? 20 : 0) + (isRecent(job.date) ? 10 : 0));

    if (score >= (agentConfig.minRelevanceScore || 60)) {
      scored.push({ ...job, relevanceScore: score, matchedSkills: matched, _agentAdded: true, status: "Saved" });
    }
  }

  // 8. Add high-scoring jobs to Firestore (or pending queue)
  const batch = db.batch();
  const added = [];

  if (agentConfig.autoAdd) {
    for (const job of scored.slice(0, 10)) {
      const ref = userRef.collection("jobs").doc();
      batch.set(ref, {
        ...job,
        id: ref.id,
        _added: new Date().toISOString().slice(0, 10),
        follow: futureDate(3),
        _agentAdded: true,
      });
      added.push(job.title);
    }
  }

  // 9. Log the run
  const runLog = {
    timestamp: new Date().toISOString(),
    queries,
    results: {
      total: allResults.length,
      unique: unique.length,
      duplicates: duplicates.length,
      scored: scored.length,
      added: added.length,
    },
    sources: {
      remotive: allResults.filter(j => j.source === "Remotive").length,
      arbeitnow: allResults.filter(j => j.source === "Arbeitnow").length,
      adzuna: allResults.filter(j => j.source === "Adzuna").length,
      jsearch: allResults.filter(j => j.source === "JSearch").length,
    },
    duration: Date.now() - startTime,
    serverSide: true,
  };

  const runRef = userRef.collection("agentRuns").doc();
  batch.set(runRef, runLog);

  // Update agent config with last run time
  const configRef = userRef.collection("config").doc("agentConfig");
  batch.set(configRef, {
    ...agentConfig,
    lastRun: new Date().toISOString(),
    pendingJobs: agentConfig.autoAdd ? (agentConfig.pendingJobs || []) : [...(agentConfig.pendingJobs || []), ...scored.slice(0, 20)],
  }, { merge: true });

  await batch.commit();
  console.log(`Agent for ${uid}: found ${allResults.length}, deduped ${duplicates.length}, scored ${scored.length}, added ${added.length}`);
}

// ============================================================
// 3. FIRESTORE TRIGGERS — Auto-enrich on write
// ============================================================

/**
 * When a resume is created or updated, auto-extract skills.
 */
exports.onResumeWrite = functions.firestore
  .document("users/{uid}/resumes/{resumeId}")
  .onWrite(async (change, context) => {
    if (!change.after.exists) return; // Deleted
    const data = change.after.data();
    if (context.params.resumeId === "_meta") return;
    if (data._enriched) return; // Already processed

    const text = data.text || "";
    if (!text) return;

    const SKILL_RE = /\b(python|javascript|typescript|react|angular|vue|node\.?js|sql|nosql|mongodb|postgresql|aws|azure|gcp|docker|kubernetes|git|machine learning|deep learning|nlp|tensorflow|pytorch|pandas|numpy|tableau|power bi|excel|agile|java|c\+\+|c#|\.net|ruby|go|rust|swift|kotlin|html|css|graphql|rest|api|linux|terraform|spark|hadoop|kafka|redis|elasticsearch|devops|data analysis|data science)\b/gi;

    const matches = text.match(SKILL_RE) || [];
    const skills = [...new Set(matches.map(s => s.toLowerCase()))];

    if (skills.length > 0) {
      await change.after.ref.update({
        skills,
        _enriched: true,
        _enrichedAt: new Date().toISOString(),
      });
    }
  });

/**
 * When a job is created, auto-enrich with metadata.
 */
exports.onJobWrite = functions.firestore
  .document("users/{uid}/jobs/{jobId}")
  .onCreate(async (snap, context) => {
    const data = snap.data();
    if (context.params.jobId === "_meta") return;
    if (data._enriched) return;

    // Extract skills from job title + description
    const jobText = `${data.title || ""} ${data.description || ""}`;
    const SKILL_RE = /\b(python|javascript|typescript|react|angular|vue|node\.?js|sql|nosql|mongodb|postgresql|aws|azure|gcp|docker|kubernetes|git|machine learning|deep learning|nlp|tensorflow|pytorch|pandas|numpy|tableau|power bi|excel|agile|java|c\+\+|c#|\.net|ruby|go|rust|swift|kotlin|html|css|graphql|rest|api|linux|terraform|spark|hadoop|kafka|redis|elasticsearch|devops|data analysis|data science)\b/gi;

    const matches = jobText.match(SKILL_RE) || [];
    const extractedSkills = [...new Set(matches.map(s => s.toLowerCase()))];

    // Update analytics counter
    const uid = context.params.uid;
    const analyticsRef = db.collection("users").doc(uid).collection("analytics").doc("overview");
    await analyticsRef.set({
      totalJobs: admin.firestore.FieldValue.increment(1),
      lastJobAdded: new Date().toISOString(),
    }, { merge: true });

    // Enrich job
    if (extractedSkills.length > 0) {
      await snap.ref.update({
        extractedSkills,
        _enriched: true,
        _enrichedAt: new Date().toISOString(),
      });
    }
  });

// ============================================================
// SEARCH API IMPLEMENTATIONS (server-side)
// ============================================================

async function searchRemotive(query) {
  const url = `https://remotive.com/api/remote-jobs${query ? "?search=" + encodeURIComponent(query) : ""}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error("Remotive: " + resp.status);
  const data = await resp.json();
  return (data.jobs || []).slice(0, 20).map(j => ({
    title: j.title || "", company: j.company_name || "",
    location: j.candidate_required_location || "Remote",
    url: j.url || "", source: "Remotive", salary: j.salary || "",
    date: (j.publication_date || "").slice(0, 10),
    description: (j.description || "").replace(/<[^>]*>/g, "").slice(0, 200),
    tags: j.tags ? j.tags.join(", ") : "",
  }));
}

async function searchArbeitnow(query) {
  const url = `https://www.arbeitnow.com/api/job-board-api${query ? "?search=" + encodeURIComponent(query) : ""}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error("Arbeitnow: " + resp.status);
  const data = await resp.json();
  return (data.data || []).slice(0, 20).map(j => ({
    title: j.title || "", company: j.company_name || "",
    location: j.location || "Remote", url: j.url || "",
    source: "Arbeitnow", salary: "",
    date: j.created_at || "", tags: (j.tags || []).join(", "),
    description: (j.description || "").slice(0, 200),
  }));
}

async function searchAdzuna(query, location, appId, appKey) {
  const country = (location || "").toLowerCase().includes("uk") ? "gb" : "us";
  const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?app_id=${appId}&app_key=${appKey}&what=${encodeURIComponent(query)}&results_per_page=20`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error("Adzuna: " + resp.status);
  const data = await resp.json();
  return (data.results || []).map(j => ({
    title: j.title || "", company: j.company?.display_name || "",
    location: j.location?.display_name || "",
    url: j.redirect_url || "", source: "Adzuna",
    salary: j.salary_min ? `$${j.salary_min}` : "",
    date: (j.created || "").slice(0, 10),
    description: (j.description || "").slice(0, 200),
  }));
}

async function searchJSearch(query, apiKey) {
  const url = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(query)}&page=1&num_pages=1`;
  const resp = await fetch(url, {
    headers: { "X-RapidAPI-Key": apiKey, "X-RapidAPI-Host": "jsearch.p.rapidapi.com" },
  });
  if (!resp.ok) throw new Error("JSearch: " + resp.status);
  const data = await resp.json();
  return (data.data || []).slice(0, 20).map(j => ({
    title: j.job_title || "", company: j.employer_name || "",
    location: j.job_city ? `${j.job_city}, ${j.job_state || ""}` : (j.job_country || ""),
    url: j.job_apply_link || "", source: "JSearch",
    salary: j.job_min_salary ? `$${j.job_min_salary}` : "",
    date: (j.job_posted_at_datetime_utc || "").slice(0, 10),
    description: (j.job_description || "").slice(0, 200),
    tags: j.job_required_skills ? j.job_required_skills.join(", ") : "",
  }));
}

async function callGemini(prompt, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });
  if (!resp.ok) throw new Error("Gemini: " + resp.status);
  const data = await resp.json();
  return { text: data.candidates?.[0]?.content?.parts?.[0]?.text || "" };
}

async function callGroq(prompt, apiKey) {
  const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7, max_tokens: 2048,
    }),
  });
  if (!resp.ok) throw new Error("Groq: " + resp.status);
  const data = await resp.json();
  return { text: data.choices?.[0]?.message?.content || "" };
}

async function enrichCompany(domain, apiKey) {
  const resp = await fetch(`https://companyenrichment.abstractapi.com/v1/?api_key=${apiKey}&domain=${encodeURIComponent(domain)}`);
  if (!resp.ok) throw new Error("Abstract: " + resp.status);
  return await resp.json();
}

async function verifyEmail(email, apiKey) {
  const resp = await fetch(`https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(email)}&api_key=${apiKey}`);
  if (!resp.ok) throw new Error("Hunter: " + resp.status);
  return await resp.json();
}

// ============================================================
// 4. TWILIO SMS — Send SMS notifications server-side
// ============================================================

/**
 * Send an SMS via Twilio REST API.
 * Uses fetch instead of the Twilio SDK to avoid extra dependency.
 */
async function sendTwilioSMS(to, message, uid) {
  const { accountSid, authToken, fromNumber } = CONFIG.twilio;

  if (!accountSid || !authToken || !fromNumber) {
    throw new functions.https.HttpsError("failed-precondition",
      "Twilio not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER in environment.");
  }

  // Validate phone number format
  const cleanNumber = (to || "").replace(/[^+\d]/g, "");
  if (!cleanNumber || cleanNumber.length < 10) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid phone number");
  }

  // Add +1 country code if not present
  const fullNumber = cleanNumber.startsWith("+") ? cleanNumber : "+1" + cleanNumber;

  // Rate limit: max 10 SMS per user per day
  const usageRef = db.collection("users").doc(uid).collection("config").doc("smsUsage");
  const usageDoc = await usageRef.get();
  const usage = usageDoc.exists ? usageDoc.data() : {};
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayCount = usage._date === todayKey ? (usage.count || 0) : 0;

  if (todayCount >= 10) {
    throw new functions.https.HttpsError("resource-exhausted", "Daily SMS limit reached (10/day)");
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: fullNumber,
        From: fromNumber,
        Body: message.slice(0, 1600), // SMS limit
      }).toString(),
    });

    const result = await resp.json();

    if (!resp.ok) {
      console.error("Twilio error:", result);
      throw new functions.https.HttpsError("internal", result.message || "SMS send failed");
    }

    // Update usage counter
    await usageRef.set({ _date: todayKey, count: todayCount + 1 }, { merge: true });

    console.log(`SMS sent to ${fullNumber} for user ${uid} (${todayCount + 1}/10 today)`);
    return { success: true, sid: result.sid, to: fullNumber };
  } catch (err) {
    if (err instanceof functions.https.HttpsError) throw err;
    console.error("SMS error:", err);
    throw new functions.https.HttpsError("internal", "Failed to send SMS: " + err.message);
  }
}

/**
 * Send notifications across multiple channels.
 * Channels: 'sms', 'ntfy', 'browser' (browser handled client-side)
 */
async function sendAllNotifications(message, channels, uid) {
  const results = {};

  if (channels?.includes("sms")) {
    try {
      // Get user's phone number from Firestore
      const userDoc = await db.collection("users").doc(uid).get();
      const phone = userDoc.data()?.phone;
      if (phone) {
        results.sms = await sendTwilioSMS(phone, message, uid);
      } else {
        results.sms = { success: false, error: "No phone number configured" };
      }
    } catch (err) {
      results.sms = { success: false, error: err.message };
    }
  }

  if (channels?.includes("ntfy")) {
    try {
      const keysDoc = await db.collection("users").doc(uid).collection("config").doc("apiKeys").get();
      const ntfyTopic = keysDoc.data()?.ntfyTopic;
      if (ntfyTopic) {
        await fetch(`https://ntfy.sh/${ntfyTopic}`, {
          method: "POST",
          body: message,
          headers: { "Title": "JobSync", "Priority": "3", "Tags": "briefcase" },
        });
        results.ntfy = { success: true };
      }
    } catch (err) {
      results.ntfy = { success: false, error: err.message };
    }
  }

  return results;
}

// ============================================================
// UTILITIES
// ============================================================

function normalizeUrl(url) {
  return (url || "").replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "").split("?")[0];
}

function futureDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function isRecent(dateStr) {
  if (!dateStr) return false;
  const diff = (new Date() - new Date(dateStr)) / (1000 * 3600 * 24);
  return diff <= 7;
}
