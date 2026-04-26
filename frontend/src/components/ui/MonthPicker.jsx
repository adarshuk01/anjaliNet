import { MdChevronLeft, MdChevronRight } from 'react-icons/md'

// Inline-defined because helpers exports them; duplicate here for safety
const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

/**
 * MonthPicker — renders two <select> dropdowns (month + year) instead of
 * a static hard-coded list. No predefined options; year range is dynamic.
 *
 * Props:
 *   value    – "APR-26" string
 *   onChange – called with new "APR-26" string
 *   showNav  – show prev/next arrow buttons (default true)
 *   minYear  – earliest year (default 2020)
 *   maxYear  – latest year (default current year + 1)
 */
export default function MonthPicker({ value, onChange, showNav = true, minYear, maxYear }) {
  const now = new Date()
  const min = minYear ?? 2020
  const max = maxYear ?? now.getFullYear() + 1

  // Parse current value
  let selMonth = now.getMonth()
  let selYear  = now.getFullYear()
  if (value) {
    const parts = value.split('-')
    const mIdx = MONTHS.indexOf(parts[0]?.toUpperCase())
    if (mIdx !== -1) selMonth = mIdx
    if (parts[1]) selYear = 2000 + parseInt(parts[1], 10)
  }

  const emit = (m, y) => onChange(`${MONTHS[m]}-${String(y).slice(2)}`)

  const navigate = (dir) => {
    let m = selMonth + dir
    let y = selYear
    if (m < 0)  { m = 11; y-- }
    if (m > 11) { m = 0;  y++ }
    if (y < min || y > max) return
    emit(m, y)
  }

  const yearOptions = []
  for (let y = max; y >= min; y--) yearOptions.push(y)

  return (
    <div className="flex items-center gap-1">
      {showNav && (
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-1.5 hover:bg-gray-100 rounded disabled:opacity-30"
          disabled={selMonth === 0 && selYear <= min}
        >
          <MdChevronLeft size={20} />
        </button>
      )}

      {/* Month select */}
      <select
        className="input w-24 text-sm text-center font-medium"
        value={selMonth}
        onChange={e => emit(Number(e.target.value), selYear)}
      >
        {MONTH_LABELS.map((label, idx) => (
          <option key={idx} value={idx}>{label}</option>
        ))}
      </select>

      {/* Year select */}
      <select
        className="input w-20 text-sm text-center font-medium"
        value={selYear}
        onChange={e => emit(selMonth, Number(e.target.value))}
      >
        {yearOptions.map(y => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>

      {showNav && (
        <button
          type="button"
          onClick={() => navigate(1)}
          className="p-1.5 hover:bg-gray-100 rounded disabled:opacity-30"
          disabled={selMonth === 11 && selYear >= max}
        >
          <MdChevronRight size={20} />
        </button>
      )}
    </div>
  )
}