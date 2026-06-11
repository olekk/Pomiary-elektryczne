import { initializeApp } from 'firebase/app'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { getFunctions } from 'firebase/functions'

const firebaseConfig = {
  apiKey: 'AIzaSyAxBgF6W_NKGQGvCepAI7fLgGknDOeShfk',
  authDomain: 'pomiary-elektryczne-57ad6.firebaseapp.com',
  projectId: 'pomiary-elektryczne-57ad6',
  storageBucket: 'pomiary-elektryczne-57ad6.firebasestorage.app',
  messagingSenderId: '799519885982',
  appId: '1:799519885982:web:7fa2721481264002c3498f',
  measurementId: 'G-XNK6FW7373',
}

const firestoreSettings = {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
}

// 1. Inicjalizacja Aplikacji
const app = initializeApp(firebaseConfig)

// 2. Inicjalizacja Firestore
const db = initializeFirestore(app, firestoreSettings)

// 3. Inicjalizacja Auth
const auth = getAuth(app)

// 4. Inicjalizacja Functions (europe-west1 region)
const functions = getFunctions(app, 'europe-west1')

export { app, db, auth, functions }
