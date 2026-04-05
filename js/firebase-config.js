const firebaseConfig = {
  apiKey: "AIzaSyBvcID6l6o4LtfpDczSu9D4koXtpFgyzyE",
  authDomain: "bloodlink-prototype.firebaseapp.com",
  projectId: "bloodlink-prototype",
  storageBucket: "bloodlink-prototype.firebasestorage.app",
  messagingSenderId: "524053446317",
  appId: "1:524053446317:web:d916c376f06c4c61791024"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

db.enablePersistence().catch(err => {
  if (err.code === 'failed-precondition') {
    console.warn('Persistence failed: multiple tabs open');
  } else if (err.code === 'unimplemented') {
    console.warn('Persistence not available in this browser');
  }
});

console.log("Firebase initialized successfully");
