'use client';

import { useState, useRef } from 'react';
import Swal from 'sweetalert2';
import styles from './PareoView.module.css';
import { procesarPareoAction } from '../actions/pareo.action';

export default function PareoView() {
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);

    setLoading(true);

    try {
      const result = await procesarPareoAction(formData);

      if (result.success && result.data) {
        const linkSource = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${result.data.base64}`;
        const downloadLink = document.createElement('a');
        downloadLink.href = linkSource;
        downloadLink.download = result.data.fileName;
        downloadLink.click();

        Swal.fire({
          icon: 'success',
          title: '¡Pareo Exitoso!',
          html: `
            <div style="text-align: left; font-size: 14px; line-height: 1.6;">
              <p><b>Mantiene:</b> ${result.data.summary.mantiene}</p>
              <p><b>Agregados:</b> ${result.data.summary.agregados}</p>
              <p><b>Eliminados:</b> ${result.data.summary.eliminados}</p>
              <hr style="border-color: #eee; margin: 10px 0;"/>
              <p style="color: #e67e22;"><b>⚠️ Duplicados en Excel:</b> ${result.data.summary.duplicadosExcel}</p>
              <p style="color: #e67e22;"><b>⚠️ Duplicados en BD:</b> ${result.data.summary.duplicadosBD}</p>
            </div>
          `,
          confirmButtonColor: 'var(--primary, #ec5b13)',
        });
        
        formRef.current?.reset();
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error al procesar',
          text: result.error || 'Ocurrió un error desconocido.',
          confirmButtonColor: 'var(--primary, #ec5b13)',
        });
      }
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error Inesperado',
        text: err.message,
        confirmButtonColor: 'var(--primary, #ec5b13)',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        <div className={styles.header}>
          <span className={`material-symbols-outlined ${styles.icon}`}>join_inner</span>
          <h2 className={styles.title}>Panel de Pareo</h2>
        </div>
        <p className={styles.subtitle}>Sincronice su archivo excel local con Google Sheets para aplicar reglas de estandarización automáticas.</p>

        <form ref={formRef} onSubmit={handleSubmit} className={styles.formBox}>
          <div className={styles.formGroup}>
            <label htmlFor="urlGoogleSheet" className={styles.label}>
              URL de Google Sheets (Base de Datos a comparar)
            </label>
            <input
              type="text"
              id="urlGoogleSheet"
              name="urlGoogleSheet"
              className={styles.input}
              placeholder="Ej. https://docs.google.com/spreadsheets/d/..."
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="archivoNuevo" className={styles.label}>
              Reporte Nuevo (Excel / CSV)
            </label>
            <div className={styles.fileInputWrapper}>
               <input
                 type="file"
                 id="archivoNuevo"
                 name="archivoNuevo"
                 className={styles.fileInput}
                 accept=".xlsx, .xls, .csv"
                 required
               />
            </div>
          </div>

          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? (
               <span className={styles.buttonText}>
                 <span className={`material-symbols-outlined ${styles.spin}`}>sync</span>
                 Procesando...
               </span>
            ) : (
               <span className={styles.buttonText}>
                 <span className="material-symbols-outlined">download</span>
                 Comparar y Descargar Resultados
               </span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
