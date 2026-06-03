import React, { useEffect } from 'react';
import { NOMI_MESI } from './utils.js';

export const SortIcon = ({ direction }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block ml-1 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        {direction === 'asc' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />}
        {direction === 'desc' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />}
    </svg>
);

export const LoadingSpinner = () => (
    <div className="fixed inset-0 bg-white bg-opacity-75 flex justify-center items-center z-50">
        <div className="animate-spin rounded-full h-32 w-32 border-t-4 border-b-4 border-indigo-600"></div>
    </div>
);

export const Notification = ({ message, type, onClose }) => {
    if (!message) return null;
    const base = "fixed top-5 right-5 p-4 rounded-lg shadow-xl text-white z-50 flex items-center gap-3";
    const colors = { success: "bg-green-500", error: "bg-red-500", warning: "bg-yellow-500" };
    useEffect(() => {
        const t = setTimeout(onClose, 4000);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [onClose]);
    return (
        <div className={`${base} ${colors[type]}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <span>{message}</span>
            <button onClick={onClose} className="ml-4 opacity-70 hover:opacity-100">&times;</button>
        </div>
    );
};

// Badge colorato per i posti
export const SpotBadge = ({ codice }) => {
    const isContainer = codice.startsWith('K') || codice.startsWith('M');
    const color = isContainer ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800';
    return <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono font-semibold ${color}`}>{codice}</span>;
};

// Componente selettore mese (frecce avanti/indietro)
export const MonthPicker = ({ value, onChange }) => {
    const change = (amount) => {
        const d = new Date(value.year, value.month + amount, 1);
        onChange({ month: d.getMonth(), year: d.getFullYear() });
    };
    return (
        <div className="flex items-center justify-center space-x-4 my-2">
            <button onClick={() => change(-1)} className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors">&larr;</button>
            <span className="text-xl font-semibold text-gray-800 w-48 text-center">{NOMI_MESI[value.month]} {value.year}</span>
            <button onClick={() => change(1)} className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors">&rarr;</button>
        </div>
    );
};
