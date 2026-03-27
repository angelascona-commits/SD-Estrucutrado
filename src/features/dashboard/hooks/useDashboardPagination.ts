"use client";
export const useDashboardPagination = <T,>(data: T[], size: number) => {
  return {
    paginado: data.slice(0, size),
  };
};