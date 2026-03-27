"use client";

import Login from '@/features/auth/components/Login'; 
import { useRouter } from 'next/navigation';

export default function PantallaPrincipal() {
    const router = useRouter();

    const manejarLoginExitoso = (usuarioDatos: any) => {
        // Cuando el login avisa que fue exitoso, vamos al dashboard
        router.push('/dashboard'); 
    };

    return <Login onLoginSuccess={manejarLoginExitoso} />;
}