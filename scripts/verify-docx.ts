// Temporary verification: build a .docx via the real export code and write it to disk.
import { writeFileSync } from 'node:fs'
import { buildDocxBlob } from '../src/utils/docExport.ts'

const cases: Array<[string, string, string, string]> = [
  ['مذكرة قرار — طلب تصريح منشأة تحلية ينبع', 'NCEC-DM-01', 'Decision Memo', '/tmp/ncec-ar.docx'],
  ['Executive Summary — Red Sea EIA Review', 'NCEC-ES-03', 'Executive Summary', '/tmp/ncec-en.docx'],
]

for (const [title, template, type, out] of cases) {
  const blob = buildDocxBlob(title, template, type)
  const buf = Buffer.from(await blob.arrayBuffer())
  writeFileSync(out, buf)
  console.log(`wrote ${out} (${buf.length} bytes)`)
}
