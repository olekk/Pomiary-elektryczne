import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
// import { getAnalytics } from 'firebase/analytics';

// TODO: Zastąp placeholdery swoimi wartościami z Firebase Console
// const firebaseConfig = {
//   apiKey: "YOUR_API_KEY",
//   authDomain: "pomiary-elektryczne-57ad6.firebaseapp.com",
//   projectId: "pomiary-elektryczne-57ad6",
//   storageBucket: "pomiary-elektryczne-57ad6.appspot.com",
//   messagingSenderId: "799519885982",
//   appId: "YOUR_APP_ID"
// };
const firebaseConfig = {
    apiKey: "AIzaSyAxBgF6W_NKGQGvCepAI7fLgGknDOeShfk",
    authDomain: "pomiary-elektryczne-57ad6.firebaseapp.com",
    projectId: "pomiary-elektryczne-57ad6",
    storageBucket: "pomiary-elektryczne-57ad6.firebasestorage.app",
    messagingSenderId: "799519885982",
    appId: "1:799519885982:web:7fa2721481264002c3498f",
    measurementId: "G-XNK6FW7373"
  };
// Initialize Firebase
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);

// Initialize Firestore with offline persistence
export const db = getFirestore(app);

// Enable offline persistence
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Persistence failed: Multiple tabs open');
  } else if (err.code === 'unimplemented') {
    console.warn('Persistence not available in this browser');
  }
});

// Initialize Auth and sign in anonymously
export const auth = getAuth(app);

// Auto sign-in anonymously on app start
signInAnonymously(auth).catch((error) => {
  console.error('Anonymous auth failed:', error);
});

export { app };
