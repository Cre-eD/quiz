import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyCKtogNq4zoiAd6dGa16nerndhKj3iA7Hs",
  authDomain: "devops-quiz-2c930.firebaseapp.com",
  projectId: "devops-quiz-2c930",
  appId: "1:86349315764:web:2f579516f90219ed20a1e1"
}

export const ADMIN_EMAIL = "creeed22@gmail.com"

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const googleProvider = new GoogleAuthProvider()
