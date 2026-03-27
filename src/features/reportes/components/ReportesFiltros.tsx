import React from 'react';
import { SemanaDisponible } from '../../../shared/hooks/useReportes';

interface Props {
    filtros: any;
    setFiltros: any;
    semanasDisponibles: SemanaDisponible[];
    styles: any;
}

export default function ReportesFiltros({ filtros, setFiltros, semanasDisponibles, styles }: Props) {
    const handleTipoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setFiltros.setFiltroTipo(e.target.value);
        setFiltros.setFiltroMes('');
        setFiltros.setFiltroInicio('');
        setFiltros.setFiltroFin('');
        setFiltros.setFiltroSemana('');
    };

    return (
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', backgroundColor: '#fff', padding: '16px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: '#64748b' }}>filter_alt</span>
                <span style={{ fontWeight: '600', color: '#334155' }}>Periodo:</span>
            </div>
            
            <select value={filtros.tipo} onChange={handleTipoChange} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', cursor: 'pointer' }}>
                <option value="todos">Todo el Histórico</option>
                <option value="mes">Mes en Específico</option>
                <option value="rango">Rango de Fechas</option>
                <option value="semana">Por rango de semanas</option>
            </select>

            {filtros.tipo === 'mes' && (
                <input type="month" value={filtros.mes} onChange={(e) => setFiltros.setFiltroMes(e.target.value)} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} />
            )}

            {filtros.tipo === 'rango' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input type="date" value={filtros.inicio} onChange={(e) => setFiltros.setFiltroInicio(e.target.value)} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} />
                    <span style={{ color: '#64748b', fontSize: '14px' }}>hasta</span>
                    <input type="date" value={filtros.fin} onChange={(e) => setFiltros.setFiltroFin(e.target.value)} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} />
                </div>
            )}

            {filtros.tipo === 'semana' && (
                <select value={filtros.semana} onChange={(e) => setFiltros.setFiltroSemana(e.target.value)} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', cursor: 'pointer' }}>
                    <option value="">-- Seleccionar Semana --</option>
                    {semanasDisponibles.map(sem => (
                        <option key={sem.value} value={sem.value}>{sem.label}</option>
                    ))}
                </select>
            )}
        </div>
    );
}