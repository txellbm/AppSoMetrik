
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  "projectId": "app-sometrik",
  "appId": "1:352482910314:web:8c5b6b8c8d1b1c7c9b0e1a",
  "storageBucket": "app-sometrik.appspot.com",
  "apiKey": "AIzaSyA_S0m3Th1ngS3cr3t",
  "authDomain": "app-sometrik.firebaseapp.com",
  "messagingSenderId": "352482910314"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app, "main-db");

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
