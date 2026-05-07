import { useState, useRef } from 'react'
import { MdUploadFile, MdCheckCircle, MdError, MdClose, MdDownload } from 'react-icons/md'
import * as XLSX from 'xlsx'
import api from '../../utils/api'

/**
 * ImportModal
 *
 * Props:
 *   mode     – "customers" | "billing"
 *   onClose  – close callback
 *   onDone   – called after successful import
 */
export default function ImportModal({ mode, onClose, onDone }) {
  const fileRef = useRef(null)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)   // { rows, warnings }
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(null)  // { done, total, errors }
  const [done, setDone] = useState(false)

  // ── Excel parsing helpers ─────────────────────────────────────────────────

  const excelDateToISO = (val) => {
    if (!val) return null
    if (val instanceof Date) {
      // xlsx.js with cellDates:true creates dates as UTC midnight (Date.UTC(y, m, d)).
      // Always extract UTC date parts so the calendar date is preserved regardless
      // of the browser/server timezone (fixes off-by-one in UTC- zones like Americas).
      const y  = val.getUTCFullYear()
      const m  = String(val.getUTCMonth() + 1).padStart(2, '0')
      const d  = String(val.getUTCDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    }
    if (typeof val === 'number') {
      // Excel serial number — convert via UTC milliseconds
      const d  = new Date(Math.round((val - 25569) * 86400 * 1000))
      const y  = d.getUTCFullYear()
      const mo = String(d.getUTCMonth() + 1).padStart(2, '0')
      const dy = String(d.getUTCDate()).padStart(2, '0')
      return `${y}-${mo}-${dy}`
    }
    // String value (e.g. "01 May 2026", "1-May-2026") — parse and re-format as YYYY-MM-DD
    const str = String(val).trim()
    if (!str) return null
    const parsed = new Date(str)
    if (!isNaN(parsed.getTime())) {
      // new Date(string) parses in local time for most formats, use UTC parts for safety
      const y  = parsed.getUTCFullYear()
      const m  = String(parsed.getUTCMonth() + 1).padStart(2, '0')
      const d  = String(parsed.getUTCDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    }
    return str
  }

  const cleanMobile = (val) => {
    if (!val) return ''
    const s = String(Math.round(Number(val)))
    return s.length >= 10 ? s.slice(-10) : s
  }

  const parseBillingMonth = (sheetName) => {
    // Sheet name like "APR-26" → already correct format
    const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
    if (!sheetName) return null
    const parts = sheetName.toUpperCase().split('-')
    if (MONTHS.includes(parts[0]) && parts[1]) return sheetName.toUpperCase()
    return null
  }

  // Parse uploaded file
  const handleFile = async (e) => {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    setPreview(null)
    setDone(false)
    setProgress(null)

    const buf = await f.arrayBuffer()
    const wb  = XLSX.read(buf, { type: 'array', cellDates: true })

    if (mode === 'customers') {
      parseCustomers(wb)
    } else {
      parseBilling(wb)
    }
  }

  const parseCustomers = (wb) => {
    // Look for CUSTOMER_MASTER sheet, fallback to first sheet
    const sheetName = wb.SheetNames.find(s => s.toUpperCase().includes('CUSTOMER')) || wb.SheetNames[0]
    const ws   = wb.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })

    const warnings = []
    const parsed = []

    rows.forEach((row, i) => {
      // Flexible header matching
      const userId = String(row['USER ID'] || row['USERID'] || row['User ID'] || '').trim()
      const name   = String(row['NAME'] || row['Name'] || '').trim()
      const crf    = String(row['CRF'] || row['CRF NUMBER'] || '').trim()
      const mobile = cleanMobile(row['MOBILE NUMBER'] || row['MOBILE'] || row['Mobile'] || '')
      const createdDate = excelDateToISO(row['CREATED DATE'] || row['DATE'] || null)

      if (!userId || !name) {
        if (userId || name) warnings.push(`Row ${i + 2}: skipped — missing userId or name`)
        return
      }
      if (crf === '#N/A') {
        // ok, just clear it
      }

      parsed.push({
        userId,
        name,
        crfNumber: (crf === '#N/A' || !crf) ? '' : crf,
        mobile,
        registrationDate: createdDate || undefined,
      })
    })

    setPreview({ rows: parsed, warnings, sheetName })
  }

  const parseBilling = (wb) => {
    // Collect all billing-month sheets
    const billingSheets = wb.SheetNames
      .filter(s => parseBillingMonth(s))
      .map(s => ({ sheet: s, month: parseBillingMonth(s) }))

    if (billingSheets.length === 0) {
      setPreview({ rows: [], warnings: ['No billing sheets found (expected sheets like APR-26, MAR-26, etc.)'] })
      return
    }

    const PAYMENT_TYPES = ['Cash','SBI','Online','Mini','Vishnu','Premji','Bill','S','Other']
    const warnings = []
    const parsed   = []

    billingSheets.forEach(({ sheet, month }) => {
      const ws   = wb.Sheets[sheet]
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })

      rows.forEach((row, i) => {
        const userId = String(row['USER ID'] || row['USERID'] || '').trim()
        if (!userId) return

        const payType = String(row['TYPE'] || row['PAYMENT TYPE'] || 'Cash').trim()
        const billNo  = row['BILL NO'] !== undefined ? String(row['BILL NO']).trim() : ''

        // Guard against formula strings (e.g. "=IFERROR(...)") that cannot be coerced to a number
        const safeNum = (v) => { const n = Number(v); return isFinite(n) ? n : 0 }

        const amountBilled = safeNum(row['AMOUNT'])
        const cableRent    = safeNum(row['RENT'])
        const oldBalance   = safeNum(row['OLD BAL'])
        const amountPaid   = safeNum(row['PAID'])
        const balance      = safeNum(row['BALANCE'])

        const billingDate  = excelDateToISO(row['DATE'] || null)
        const paidDate     = excelDateToISO(row['PAID DATE'] || null)

        // Only skip truly empty rows — a userId+plan with zero amounts is a valid zero-billed record
        const plan = String(row['PLAN'] || '').trim()
        if (!amountBilled && !amountPaid && !cableRent && !oldBalance && !plan && !billingDate) {
          warnings.push(`${sheet} row ${i + 2}: skipped — empty row`)
          return
        }

        parsed.push({
          customerUserId: userId,
          month,
          billingDate: billingDate || `20${month.split('-')[1]}-${String(['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'].indexOf(month.split('-')[0]) + 1).padStart(2,'0')}-01`,
          plan: String(row['PLAN'] || '').trim(),
          paymentType: PAYMENT_TYPES.includes(payType) ? payType : 'Other',
          cableRent,
          amountBilled,
          oldBalance,
          amountPaid,
          balance: balance || Math.max(0, oldBalance + amountBilled + cableRent - amountPaid),
          paidDate: paidDate || undefined,
          billNumber: billNo && billNo !== '0' ? billNo : undefined,
          remarks: String(row['REMARK'] || '').trim() || undefined,
        })
      })
    })

    setPreview({ rows: parsed, warnings, sheets: billingSheets.map(s => s.month) })
  }

  // ── Batch import ──────────────────────────────────────────────────────────

  const doImport = async () => {
    if (!preview?.rows?.length) return
    setLoading(true)

    const BATCH = 50
    const rows  = preview.rows
    let done    = 0
    let errors  = 0

    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH)
      try {
        if (mode === 'customers') {
          await api.post('/import/customers', { customers: batch })
        } else {
          await api.post('/import/billing', { records: batch })
        }
        done += batch.length
      } catch (err) {
        errors += batch.length
      }
      setProgress({ done, total: rows.length, errors })
    }

    setLoading(false)
    setDone(true)
    if (onDone) onDone()
  }

  // ── Template download ─────────────────────────────────────────────────────

  const downloadTemplate = () => {
    let headers, sample
    if (mode === 'customers') {
      headers = ['USER ID','NAME','CRF','MOBILE NUMBER','CREATED DATE']
      sample  = [['anjali001','Sample Customer','K13B1410001','9876543210','2024-01-01']]
    } else {
      headers = ['DATE','USER ID','TYPE','PLAN','RENT','AMOUNT','OLD BAL','PAID','BALANCE','PAID DATE','BILL NO','REMARK']
      sample  = [['2026-04-01','anjali001','Cash','FUP50M2000G',0,500,0,500,0,'2026-04-05','AN55001','']]
    }
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sample])
    const wb = XLSX.utils.book_new()
    // For billing, name the sheet as a valid month
    XLSX.utils.book_append_sheet(wb, ws, mode === 'billing' ? 'APR-26' : 'CUSTOMER_MASTER')
    XLSX.writeFile(wb, `template_${mode}.xlsx`)
  }

  // ── UI ────────────────────────────────────────────────────────────────────

  const title = mode === 'customers' ? 'Import Customers' : 'Import Billing Records'

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-xl max-h-[92vh] sm:max-h-[90vh] flex flex-col animate-sheet-up sm:animate-fade-scale"><div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0"><div className="w-10 h-1 bg-gray-300 rounded-full" /></div>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded text-gray-500">
            <MdClose size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Step 1 – pick file */}
          <div>
            <p className="text-sm text-gray-600 mb-3">
              {mode === 'customers'
                ? 'Upload an Excel file with a sheet named CUSTOMER_MASTER (or the first sheet) containing columns: USER ID, NAME, CRF, MOBILE NUMBER, CREATED DATE.'
                : 'Upload an Excel file where each billing month is a separate sheet named like APR-26, MAR-26, etc. Columns: DATE, USER ID, TYPE, PLAN, RENT, AMOUNT, OLD BAL, PAID, BALANCE, PAID DATE, BILL NO, REMARK.'}
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                <MdUploadFile size={18} />
                {file ? 'Change File' : 'Choose Excel File'}
              </button>
              <button
                type="button"
                onClick={downloadTemplate}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                <MdDownload size={16} />
                Template
              </button>
            </div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
            {file && <p className="mt-2 text-xs text-gray-500 mono">{file.name}</p>}
          </div>

          {/* Preview */}
          {preview && (
            <div className="space-y-3">
              {/* Sheet info */}
              {preview.sheets && (
                <div className="text-xs text-gray-500">
                  Found billing sheets: <span className="font-medium">{preview.sheets.join(', ')}</span>
                </div>
              )}

              {/* Warnings */}
              {preview.warnings?.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700 space-y-1 max-h-32 overflow-y-auto">
                  {preview.warnings.slice(0, 20).map((w, i) => <p key={i}>⚠ {w}</p>)}
                  {preview.warnings.length > 20 && <p>…and {preview.warnings.length - 20} more</p>}
                </div>
              )}

              {/* Count */}
              <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
                <MdCheckCircle className="text-green-500" size={18} />
                {preview.rows.length} {mode === 'customers' ? 'customers' : 'billing records'} ready to import
              </div>

              {/* Sample table */}
              {preview.rows.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="text-xs w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        {mode === 'customers'
                          ? ['User ID','Name','Mobile','CRF','Date'].map(h => <th key={h} className="px-2 py-2 text-left text-gray-500 font-medium">{h}</th>)
                          : ['Month','User ID','Plan','Type','Billed','Paid','Balance'].map(h => <th key={h} className="px-2 py-2 text-left text-gray-500 font-medium">{h}</th>)
                        }
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {preview.rows.slice(0, 8).map((r, i) => (
                        <tr key={i}>
                          {mode === 'customers'
                            ? [r.userId, r.name, r.mobile, r.crfNumber, r.registrationDate].map((v, j) => <td key={j} className="px-2 py-1.5 text-gray-700 max-w-[120px] truncate">{v || '—'}</td>)
                            : [r.month, r.customerUserId, r.plan, r.paymentType, `₹${r.amountBilled}`, `₹${r.amountPaid}`, `₹${r.balance}`].map((v, j) => <td key={j} className="px-2 py-1.5 text-gray-700">{v || '—'}</td>)
                          }
                        </tr>
                      ))}
                      {preview.rows.length > 8 && (
                        <tr><td colSpan={7} className="px-2 py-1.5 text-gray-400 text-center">…{preview.rows.length - 8} more rows</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Progress */}
          {progress && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-600">
                <span>Importing…</span>
                <span>{progress.done}/{progress.total}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-600 transition-all duration-300"
                  style={{ width: `${(progress.done / progress.total) * 100}%` }}
                />
              </div>
              {progress.errors > 0 && (
                <p className="text-xs text-red-500">{progress.errors} records failed (duplicates or invalid data)</p>
              )}
            </div>
          )}

          {done && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg p-3">
              <MdCheckCircle size={18} />
              Import complete! {progress?.done || 0} records imported successfully.
              {progress?.errors > 0 && ` ${progress.errors} skipped.`}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={onClose}>
            {done ? 'Close' : 'Cancel'}
          </button>
          {!done && preview?.rows?.length > 0 && (
            <button
              type="button"
              className="btn-primary flex items-center gap-2"
              onClick={doImport}
              disabled={loading}
            >
              {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {loading ? 'Importing…' : `Import ${preview.rows.length} Records`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}