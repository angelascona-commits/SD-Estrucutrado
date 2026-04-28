export interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PareoResultSummary {
  mantiene: number;
  agregados: number;
  eliminados: number;
  duplicadosExcel: number;
  duplicadosBD: number;
}

export interface PareoResponse {
  base64: string;
  fileName: string;
  summary: PareoResultSummary;
}
