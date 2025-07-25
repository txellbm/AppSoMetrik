// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCxVPfW9aVFIYAaUu4Jr5Uix-YLIqHl1Xw",
  authDomain: "app-sometrik.firebaseapp.com",
  projectId: "app-sometrik",
  storageBucket: "app-sometrik.firebasestorage.app",
  messagingSenderId: "352482910314",
  appId: "1:352482910314:web:2a9020e50fd6ffcbd4aa13",
  measurementId: "G-D6DQHBNLF9"
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
