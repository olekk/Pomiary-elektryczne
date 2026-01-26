import { initializeApp } from "firebase/app";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAxBgF6W_NKGQGvCepAI7fLgGknDOeShfk",
  authDomain: "pomiary-elektryczne-57ad6.firebaseapp.com",
  projectId: "pomiary-elektryczne-57ad6",
  storageBucket: "pomiary-elektryczne-57ad6.firebasestorage.app",
  messagingSenderId: "799519885982",
  appId: "1:799519885982:web:7fa2721481264002c3498f",
  measurementId: "G-XNK6FW7373",
};

// 1. Inicjalizacja Aplikacji
const app = initializeApp(firebaseConfig);

// 2. Inicjalizacja Firestore z NOWYM API (To naprawia błędy offline i deprecated)
// Używamy initializeFirestore zamiast getFirestore, aby przekazać ustawienia cache od razu.
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

// 3. Inicjalizacja Auth
const auth = getAuth(app);
signInAnonymously(auth).catch((error) => {
  console.error("Błąd logowania anonimowego:", error);
});

// Eksportujemy instancje, aby używać ich w innych plikach
export { app, db, auth };
