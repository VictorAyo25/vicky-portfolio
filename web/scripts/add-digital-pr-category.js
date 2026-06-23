/* eslint-disable @typescript-eslint/no-require-imports */
// One-off script: adds the "Digital PR" category to the live Firestore
// taxonomy/structure doc (the source of truth read by fetchTaxonomy()).
// Run from the web/ dir:  node scripts/add-digital-pr-category.js
const fs = require('fs');
const path = require('path');
const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const CATEGORY = 'Digital PR';

const initializeFirebaseAdmin = () => {
  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: fs.readFileSync(path.resolve(__dirname, '../firebase-private-key.pem'), 'utf8'),
      }),
    });
  }
};

async function addCategory() {
  initializeFirebaseAdmin();
  const db = getFirestore();
  const docRef = db.collection('taxonomy').doc('structure');
  const snap = await docRef.get();

  if (!snap.exists) {
    console.error('taxonomy/structure doc does not exist. Aborting.');
    process.exit(1);
  }

  const data = snap.data() || {};
  if (Object.prototype.hasOwnProperty.call(data, CATEGORY)) {
    console.log(`"${CATEGORY}" already exists in taxonomy. Nothing to do.`);
    return;
  }

  // Flat category, no subcategories.
  await docRef.update({ [CATEGORY]: [] });
  console.log(`Added "${CATEGORY}" category to taxonomy/structure.`);
}

addCategory()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Failed to add category:', err);
    process.exit(1);
  });
