import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// ⚠️ MANTENHA SUAS CHAVES AQUI
const firebaseConfig = {
  apiKey: "AIzaSyBH5vdMDk1ZLy6NaSmjiYyYycmRRNiIiko",
  authDomain: "apprancho-59b44.firebaseapp.com",
  projectId: "apprancho-59b44",
  storageBucket: "apprancho-59b44.firebasestorage.app",
  messagingSenderId: "377620450775",
  appId: "1:377620450775:web:2be9eae10d5c5a6dde4f92",
  measurementId: "G-29J6RDD36Q"};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);

enableIndexedDbPersistence(db).catch((err) => {
  console.log("Erro offline:", err.code);
});



