import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC_d7DFaGaSLU1VyPNYeFruraAYqLXYS3o",
  authDomain: "tylerkeller-dev.firebaseapp.com",
  projectId: "tylerkeller-dev",
  storageBucket: "tylerkeller-dev.appspot.com",
  messagingSenderId: "808076940727",
  appId: "1:808076940727:web:ff0c8243e71a3e81d28432",
  measurementId: "G-16Z1BNN8ND"
};

// setup a recursive function to get the data
function getFirebaseData(ref, callback) {
  ref.once("value", function(snapshot) {
    callback(snapshot.val());
    snapshot.forEach(function(childSnapshot) {
      getFirebaseData(childSnapshot.ref, callback);
    });
  });
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
