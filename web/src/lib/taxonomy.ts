import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface Taxonomy {
  [category: string]: string[];
}

export const INITIAL_TAXONOMY: Taxonomy = {
  "Blog Articles": [
    "Blogging - SaaS",
    "Consumer Electronics - Travel Gear - E-commerce",
    "Digital Marketing - SEO",
    "Ecommerce - Online Business",
    "EdTech (Educational Technology)",
    "Education",
    "Email Marketing",
    "Fashion & Lifestyle",
    "Habits & Productivity",
    "Health",
    "Mental Health & Wellness",
    "Personal Care & Hygiene",
    "Public Health",
    "Relationships & Dating",
    "Skincare - Beauty",
    "Software & Tech Reviews",
    "Technology - Social Media",
    "WordPress - Website Management"
  ],
  "Guest Posts": [
    "Automotive - Car Maintenance - Vehicle Services",
    "Baby Care - Parenting",
    "Business",
    "Driver Education - Road Safety",
    "Health & Wellness",
    "Home Appliances - Electronics - Consumer Goods",
    "Legal Services",
    "Real Estate",
    "Travel & Tourism",
    "Veterinary - Pet Health - Animal Care"
  ],
  "Niche Edits": [
    "Gardening & Landscaping",
    "Graphic Design - Visual Marketing",
    "Health & Wellness",
    "Home Improvement"
  ],
  "Press Releases": [
    "Arts & Entertainment",
    "Sports & Martial Arts - Fitness Education"
  ],
  "E-book": [],
  "Scripts": []
};

export const TAXONOMY_DOC_ID = 'structure';
export const TAXONOMY_COLLECTION = 'taxonomy';

export async function fetchTaxonomy(): Promise<Taxonomy> {
  try {
    const docRef = doc(db, TAXONOMY_COLLECTION, TAXONOMY_DOC_ID);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as Taxonomy;
    } else {
      // If it doesn't exist, we can't save it as a public user due to permissions
      return INITIAL_TAXONOMY;
    }
  } catch (error) {
    console.error("Error fetching taxonomy:", error);
    return INITIAL_TAXONOMY; // Fallback so the site doesn't crash
  }
}

export async function addSubcategory(category: string, subCategory: string) {
  const docRef = doc(db, TAXONOMY_COLLECTION, TAXONOMY_DOC_ID);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    const data = docSnap.data() as Taxonomy;
    const currentSubs = data[category] || [];
    
    if (!currentSubs.includes(subCategory)) {
      const updatedSubs = [...currentSubs, subCategory].sort();
      await updateDoc(docRef, {
        [category]: updatedSubs
      });
    }
  }
}
