// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
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
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

export { db, storage };
