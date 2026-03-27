"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Login from "@/features/auth/components/Login";

export default function HomePage() {
    const router = useRouter();
    const [verificando, setVerificando] = useState(true);

    useEffect(() => {
        const sesion = localStorage.getItem("usuario_sesion");
        if (sesion) {
            // Si ya está logueado, mándalo al dashboard
            router.push("/dashboard");
        } else {
            // Si no, deja de cargar para mostrar el Login
            setVerificando(false);
        }
    }, [router]);

    if (verificando) {
        return (
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100vh', 
                backgroundColor: '#f8fafc',
                color: '#64748b',
                fontFamily: 'sans-serif'
            }}>
                Cargando sistema...
            </div>
        );
    }

    // Si no hay sesión, mostramos el componente de Login
    return <Login onLoginSuccess={() => router.push("/dashboard")} />;
}