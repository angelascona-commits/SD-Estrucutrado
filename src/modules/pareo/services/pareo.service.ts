import * as XLSX from 'xlsx';
import { PareoResponse } from '../interfaces/pareo.interfaces';

function limpiarTextoBase(texto: any): string {
  if (!texto) return "";
  let t = String(texto).toUpperCase();
  t = t.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); 
  return t.replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim(); 
}

function extraerPalabrasClave(texto: any): string {
  let originalLimpio = limpiarTextoBase(texto);
  if (!originalLimpio) return "";

  const palabrasInnecesarias = [
      "S A C", "SAC", "S R L", "SRL", "E I R L", "EIRL", "S A", "SA", "S C R L", "SCRL", "C I A", "CIA",
      "SEDE", "CLINICA", "CENTRO", "MEDICO", "POLICLINICO", "ODONTOLOGICO", "DENTAL", "CONSULTORIO", 
      "HOSPITAL", "RED", "DE", "LA", "LAS", "LOS", "EL", "Y", "EN", "DEL", "SUCURSAL"
  ];

  let t = originalLimpio;
  const regex = new RegExp('\\b(' + palabrasInnecesarias.join('|') + ')\\b', 'g');
  t = t.replace(regex, ' ').replace(/\s+/g, ' ').trim();

  if (t === "") return originalLimpio;
  return t; 
}

function limpiarDireccion(texto: any): string {
  if (!texto) return "";
  let t = limpiarTextoBase(texto);
  t = t.replace(/\b(AV|AVENIDA|CALLE|CLL|JIRON|JR|MZ|MANZANA|LT|LOTE|N|NO|NRO|NUMERO|URB|URBANIZACION|KM|CARRETERA|PISO|LOCAL|INTERIOR|INT|PZ|PLAZA)\b/g, ' ');
  
  return t.replace(/\s+/g, ' ').trim(); 
}

function coincidenciaSegura(t1: string, t2: string): boolean {
  if (!t1 || !t2) return false;
  if (t1 === t2) return true;
  
  let palabras1 = t1.split(' ');
  let palabras2 = t2.split(' ');

  let t1EnT2 = palabras1.every(palabra => palabras2.includes(palabra));
  let t2EnT1 = palabras2.every(palabra => palabras1.includes(palabra));

  return t1EnT2 || t2EnT1;
}

function estandarizarFila(fila: any): any {
  let filaLimpia: any = { ...fila };
  for (let key in fila) {
      let keyIndestructible = key.toUpperCase().replace(/[^A-Z]/g, ''); 
      filaLimpia[keyIndestructible] = fila[key];
  }
  return filaLimpia;
}

function extraerDatosDinamicos(worksheet: XLSX.WorkSheet): any[] {
  const matrizDatos = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];
  let filaCabecera = 0;
  for (let i = 0; i < matrizDatos.length; i++) {
      let textoFila = matrizDatos[i].join("").toUpperCase().replace(/[^A-Z]/g, '');
      if (textoFila.includes("NOMBRECOMERCIAL") || textoFila.includes("SNOMBRECOMERCIAL")) {
          filaCabecera = i;
          break;
      }
  }
  return XLSX.utils.sheet_to_json(worksheet, { range: filaCabecera, defval: "" });
}

async function obtenerDatosGoogleSheets(url: string): Promise<any[]> {
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) throw new Error("URL de Google Sheets no válida.");
  const id = match[1];
  const urlCsv = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv`;
  const respuesta = await fetch(urlCsv);
  if (!respuesta.ok) throw new Error("No se pudo leer el Google Sheet.");
  const csvTexto = await respuesta.text();
  const workbook = XLSX.read(csvTexto, {type: 'string'});
  return extraerDatosDinamicos(workbook.Sheets[workbook.SheetNames[0]]);
}

function leerExcelBffer(buffer: ArrayBuffer): any[] {
  const workbook = XLSX.read(buffer, {type: 'buffer'});
  return extraerDatosDinamicos(workbook.Sheets[workbook.SheetNames[0]]);
}

export async function processPareoData(urlSheet: string, buffer: ArrayBuffer): Promise<PareoResponse> {
  let dataBaseBruta = await obtenerDatosGoogleSheets(urlSheet);
  let listaBD: any[] = [];
  dataBaseBruta.forEach(fila => {
      let filaEst = estandarizarFila(fila);
      let nombreBD = filaEst['SNOMBRECOMERCIAL'] || filaEst['NOMBRECOMERCIAL']; 
      if (nombreBD) {
          listaBD.push({
              datosOriginales: fila,
              nombreClave: extraerPalabrasClave(nombreBD),
              distrito: limpiarTextoBase(filaEst['SDISTRITO'] || filaEst['DISTRITO']),
              direccionClave: limpiarDireccion(filaEst['SDIRECCION'] || filaEst['DIRECCION'])
          });
      }
  });

  let dataNuevaBruta = leerExcelBffer(buffer);
  let listaNueva: any[] = [];
  dataNuevaBruta.forEach(fila => {
      let filaEst = estandarizarFila(fila);
      let nombre = filaEst['NOMBRECOMERCIAL'];
      if (nombre && limpiarTextoBase(nombre) !== "LIMA Y CALLAO" && limpiarTextoBase(nombre) !== "PROVINCIAS") {
          listaNueva.push({
              datosOriginales: fila,
              nombreClave: extraerPalabrasClave(nombre),
              distrito: limpiarTextoBase(filaEst['DISTRITO']),
              direccionClave: limpiarDireccion(filaEst['DIRECCION'])
          });
      }
  });

  let mantiene: any[] = [];
  let agregados: any[] = [];
  let eliminados: any[] = [];
  let duplicadosExcel: any[] = [];
  let duplicadosBD: any[] = [];

  let firmasProcesadasExcel = new Set<string>();
  let firmasProcesadasBD = new Set<string>();

  for (let i = 0; i < listaNueva.length; i++) {
      let itemNuevo = listaNueva[i];
      let firmaNuevo = itemNuevo.nombreClave + "|" + itemNuevo.distrito; 
      let posibles: number[] = [];

      for (let j = 0; j < listaBD.length; j++) {
          let nomBD = listaBD[j].nombreClave;
          let nomNu = itemNuevo.nombreClave;
          if (coincidenciaSegura(nomBD, nomNu)) {
              posibles.push(j);
          }
      }

      if (posibles.length === 0 && itemNuevo.direccionClave.length > 5) {
          for (let j = 0; j < listaBD.length; j++) {
              let dirBD = listaBD[j].direccionClave;
              let dirNu = itemNuevo.direccionClave;
              if (coincidenciaSegura(dirBD, dirNu)) {
                  posibles.push(j);
              }
          }
      }

      if (posibles.length > 1) {
          let desempateDistrito = posibles.filter(idx => listaBD[idx].distrito === itemNuevo.distrito);
          if (desempateDistrito.length > 0) posibles = desempateDistrito; 
      }

      if (posibles.length > 1) {
          let desempateDireccion = posibles.filter(idx => coincidenciaSegura(listaBD[idx].direccionClave, itemNuevo.direccionClave));
          if (desempateDireccion.length > 0) posibles = desempateDireccion;
      }

      if (posibles.length > 0) {
          let matchFinalIndex = posibles[0];
          let itemBD = listaBD[matchFinalIndex];
          let firmaBD = itemBD.nombreClave + "|" + itemBD.distrito;

          let filaFinal = { ...itemNuevo.datosOriginales, 'ESTADO': 'MANTIENE' };
          mantiene.push(filaFinal);
          
          firmasProcesadasExcel.add(firmaNuevo);
          firmasProcesadasBD.add(firmaBD);

          listaBD.splice(matchFinalIndex, 1); 
      } else {
          if (firmasProcesadasExcel.has(firmaNuevo)) {
              let filaFinal = { ...itemNuevo.datosOriginales, 'ESTADO': 'DUPLICADO EXCEL' };
              duplicadosExcel.push(filaFinal);
          } else {
              let filaFinal = { ...itemNuevo.datosOriginales, 'ESTADO': 'AGREGADO' };
              agregados.push(filaFinal);
              firmasProcesadasExcel.add(firmaNuevo);
          }
      }
  }

  listaBD.forEach(itemBD => {
      let firmaBD = itemBD.nombreClave + "|" + itemBD.distrito;
      
      if (firmasProcesadasBD.has(firmaBD)) {
          let filaFinal = { ...itemBD.datosOriginales, 'ESTADO': 'DUPLICADO BD' };
          duplicadosBD.push(filaFinal);
      } else {
          let filaFinal = { ...itemBD.datosOriginales, 'ESTADO': 'ELIMINADO' };
          eliminados.push(filaFinal);
          firmasProcesadasBD.add(firmaBD);
      }
  });

  let resultadoFinal = [...mantiene, ...agregados, ...eliminados, ...duplicadosExcel, ...duplicadosBD];

  let limaCallaoData = resultadoFinal.filter(f => {
      let d = limpiarTextoBase(f['DEPARTAMENTO'] || f['SDEPARTAMENTO']);
      return d === 'LIMA' || d === 'CALLAO';
  });
  let provinciasData = resultadoFinal.filter(f => {
      let d = limpiarTextoBase(f['DEPARTAMENTO'] || f['SDEPARTAMENTO']);
      return d !== 'LIMA' && d !== 'CALLAO';
  });

  const wb = XLSX.utils.book_new();
  if (limaCallaoData.length > 0) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(limaCallaoData), "LIMA Y CALLAO");
  if (provinciasData.length > 0) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(provinciasData), "PROVINCIAS");

  const outBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  
  return {
      base64: Buffer.from(outBuffer).toString('base64'),
      fileName: 'Reporte_Actualizado.xlsx',
      summary: {
          mantiene: mantiene.length,
          agregados: agregados.length,
          eliminados: eliminados.length,
          duplicadosExcel: duplicadosExcel.length,
          duplicadosBD: duplicadosBD.length
      }
  };
}
