import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db, auth, OWNER_UID, AUTHORIZED_UIDS } from './firebase.js';
import { calcolaPartiteAperte } from './utils.js';
import { LoadingSpinner, Notification } from './components.jsx';
import DashboardPage from './Dashboard.jsx';
import AnagraficaClienti from './AnagraficaClienti.jsx';
import GestionePagamenti from './GestionePagamenti.jsx';

// ── Login ────────────────────────────────────────────────────────────
const LoginPage = ({ setNotification }) => {
    const [loading, setLoading] = useState(false);
    const handleGoogleSignIn = async () => {
        setLoading(true);
        try { await signInWithPopup(auth, new GoogleAuthProvider()); }
        catch (e) { setNotification({ message: `Errore: ${e.message}`, type: 'error' }); }
        finally { setLoading(false); }
    };
    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-slate-100 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md">
                <header className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 text-white mb-4 shadow-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-9 w-9" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7h18M3 12h18M3 17h18" />
                        </svg>
                    </div>
                    <h1 className="text-4xl font-bold text-gray-800 tracking-tight">Gestione Parcheggi</h1>
                    <p className="text-indigo-600 font-semibold mt-1">Versione 2</p>
                    <p className="text-slate-500 mt-1 text-sm">Più posti per cliente, un solo pagamento</p>
                </header>
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <button onClick={handleGoogleSignIn} disabled={loading}
                        className="w-full px-6 py-3 bg-white border border-gray-300 text-gray-700 font-semibold rounded-xl shadow-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-3 disabled:opacity-50">
                        <svg className="w-5 h-5" viewBox="0 0 48 48">
                            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59L2.56 13.22C1.22 16.25 0 20 0 24s1.22 7.75 2.56 10.78l7.97-6.19z" />
                            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                        </svg>
                        {loading ? 'Accesso...' : 'Accedi con Google'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── App principale ───────────────────────────────────────────────────
export default function App() {
    const [page, setPage] = useState('login');
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notification, setNotification] = useState({ message: null, type: 'success' });
    const [clienti, setClienti] = useState([]);

    const isAuthorized = user && AUTHORIZED_UIDS.includes(user.uid);

    // Auth listener
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (u) => {
            setUser(u);
            if (!u) { setPage('login'); setClienti([]); setLoading(false); }
            else { setLoading(true); }
        });
        return unsub;
    }, []);

    // Data listener (clienti_v2)
    useEffect(() => {
        if (!user || !isAuthorized) { setClienti([]); setLoading(false); return; }
        const q = query(collection(db, `clienti_v2/${OWNER_UID}/records`));
        const unsub = onSnapshot(q, (snap) => {
            const list = snap.docs.map(d => ({ ...d.data(), id: d.id }));
            const withPartite = list.map(c => ({ ...c, partite_aperte: calcolaPartiteAperte(c) }));
            setClienti(withPartite);
            setLoading(false);
            if (page === 'login') setPage('dashboard');
        }, (err) => {
            console.error(err);
            setNotification({ message: `Errore database: ${err.message}`, type: 'error' });
            setLoading(false);
        });
        return unsub;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, isAuthorized]);

    const closeNotification = () => setNotification({ message: null, type: 'success' });

    const renderPage = () => {
        if (loading) return <LoadingSpinner />;
        if (!user) return <LoginPage setNotification={setNotification} />;
        if (!isAuthorized) return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
                <h1 className="text-2xl font-bold text-red-600">Accesso Negato</h1>
                <p className="text-slate-600 mt-2">Non sei autorizzato a visualizzare questi dati.</p>
                <p className="text-sm text-slate-400 mt-4">UID: {user.uid}</p>
                <button onClick={() => signOut(auth)} className="mt-6 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Logout</button>
            </div>
        );
        switch (page) {
            case 'anagrafica': return <AnagraficaClienti setCurrentPage={setPage} setNotification={setNotification} clienti={clienti} />;
            case 'pagamenti':  return <GestionePagamenti setCurrentPage={setPage} setNotification={setNotification} clienti={clienti} />;
            default:           return <DashboardPage user={user} setCurrentPage={setPage} setNotification={setNotification} clienti={clienti} />;
        }
    };

    return (
        <div className="bg-slate-50 min-h-screen font-sans">
            <Notification message={notification.message} type={notification.type} onClose={closeNotification} />
            <main className="h-screen flex flex-col">
                <div className="flex justify-end p-3">
                    {user && isAuthorized && (
                        <button onClick={() => signOut(auth)} className="px-4 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 font-semibold">
                            Logout
                        </button>
                    )}
                </div>
                {renderPage()}
            </main>
        </div>
    );
}
