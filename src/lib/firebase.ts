// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  projectId: "sometric-app",
  appId: "1:215837564402:web:d9118a48bfd3dd10c49f6b",
  storageBucket: "sometric-app.appspot.com",
  apiKey: "AIzaSyCzeBmKZaLytR0j6jR8EyTjOYBkE7dTp5k",
  authDomain: "sometric-app.firebaseapp.com",
  messagingSenderId: "215837564402",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

export { db, storage };