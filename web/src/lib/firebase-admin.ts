import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

let privateKey: string | undefined;

// In local development, check for the valid PEM file in process.cwd()
try {
  const pemPath = path.join(/*turbopackIgnore: true*/ process.cwd(), 'firebase-private-key.pem');
  if (fs.existsSync(pemPath)) {
    privateKey = fs.readFileSync(pemPath, 'utf8');
  }
} catch (err) {
  console.warn('Firebase Admin: Failed to read PEM file from disk, falling back to environment variable.', err);
}

// Fallback to environment variable if PEM file wasn't found or readable
if (!privateKey) {
  privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    : undefined;
}

if (getApps().length === 0 && projectId && clientEmail && privateKey) {
  try {
    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  } catch (error) {
    console.error('Firebase Admin init error:', error);
  }
}

export const adminDb = getFirestore();
