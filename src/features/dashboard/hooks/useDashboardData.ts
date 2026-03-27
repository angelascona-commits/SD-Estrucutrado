"use client";
import { useState, useEffect } from 'react';
import { Ticket } from '../types/dashboard.types';
import { obtenerFeriados, obtenerAlarmas, obtenerTicketsRecientes } from '../services/dashboard.service';

export const useDashboardData = () => {
    const [alarmas, setAlarmas] = useState<Ticket[]>([]);
    const [ticketsRecientes, setTicketsRecientes] = useState<Ticket[]>([]);
    const [feriados, setFeriados] = useState<string[]>([]);
    const [cargando, setCargando] = useState<boolean>(true);

    const cargarDatos = async () => {
        setCargando(true);
        try {
            const [feriadosData, alarmasData, ticketsData] = await Promise.all([
                obtenerFeriados(),
                obtenerAlarmas(),
                obtenerTicketsRecientes()
            ]);
            setFeriados(feriadosData);
            setAlarmas(alarmasData);
            setTicketsRecientes(ticketsData);
        } catch (error: any) {
            console.error("Error cargando el dashboard:", error.message);
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarDatos();
    }, []);

    return { alarmas, ticketsRecientes, feriados, cargando, cargarDatos };
};