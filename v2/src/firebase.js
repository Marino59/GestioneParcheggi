import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyDgciep9O7bg_Yp_DEhUtMlAluao9ozQIM",
    authDomain: "parcheggi-c367b.firebaseapp.com",
    projectId: "parcheggi-c367b",
    storageBucket: "parcheggi-c367b.appspot.com",
    messagingSenderId: "386670673647",
    appId: "1:386670673647:web:c941bd6be8b34cd785e51a"
};

export const OWNER_UID = "TTUeuWS40vPxFgVPlqgFF8Vie0S2";

export const AUTHORIZED_UIDS = [
    "TTUeuWS40vPxFgVPlqgFF8Vie0S2",
    "IMPupY8tg3XiiatH8uCZtgYqQjI3"
];

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
