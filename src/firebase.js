import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC58T-n7eBW5YsexDcoexnKg0ueQvIr6p0",
  authDomain: "expense-maszkaapp.firebaseapp.com",
  projectId: "expense-maszkaapp",
  storageBucket: "expense-maszkaapp.firebasestorage.app",
  messagingSenderId: "664511235344",
  appId: "1:664511235344:web:c835fc886b2326d9419195",
  measurementId: "G-0NCEDQSR89",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
