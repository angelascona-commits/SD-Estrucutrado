import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { FormDataModal } from '../types/ticket.types';
import { getFechaLocalActual, calcularHorasLaborables, validarCongruenciaFechas } from '../utils/dateUtils';
import { getIconConfig } from '../utils/uiUtils';
// IMPORTAMOS LOS SERVICIOS
import { fetchCatalogos, fetchTicketData, saveTicketBD, saveTicketKPIs, saveHistorial } from '../services/ticketService';

// Constante para no repetir código
const INITIAL_FORM_DATA: FormDataModal = {
  numero_ticket: '', tipo_sd: '', descripcion: '', dni: '', poliza: '',
  prioridad_id: '', producto_id: '', responsable_id: '', estado_id: '',
  aplicacion_id: '', estado_jira_id: '', horas_invertidas: 0,
  observaciones: '', horario_laboral: '', fecha_registro: getFechaLocalActual(),
  fecha_creacion_sd: '', fecha_asignacion: '', fecha_delegacion: '',
  fecha_estimada: '', fecha_maxima_atencion: '', fecha_atencion: ''
};

export const useTicketModal = (numeroTicket: number | string | null, isOpen: boolean, onClose: () => void, onSuccess?: () => void) => {
  const isEditing = Boolean(numeroTicket);
  const [cargando, setCargando] = useState(false);
  const [ticket, setTicket] = useState<any>(null);
  const [historial, setHistorial] = useState<any[]>([]);
  const [formData, setFormData] = useState<FormDataModal>(INITIAL_FORM_DATA);

  // AGRUPAMOS TODOS LOS CATÁLOGOS EN UN SOLO ESTADO
  const [catalogos, setCatalogos] = useState<any>({
    responsables: [], estados: [], aplicaciones: [], estadosJira: [], prioridades: [], productos: [], feriados: []
  });

  useEffect(() => {
    if (isOpen) cargarDatos();
  }, [isOpen, numeroTicket]);

  useEffect(() => {
    if (isEditing && ticket) {
      
      // 1. Sanitizamos el ticket para evitar que React reciba 'null' en los inputs
      const ticketSanitizado = Object.keys(ticket).reduce((acc: any, key) => {
        const valorBD = ticket[key];
        
        // Si el valor de la BD es null, lo forzamos a vacío
        if (valorBD === null || valorBD === undefined) {
          acc[key] = '';
        } 
        // Tratamiento especial para que las fechas no rompan el <input type="datetime-local">
        else if (['fecha_registro', 'fecha_creacion_sd', 'fecha_asignacion', 'fecha_delegacion', 'fecha_estimada', 'fecha_maxima_atencion', 'fecha_atencion'].includes(key)) {
          acc[key] = typeof valorBD === 'string' ? valorBD.split('.')[0] : valorBD;
        } 
        else {
          acc[key] = valorBD;
        }
        return acc;
      }, {});

      // 2. Cargamos los datos limpios
      setFormData({ ...INITIAL_FORM_DATA, ...ticketSanitizado }); 

    } else if (!isEditing && isOpen) {
      setFormData({ ...INITIAL_FORM_DATA, fecha_registro: getFechaLocalActual() });
      setHistorial([]);
      setTicket(null);
    }
  }, [ticket, isEditing, isOpen]);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      // 1. Usamos el servicio para traer catálogos
      const catalogosData = await fetchCatalogos();
      setCatalogos(catalogosData);

      // 2. Usamos el servicio para traer datos del ticket si estamos editando
      if (isEditing && numeroTicket) {
        const { ticket: ticketBd, historial: historialBd } = await fetchTicketData(numeroTicket);
        setTicket(ticketBd);
        setHistorial(historialBd);
      }
    } catch (error) {
      console.error("Error cargando modal:", error);
      Swal.fire('Error', 'No se pudo cargar la información.', 'error');
    } finally {
      setCargando(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let newFormData = { ...formData, [name]: value };

    if (name === 'responsable_id') {
      if (value !== '') {
        newFormData.fecha_delegacion = getFechaLocalActual();
        const respSeleccionado = catalogos.responsables.find((r: any) => r.id.toString() === value);
        newFormData.horario_laboral = respSeleccionado?.horario_laboral || '09:00 - 18:00';
      } else {
        newFormData.fecha_delegacion = '';
        newFormData.horario_laboral = '';
      }
    }
    setFormData(newFormData);
  };

  const handleGuardarCambios = async () => {
    // Validaciones Básicas
    if (!isEditing && !formData.numero_ticket) return Swal.fire({ icon: 'warning', title: 'Falta Número de Ticket' });
    if (!formData.descripcion) return Swal.fire({ icon: 'warning', title: 'Falta Descripción' });

    const errorFechas = validarCongruenciaFechas(formData.fecha_creacion_sd, formData.fecha_asignacion, formData.fecha_maxima_atencion, formData.fecha_atencion);
    if (errorFechas) return Swal.fire({ icon: 'error', title: 'Fechas incongruentes', text: errorFechas });

    const confirmacion = await Swal.fire({
      title: '¿Guardar ticket?', icon: 'question', showCancelButton: true, confirmButtonColor: '#ea580c', confirmButtonText: 'Sí, guardar'
    });
    if (!confirmacion.isConfirmed) return;

    setCargando(true);
    try {
      let usuarioId = 1, usuarioNombre = 'Sistema';
      try {
        const sesion = localStorage.getItem('usuario_sesion');
        if (sesion) { const u = JSON.parse(sesion); usuarioId = u.id; usuarioNombre = u.nombre; }
      } catch (e) {}

      const payload: any = {};

      // Recorremos todas las llaves que ya definiste en tu archivo de tipos
      for (const key in INITIAL_FORM_DATA) {
        const valor = (formData as any)[key];

        // 🛑 Regla 1: Ocultar los campos que pediste forzándolos a null
        if (key === 'prioridad_id' || key === 'fecha_estimada') {
          payload[key] = null;
        }
        // 🛑 Regla 2: Si el campo está vacío en el formulario, enviamos null
        else if (valor === '' || valor === undefined || valor === null) {
          payload[key] = null;
        }
        // 🛑 Regla 3: Si la llave termina en '_id' o es 'horas_invertidas', la convertimos a NÚMERO
        else if (key.endsWith('_id') || key === 'horas_invertidas') {
          payload[key] = Number(valor);
        }
        // 🛑 Regla 4: Todo lo demás (textos y fechas) pasa tal cual
        else {
          payload[key] = valor;
        }
      }

      // 2. Datos exclusivos de la creación
      if (!isEditing) {
        payload.numero_ticket = Number(formData.numero_ticket);
        payload.creador_id = usuarioId;
      }
      
      // Enviamos para la base de datos

      Object.keys(payload).forEach((key) => {
        const valor = payload[key];
        
        if (
          valor === "" || 
          valor === undefined || 
          valor === "null" || 
          (typeof valor === 'string' && valor.trim() === "")
        ) {
          payload[key] = null;
        }
      });

      if (!isEditing) {
        payload.numero_ticket = parseInt(String(formData.numero_ticket));
        payload.creador_id = usuarioId;
      }
      
      const ticketProcesadoId = await saveTicketBD(payload, isEditing, ticket?.id);

      const kpiPayload = {
        ticket_id: ticketProcesadoId,
        asignacion_fuera_tiempo: calcularHorasLaborables(formData.fecha_creacion_sd || formData.fecha_registro, formData.fecha_asignacion, catalogos.feriados) > 8,
        tiempo_insuficiente: (formData.fecha_asignacion && formData.fecha_maxima_atencion) ? calcularHorasLaborables(formData.fecha_asignacion, formData.fecha_maxima_atencion, catalogos.feriados) < 16 : false,
        diferencia_cierre: (formData.fecha_maxima_atencion && formData.fecha_atencion) 
          ? (new Date(formData.fecha_atencion) > new Date(formData.fecha_maxima_atencion) 
              ? calcularHorasLaborables(formData.fecha_maxima_atencion, formData.fecha_atencion, catalogos.feriados)
              : -Math.abs(calcularHorasLaborables(formData.fecha_atencion, formData.fecha_maxima_atencion, catalogos.feriados)))
          : null
      };
      await saveTicketKPIs(kpiPayload);

      await saveHistorial(ticketProcesadoId, usuarioId, usuarioNombre, isEditing, formData.observaciones || '');

      Swal.fire({ icon: 'success', title: '¡Guardado!', timer: 2000, showConfirmButton: false }).then(() => {
        onClose();
        if (onSuccess) {
          onSuccess(); // Actualiza la tabla sin recargar la página
        }
      });

    } catch (error: any) {
      if (error.code === '23505') return Swal.fire({ icon: 'error', title: 'Duplicado', text: 'El ticket ya existe.' });
      Swal.fire({ icon: 'error', title: 'Error', text: error.message });
    } finally {
      setCargando(false);
    }
  };

  return {
    isEditing, formData, ticket, historial, cargando, catalogos,
    handleChange, handleGuardarCambios, getIconConfig, calcularHorasLaborables
  };
};