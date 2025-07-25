
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  "projectId": "sometric-app",
  "appId": "1:215837564402:web:d9118a48bfd3dd10c49f6b",
  "storageBucket": "sometric-app.firebasestorage.app",
  "apiKey": "AIzaSyCzeBmKZaLytR0j6jR8EyTjOYBkE7dTp5k",
  "authDomain": "sometric-app.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "215837564402"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

// Enable offline persistence
try {
    enableIndexedDbPersistence(db);
} catch (err: any) {
    if (err.code == 'failed-precondition') {
        // Multiple tabs open, persistence can only be enabled
        // in one tab at a time.
        console.warn('Firestore persistence failed: multiple tabs open.');
    } else if (err.code == 'unimplemented') {
        // The current browser does not support all of a the
        // features required to enable persistence
        console.warn('Firestore persistence not available in this browser.');
    }
}

export { db };
