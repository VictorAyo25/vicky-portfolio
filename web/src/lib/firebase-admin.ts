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

let firestore: any;

try {
  if (getApps().length === 0 && projectId && clientEmail && privateKey) {
    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    firestore = getFirestore();
  } else if (getApps().length > 0) {
    firestore = getFirestore();
  } else {
    console.warn('Firebase Admin: Credentials missing or invalid. Using proxy fallback.');
    firestore = new Proxy({}, {
      get: (target, prop) => {
        if (prop === 'collection') {
          return () => ({
            add: async () => {
              console.warn('Firebase Admin: collection.add called on proxy fallback. No-op.');
              return { id: 'mock-id' };
            }
          });
        }
        return () => {
          console.warn(`Firebase Admin: Method ${String(prop)} called on proxy fallback. No-op.`);
          return target;
        };
      }
    });
  }
} catch (error) {
  console.error('Firebase Admin init error:', error);
  firestore = new Proxy({}, {
    get: (target, prop) => {
      if (prop === 'collection') {
        return () => ({
          add: async () => {
            console.error('Firebase Admin: collection.add called on failed init proxy fallback. No-op.');
            return { id: 'mock-id' };
          }
        });
      }
      return () => {
        console.error(`Firebase Admin: Method ${String(prop)} called on failed init proxy fallback. No-op.`);
        return target;
      };
    }
  });
}

export const adminDb = firestore;
