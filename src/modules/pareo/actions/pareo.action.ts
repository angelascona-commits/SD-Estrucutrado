'use server'

import { processPareoData } from '../services/pareo.service';
import { ActionResult, PareoResponse } from '../interfaces/pareo.interfaces';

export async function procesarPareoAction(
  formData: FormData
): Promise<ActionResult<PareoResponse>> {
  try {
    const urlSheet = formData.get('urlGoogleSheet') as string;
    const file = formData.get('archivoNuevo') as File;

    if (!urlSheet || !file) {
      return { success: false, error: 'Faltan datos (URL o Archivo).' };
    }

    const arrayBuffer = await file.arrayBuffer();

    const data = await processPareoData(urlSheet, arrayBuffer);

    return { success: true, data };
  } catch (error) {
    console.error('Error en procesarPareoAction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al procesar los archivos',
    };
  }
}
