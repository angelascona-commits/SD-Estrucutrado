'use client'

import type { ServiceDeskReportData } from '@/modules/service-desk/interfaces/report.interfaces'

export async function exportServiceDeskReportToPdf(elementId: string) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ])

  const element = document.getElementById(elementId)
  if (!element) return

  const canvas = await html2canvas(element, {
    scale: 2.2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
  })

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true,
  })

  const margin = 8
  const pageWidth = pdf.internal.pageSize.getWidth() - margin * 2
  const pageHeight = pdf.internal.pageSize.getHeight() - margin * 2

  const sliceHeightPx = Math.floor((pageHeight * canvas.width) / pageWidth)
  let renderedHeight = 0
  let pageIndex = 0

  while (renderedHeight < canvas.height) {
    const currentSliceHeight = Math.min(sliceHeightPx, canvas.height - renderedHeight)
    const pageCanvas = document.createElement('canvas')
    pageCanvas.width = canvas.width
    pageCanvas.height = currentSliceHeight

    const ctx = pageCanvas.getContext('2d')
    if (!ctx) break

    ctx.drawImage(
      canvas,
      0,
      renderedHeight,
      canvas.width,
      currentSliceHeight,
      0,
      0,
      canvas.width,
      currentSliceHeight
    )

    const imgData = pageCanvas.toDataURL('image/png')
    const renderedHeightMm = (currentSliceHeight * pageWidth) / canvas.width

    if (pageIndex > 0) {
      pdf.addPage()
    }

    pdf.addImage(imgData, 'PNG', margin, margin, pageWidth, renderedHeightMm)
    renderedHeight += currentSliceHeight
    pageIndex += 1
  }

  pdf.save('service-desk-report.pdf')
}

export async function exportServiceDeskReportToExcel(
  report: ServiceDeskReportData,
  chartRootId: string
) {
  const [{ Workbook }, { default: html2canvas }] = await Promise.all([
    import('exceljs'),
    import('html2canvas'),
  ])

  const workbook = new Workbook()
  workbook.creator = 'SGEM'
  workbook.created = new Date()

  const summarySheet = workbook.addWorksheet('Resumen')
  summarySheet.columns = [
    { header: 'Métrica', key: 'metric', width: 35 },
    { header: 'Valor', key: 'value', width: 22 },
  ]

  summarySheet.addRows([
    { metric: 'Tickets del período', value: report.summary.totalTickets },
    { metric: 'Promedio asignación (hrs)', value: report.summary.avgAsignacionHoras ?? '' },
    { metric: 'Fuera SLA asignación (%)', value: report.summary.porcentajeFueraSlaAsignacion },
    { metric: 'Promedio margen atención (hrs)', value: report.summary.avgTiempoLimiteHoras ?? '' },
    { metric: 'Margen insuficiente (%)', value: report.summary.porcentajeMargenInsuficiente },
    { metric: 'Promedio resolución (días)', value: report.summary.avgResolucionDias ?? '' },
    { metric: 'Preset aplicado', value: report.applied.preset },
    { metric: 'Agrupación', value: report.applied.groupBy },
    { metric: 'Fecha inicio', value: report.applied.start ?? '' },
    { metric: 'Fecha fin', value: report.applied.end ?? '' },
  ])

  const trendSheet = workbook.addWorksheet('Tendencia')
  trendSheet.columns = [
    { header: 'Período', key: 'label', width: 24 },
    { header: 'Total tickets', key: 'totalTickets', width: 16 },
    { header: 'Prom. asignación (hrs)', key: 'avgAsignacionHoras', width: 20 },
    { header: 'Fuera SLA (%)', key: 'porcentajeFueraSlaAsignacion', width: 16 },
    { header: 'Prom. margen (hrs)', key: 'avgTiempoLimiteHoras', width: 20 },
    { header: 'Margen insuficiente (%)', key: 'porcentajeMargenInsuficiente', width: 22 },
    { header: 'Prom. resolución (días)', key: 'avgResolucionDias', width: 22 },
  ]

  trendSheet.addRows(report.trendSeries)

  const statusSheet = workbook.addWorksheet('Estados')
  statusSheet.columns = [
    { header: 'Estado', key: 'label', width: 28 },
    { header: 'Total', key: 'value', width: 14 },
  ]
  statusSheet.addRows(report.byStatus)

  const responsibleSheet = workbook.addWorksheet('Responsables')
  responsibleSheet.columns = [
    { header: 'Responsable', key: 'label', width: 32 },
    { header: 'Total', key: 'value', width: 14 },
  ]
  responsibleSheet.addRows(report.byResponsible)

  const applicationSheet = workbook.addWorksheet('Aplicaciones')
  applicationSheet.columns = [
    { header: 'Aplicación', key: 'label', width: 32 },
    { header: 'Total', key: 'value', width: 14 },
  ]
  applicationSheet.addRows(report.byApplication)

  const detailSheet = workbook.addWorksheet('Detalle')
  detailSheet.columns = [
    { header: 'ID', key: 'id', width: 10 },
    { header: 'SD', key: 'numero_ticket', width: 14 },
    { header: 'Estado', key: 'estado', width: 24 },
    { header: 'Descripción', key: 'descripcion', width: 48 },
    { header: 'Aplicación', key: 'aplicacion', width: 24 },
    { header: 'Designado', key: 'designado_a', width: 24 },
    { header: 'F. Asignación', key: 'fecha_asignacion', width: 24 },
    { header: 'F. Creación SD', key: 'fecha_creacion_sd', width: 24 },
    { header: 't. Asignación (hrs)', key: 'tAreaAsignacionHoras', width: 18 },
    { header: 'Tiempo límite (hrs)', key: 'tiempoLimiteHoras', width: 18 },
    { header: 'Resolución (días)', key: 'resolucionDias', width: 18 },
  ]

  detailSheet.addRows(report.table.data)

  const chartsElement = document.getElementById(chartRootId)
  if (chartsElement) {
    const chartsCanvas = await html2canvas(chartsElement, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: chartsElement.scrollWidth,
      windowHeight: chartsElement.scrollHeight,
    })

    const chartsSheet = workbook.addWorksheet('Gráficos')
    const imageId = workbook.addImage({
      base64: chartsCanvas.toDataURL('image/png'),
      extension: 'png',
    })

    chartsSheet.addImage(imageId, {
      tl: { col: 0, row: 0 },
      ext: {
        width: 1200,
        height: Math.round((1200 * chartsCanvas.height) / chartsCanvas.width),
      },
    })
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'service-desk-report.xlsx'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}