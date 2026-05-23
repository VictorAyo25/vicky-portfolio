const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: fs.readFileSync('firebase-private-key.pem', 'utf8'),
    }),
  });
}

const db = getFirestore();

async function run() {
  const docRef = db.collection('pages').doc('page_about');
  const snap = await docRef.get();
  if (snap.exists) {
    const data = snap.data();
    console.log('Current about page data:', data);
    if (data.cvUrl !== '/Victoria_Odueso_Resume.pdf') {
      await docRef.update({ cvUrl: '/Victoria_Odueso_Resume.pdf' });
      console.log('Successfully updated cvUrl to /Victoria_Odueso_Resume.pdf in pages/page_about doc.');
    } else {
      console.log(`cvUrl in database is already correct: ${data.cvUrl}`);
    }
  } else {
    console.log('pages/page_about document does not exist in the database.');
  }
}

run().catch(err => {
  console.error('Error running script:', err);
  process.exit(1);
});
