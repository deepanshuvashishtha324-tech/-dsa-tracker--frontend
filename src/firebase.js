import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyAnQOTmoRbm4ac7PtRAIRVRpmRYYuMS-JI",
  authDomain: "dsa---tracker.firebaseapp.com",
  projectId: "dsa---tracker",
  storageBucket: "dsa---tracker.firebasestorage.app",
  messagingSenderId: "478229679942",
  appId: "1:478229679942:web:916b49bb8336da49aedf47"
};

const app  = initializeApp(firebaseConfig);
export const db   = getFirestore(app);
export const auth = getAuth(app);

