/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

// Initialize Firebase Admin SDK
const initializeFirebaseAdmin = () => {
  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: fs.readFileSync(path.resolve(__dirname, '../firebase-private-key.pem'), 'utf8'),
      }),
      storageBucket: `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.appspot.com`
    });
  }
};

// Firestore has a 1MB (1048487 bytes) limit per document
// We need to split content into chunks if it exceeds this limit
const MAX_CONTENT_SIZE = 900000; // Leave some buffer for other fields

async function importPortfolioToFirebase() {
  try {
    initializeFirebaseAdmin();
    const db = getFirestore();
    const PORTFOLIO_FILE = path.resolve(__dirname, '../public/portfolio.json');
    
    console.log('Reading portfolio data from:', PORTFOLIO_FILE);
    const portfolioData = JSON.parse(fs.readFileSync(PORTFOLIO_FILE, 'utf8'));
    
    console.log(`Found ${portfolioData.length} posts to import`);
    
    // Clear existing posts collection
    const postsCollection = db.collection('posts');
    const snapshot = await postsCollection.get();
    if (!snapshot.empty) {
      console.log('Clearing existing posts...');
      const batch = db.batch();
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      console.log('Existing posts cleared');
    }
    
    // Import posts one by one to handle large content
    let imported = 0;
    let errors = 0;
    
    for (const post of portfolioData) {
      try {
        const docRef = postsCollection.doc(); // Auto-generated ID
        
        // Check if content is too large
        const contentSize = Buffer.byteLength(post.content || '', 'utf8');
        
        if (contentSize > MAX_CONTENT_SIZE) {
          console.log(`Post "${post.title}" has large content (${contentSize} bytes), splitting...`);
          
          // Split content into chunks
          const chunks = [];
          let remaining = post.content;
          let chunkIndex = 0;
          
          while (remaining.length > 0) {
            // Find a good break point (end of paragraph or sentence)
            let chunkSize = Math.min(MAX_CONTENT_SIZE, remaining.length);
            let breakPoint = chunkSize;
            
            if (chunkSize < remaining.length) {
              // Try to break at a paragraph
              const lastPara = remaining.lastIndexOf('</p>', chunkSize);
              if (lastPara > chunkSize * 0.5) {
                breakPoint = lastPara + 4; // Include the </p>
              } else {
                // Try to break at a line break
                const lastBr = remaining.lastIndexOf('<br />', chunkSize);
                if (lastBr > chunkSize * 0.5) {
                  breakPoint = lastBr + 6;
                } else {
                  // Try to break at a sentence
                  const lastPeriod = remaining.lastIndexOf('. ', chunkSize);
                  if (lastPeriod > chunkSize * 0.5) {
                    breakPoint = lastPeriod + 2;
                  }
                }
              }
            }
            
            chunks.push(remaining.substring(0, breakPoint));
            remaining = remaining.substring(breakPoint);
            chunkIndex++;
          }
          
          // Store content as chunks in a subcollection
          const firebasePost = {
            title: post.title,
            slug: post.slug,
            category: post.category,
            subCategory: post.subCategory || '',
            published: post.published || true,
            featuredImage: post.featuredImage || '',
            createdAt: post.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            mediaType: 'url',
            mediaUrl: '',
            coverImage: post.featuredImage || '',
            deleted: false,
            contentChunks: chunks.length,
            contentPreview: post.content.substring(0, 500) + '...',
            hasLargeContent: true
          };
          
          await docRef.set(firebasePost);
          
          // Store chunks in subcollection
          for (let i = 0; i < chunks.length; i++) {
            await docRef.collection('content').doc(`chunk_${i}`).set({
              index: i,
              content: chunks[i]
            });
          }
          
          console.log(`  Split into ${chunks.length} chunks`);
        } else {
          // Normal post, store directly
          const firebasePost = {
            title: post.title,
            slug: post.slug,
            content: post.content,
            category: post.category,
            subCategory: post.subCategory || '',
            published: post.published || true,
            featuredImage: post.featuredImage || '',
            createdAt: post.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            mediaType: 'url',
            mediaUrl: '',
            coverImage: post.featuredImage || '',
            deleted: false,
            hasLargeContent: false
          };
          
          await docRef.set(firebasePost);
        }
        
        imported++;
        if (imported % 10 === 0) {
          console.log(`Imported ${imported}/${portfolioData.length} posts...`);
        }
      } catch (postError) {
        console.error(`Error importing post "${post.title}":`, postError.message);
        errors++;
      }
    }
    
    console.log(`\n✅ Import complete!`);
    console.log(`   Successfully imported: ${imported} posts`);
    if (errors > 0) {
      console.log(`   Errors: ${errors} posts`);
    }
    console.log('🚀 Your admin dashboard and public site should now display content');
    
  } catch (error) {
    console.error('❌ Error importing portfolio to Firebase:', error);
    process.exit(1);
  }
}

// Run the import
importPortfolioToFirebase();
