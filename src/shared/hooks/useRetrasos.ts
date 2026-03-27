"use client";
import { useState, useEffect } from 'react';
import { RetrasoTicket } from '../types/retrasos.types';
import { fetchRetrasos } from '../services/retrasosService';

export const useRetrasos = (isOpen: boolean) => {
    const [retrasos, setRetrasos] = useState<RetrasoTicket[]>([]);
    const [cargando, setCargando] = useState(false);

    const cargarDatos = async () => {
        setCargando(true);
        try {
            const data = await fetchRetrasos();
            setRetrasos(data);
        } catch (error) {
            console.error('Error al cargar retrasos:', error);
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            cargarDatos();
        }
    }, [isOpen]);

    return { retrasos, cargando, refrescar: cargarDatos };
};