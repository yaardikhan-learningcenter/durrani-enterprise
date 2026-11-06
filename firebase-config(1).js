// Paste your Firebase web app config here (Firebase console > Project settings > Your apps > Web app).
export const firebaseConfig = {
  apiKey: "PASTE_API_KEY",
  authDomain: "PASTE_PROJECT_ID.firebaseapp.com",
  projectId: "PASTE_PROJECT_ID",
  storageBucket: "PASTE_PROJECT_ID.appspot.com",
  messagingSenderId: "PASTE_SENDER_ID",
  appId: "PASTE_APP_ID"
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAZgz2oiwPiBxLhhnPsNPB6Ot7S4KiZ66g",
  authDomain: "durrani-enterprise.firebaseapp.com",
  databaseURL: "https://durrani-enterprise-default-rtdb.firebaseio.com",
  projectId: "durrani-enterprise",
  storageBucket: "durrani-enterprise.firebasestorage.app",
  messagingSenderId: "523247604188",
  appId: "1:523247604188:web:ae1106ff3cd6d50ec3ff19",
  measurementId: "G-GGB4N0NCP6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);};
