export const formatCurrency = (n) =>
  '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })

export const formatDate = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const MONTH_NAMES = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']

export const getCurrentMonth = () => {
  const now = new Date()
  return `${MONTH_NAMES[now.getMonth()]}-${String(now.getFullYear()).slice(2)}`
}

// Parse "APR-26" → { month: 3, year: 2026 }
export const parseMonthStr = (str) => {
  if (!str) return { month: new Date().getMonth(), year: new Date().getFullYear() }
  const [m, y] = str.split('-')
  return { month: MONTH_NAMES.indexOf(m.toUpperCase()), year: 2000 + parseInt(y, 10) }
}

// Build "APR-26" from { month: 3, year: 2026 }
export const buildMonthStr = (month, year) =>
  `${MONTH_NAMES[month]}-${String(year).slice(2)}`

export const getMonthOptions = () => {
  const options = []
  const now = new Date()
  for (let i = 0; i < 18; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    options.push(`${MONTH_NAMES[d.getMonth()]}-${String(d.getFullYear()).slice(2)}`)
  }
  return options
}

export const getPaymentBadgeClass = (type) => {
  const map = {
    Cash: 'bg-blue-100 text-blue-700',
    Online: 'bg-cyan-100 text-cyan-700',
    SBI: 'bg-purple-100 text-purple-700',
    Mini: 'bg-orange-100 text-orange-700',
    Vishnu: 'bg-teal-100 text-teal-700',
    Premji: 'bg-pink-100 text-pink-700',
    Bill: 'bg-gray-100 text-gray-700',
    S: 'bg-indigo-100 text-indigo-700',
    Other: 'bg-gray-100 text-gray-700',
  }
  return map[type] || 'bg-gray-100 text-gray-700'
}

export const getRowClass = (balance, amountPaid) => {
  if (balance === 0 && amountPaid > 0) return 'border-l-2 border-l-green-400 bg-green-50/30'
  if (balance > 0 && amountPaid > 0) return 'border-l-2 border-l-amber-400 bg-amber-50/30'
  if (balance > 0 && amountPaid === 0) return 'border-l-2 border-l-red-400 bg-red-50/30'
  return ''
}
