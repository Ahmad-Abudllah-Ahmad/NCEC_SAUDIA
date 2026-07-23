export const extractPdfText = async (file: File): Promise<string> => {
  try {
    const pdfjsLib = await import('pdfjs-dist')
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@6.1.200/build/pdf.worker.min.mjs`

    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.1.200/cmaps/',
      cMapPacked: true,
    }).promise

    let fullText = ''
    const numPages = pdf.numPages // extract all pages
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items.map((item: any) => item.str).join(' ')
      fullText += `[Page ${i}]\n${pageText}\n\n`
    }

    return fullText || 'No readable text found in this PDF.'
  } catch (error) {
    console.error('PDF extraction failed:', error)
    throw error
  }
}
