#!/usr/bin/env node
/**
 * Seed test user accounts into Firebase Auth + Firestore.
 * Usage: node scripts/seed-test-users.js [--clean] [--persona free|power|paid|empty]
 */

const admin = require('firebase-admin');

// Initialize with default credentials (works when logged in via firebase CLI)
if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'jobgrid-pro' });
}
const db = admin.firestore();
const auth = admin.auth();

const PERSONAS = {
  free: {
    email: 'free@test.jobsynk.com',
    password: 'TestUser123!',
    displayName: 'Jordan (Free Tier)',
    tier: 'free',
    jobs: [
      { title: 'Data Analyst', company: 'Netflix', status: 'Saved', salary: '120000', source: 'LinkedIn' },
      { title: 'Python Developer', company: 'Spotify', status: 'Applied', salary: '140000', source: 'Indeed' },
      { title: 'QA Engineer', company: 'Slack', status: 'Interview', salary: '115000', source: 'Greenhouse' },
    ],
    resumes: [
      { name: 'General Resume v1', skills: ['python', 'sql', 'excel', 'tableau'] },
    ],
  },
  power: {
    email: 'power@test.jobsynk.com',
    password: 'TestUser123!',
    displayName: 'Alex (Power User)',
    tier: 'free',
    jobs: Array.from({ length: 15 }, (_, i) => ({
      title: ['Senior Engineer', 'Staff Engineer', 'Tech Lead', 'Principal Engineer', 'Architect'][i % 5],
      company: ['Meta', 'Amazon', 'Apple', 'Google', 'Microsoft', 'Netflix', 'Uber', 'Airbnb', 'Stripe', 'Coinbase', 'Datadog', 'Snowflake', 'Palantir', 'Databricks', 'Scale AI'][i],
      status: ['Saved', 'Applied', 'Interview', 'Offer', 'Closed'][i % 5],
      salary: String(150000 + i * 5000),
      source: ['LinkedIn', 'Indeed', 'Greenhouse', 'Lever', 'Remotive'][i % 5],
    })),
    resumes: [
      { name: 'Full Stack Resume', skills: ['javascript', 'react', 'node.js', 'python', 'aws', 'docker', 'kubernetes', 'sql'] },
      { name: 'Backend Focus', skills: ['python', 'go', 'rust', 'postgresql', 'redis', 'kafka', 'microservices'] },
      { name: 'Data & ML', skills: ['python', 'tensorflow', 'pytorch', 'spark', 'airflow', 'snowflake', 'dbt'] },
    ],
  },
  paid: {
    email: 'paid@test.jobsynk.com',
    password: 'TestUser123!',
    displayName: 'Morgan (Paid User)',
    tier: '3mo',
    jobs: Array.from({ length: 8 }, (_, i) => ({
      title: ['Product Manager', 'TPM', 'Engineering Manager', 'Director of Engineering', 'VP Engineering', 'CTO', 'Staff PM', 'Group PM'][i],
      company: ['Notion', 'Figma', 'Linear', 'Vercel', 'Supabase', 'Railway', 'Replit', 'Cursor'][i],
      status: ['Saved', 'Applied', 'Interview', 'Applied', 'Saved', 'Interview', 'Offer', 'Closed'][i],
      salary: String(180000 + i * 10000),
      source: 'LinkedIn',
    })),
    resumes: [
      { name: 'Leadership Resume', skills: ['product management', 'strategy', 'agile', 'data analysis', 'leadership'] },
      { name: 'Technical PM', skills: ['python', 'sql', 'product management', 'system design', 'api design'] },
    ],
  },
  empty: {
    email: 'empty@test.jobsynk.com',
    password: 'TestUser123!',
    displayName: 'Sam (Empty User)',
    tier: 'free',
    jobs: [],
    resumes: [],
  },
};

async function getOrCreateUser(email, password, displayName) {
  try {
    const user = await auth.getUserByEmail(email);
    console.log(`  Found existing user: ${user.uid}`);
    return user.uid;
  } catch (e) {
    if (e.code === 'auth/user-not-found') {
      const user = await auth.createUser({ email, password, displayName });
      console.log(`  Created new user: ${user.uid}`);
      return user.uid;
    }
    throw e;
  }
}

async function seedPersona(name, persona) {
  console.log(`\nSeeding ${name} persona (${persona.email})...`);
  const uid = await getOrCreateUser(persona.email, persona.password, persona.displayName);
  const userRef = db.collection('users').doc(uid);
  const now = new Date().toISOString();

  // Profile
  await userRef.set({
    provisioned: true,
    provisionedAt: now,
    email: persona.email,
    displayName: persona.displayName,
    isAnonymous: false,
    role: 'Candidate',
    theme: 'default',
    tier: persona.tier,
    createdAt: now,
    lastLogin: now,
  }, { merge: true });

  // API key vault
  await userRef.collection('config').doc('apiKeys').set({
    adzunaId: '', adzunaKey: '', jsearchKey: '',
    geminiKey: '', groqKey: '', updatedAt: now,
  }, { merge: true });

  // Jobs
  const batch = db.batch();
  for (const job of persona.jobs) {
    const ref = userRef.collection('jobs').doc();
    batch.set(ref, { ...job, id: ref.id, createdAt: now, _added: now.slice(0, 10) });
  }
  for (const resume of persona.resumes) {
    const ref = userRef.collection('resumes').doc();
    batch.set(ref, { ...resume, id: ref.id, createdAt: now, text: '' });
  }
  // Meta docs for empty collections
  for (const col of ['companies', 'contacts', 'interviews', 'networking', 'offers', 'stories']) {
    batch.set(userRef.collection(col).doc('_meta'), { createdAt: now, collection: col, count: 0 }, { merge: true });
  }
  await batch.commit();

  console.log(`  ✓ ${persona.jobs.length} jobs, ${persona.resumes.length} resumes, tier: ${persona.tier}`);
  return uid;
}

async function cleanPersona(name, persona) {
  console.log(`Cleaning ${name} persona (${persona.email})...`);
  try {
    const user = await auth.getUserByEmail(persona.email);
    // Delete Firestore data
    const collections = ['jobs', 'resumes', 'companies', 'contacts', 'interviews', 'networking', 'offers', 'stories', 'config'];
    for (const col of collections) {
      const snap = await db.collection('users').doc(user.uid).collection(col).get();
      const batch = db.batch();
      snap.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }
    await db.collection('users').doc(user.uid).delete();
    await auth.deleteUser(user.uid);
    console.log(`  ✓ Deleted user and data`);
  } catch (e) {
    if (e.code === 'auth/user-not-found') {
      console.log(`  ⊘ User not found (already clean)`);
    } else {
      console.error(`  ✗ Error: ${e.message}`);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const clean = args.includes('--clean');
  const personaArg = args.find(a => !a.startsWith('--'));
  const targetPersonas = personaArg ? { [personaArg]: PERSONAS[personaArg] } : PERSONAS;

  if (!personaArg || PERSONAS[personaArg]) {
    console.log('JobSynk Test User Seeder');
    console.log('========================');

    if (clean) {
      for (const [name, persona] of Object.entries(targetPersonas)) {
        await cleanPersona(name, persona);
      }
      console.log('\nClean complete.');
      if (!personaArg) return; // Just cleaning
    }

    const results = [];
    for (const [name, persona] of Object.entries(targetPersonas)) {
      const uid = await seedPersona(name, persona);
      results.push({ name, email: persona.email, uid, tier: persona.tier });
    }

    console.log('\n========================');
    console.log('Seeding complete!\n');
    console.table(results);
  } else {
    console.error(`Unknown persona: ${personaArg}`);
    console.log('Available: free, power, paid, empty');
    process.exit(1);
  }

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
