import { initializeApp } from 'firebase/app'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  terminate,
} from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { logger } from './utils/logger'

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

// 2. Inicjalizacja Firestore (mutable — recoverFirestore() may reassign)
// eslint-disable-next-line import/no-mutable-exports
let db = initializeFirestore(app, firestoreSettings)

// 3. Inicjalizacja Auth
const auth = getAuth(app)

/**
 * Recover from a deadlocked Firestore SDK.
 *
 * On iOS Safari, heavy fetch activity (e.g. PDF font/image loading) can
 * kill Firestore's internal WebChannel, leaving the SDK in a state where
 * onSnapshot / getDocs / getDoc all hang forever.
 *
 * Calling this function terminates the current instance and creates a
 * fresh one.  Because `db` is a module-level `let`, all future imports
 * of `db` will see the new instance.
 */
export async function recoverFirestore(): Promise<void> {
  logger.log('🔄 recoverFirestore: terminating old Firestore instance…')
  try {
    await terminate(db)
  } catch (err) {
    logger.warn('⚠️ recoverFirestore: terminate() threw (ignoring):', err)
  }
  db = initializeFirestore(app, firestoreSettings)
  logger.log('✅ recoverFirestore: new Firestore instance ready')
}

export { app, db, auth }
