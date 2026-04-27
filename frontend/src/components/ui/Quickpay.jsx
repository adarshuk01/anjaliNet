import { useState, useRef, useEffect, useCallback } from 'react'
import { MdClose, MdSearch, MdCheckCircle, MdPayments, MdArrowBack } from 'react-icons/md'
import api from '../../utils/api'
import { formatCurrency, formatDate, openWhatsApp } from '../../utils/helpers'

const PAYMENT_TYPES = ['Cash', 'SBI', 'Online', 'Mini', 'Vishnu', 'Premji', 'Bill', 'S', 'Other']

export default function QuickPay({ onClose, onDone, initialCustomer = null }) {
  const [step, setStep] = useState(initialCustomer ? 'bills' : 'search')
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState([])
  const [customer, setCustomer] = useState(initialCustomer)
  const [bills, setBills] = useState([])
  const [loadingBills, setLoadingBills] = useState(false)
  const [selectedBill, setSelectedBill] = useState(null)
  const [payAmount, setPayAmount] = useState('')
  const [payType, setPayType] = useState('Cash')
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0])
  // ✅ FIXED: track paying per bill ID instead of a single boolean
  const [payingId, setPayingId] = useState(null)
  const [paid, setPaid] = useState(null)
  const [error, setError] = useState('')

  const searchRef = useRef(null)
  const debounceRef = useRef(null)

  useEffect(() => {
    if (initialCustomer) {
      // Auto-load bills for the pre-selected customer
      loadBillsForCustomer(initialCustomer)
    } else {
      searchRef.current?.focus()
    }
  }, [])

  const loadBillsForCustomer = async (c) => {
    setLoadingBills(true)
    setBills([])
    setPaid(null)
    setError('')
    try {
      const { data } = await api.get(
        `/billing?search=${encodeURIComponent(c.userId)}&status=unpaid&limit=50`
      )
      const unpaid = (data.records || []).filter(r => r.balance > 0)

      const { data: partData } = await api.get(
        `/billing?search=${encodeURIComponent(c.userId)}&status=partial&limit=50`
      )
      const partial = (partData.records || []).filter(r => r.balance > 0)

      const seen = new Set()
      const merged = [...unpaid, ...partial].filter(r => {
        if (seen.has(r._id)) return false
        seen.add(r._id)
        return true
      }).sort((a, b) => new Date(a.billingDate) - new Date(b.billingDate))

      setBills(merged)
    } catch {
      setError('Failed to load bills')
    } finally {
      setLoadingBills(false)
    }
  }

  const doSearch = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); return }
    setSearching(true)
    try {
      const { data } = await api.get(`/customers?search=${encodeURIComponent(q)}&limit=8`)
      setResults(data.customers || [])
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }, [])

  const handleQueryChange = (e) => {
    const q = e.target.value
    setQuery(q)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(q), 280)
  }

  const selectCustomer = async (c) => {
    setCustomer(c)
    setStep('bills')
    await loadBillsForCustomer(c)
  }

  const openPay = (bill) => {
    setSelectedBill(bill)
    setPayAmount(String(bill.balance))
    setPayType('Cash')
    setPayDate(new Date().toISOString().split('T')[0])
    setError('')
    setStep('pay')
  }

  // ✅ FIXED: uses selectedBill._id as the payingId key
  const recordPayment = async () => {
    const amount = Number(payAmount)
    if (!amount || amount <= 0) { setError('Enter a valid amount'); return }
    if (amount > selectedBill.balance) { setError(`Max payable is ${formatCurrency(selectedBill.balance)}`); return }

    setPayingId(selectedBill._id)
    setError('')
    try {
      await api.post(`/billing/${selectedBill._id}/pay`, {
        amountPaid: (selectedBill.amountPaid || 0) + amount,
        paymentType: payType,
        paidDate: payDate,
      })
      setPaid({ ...selectedBill, paidNow: amount })
      setBills(prev => prev
        .map(b => b._id === selectedBill._id
          ? { ...b, amountPaid: (b.amountPaid || 0) + amount, balance: b.balance - amount }
          : b
        )
        .filter(b => b.balance > 0)
      )
      setStep('bills')
      if (onDone) onDone()
    } catch (err) {
      setError(err.response?.data?.message || 'Payment failed')
    } finally {
      setPayingId(null)
    }
  }

  // ✅ FIXED: uses bill._id as the payingId key so only that row shows spinner
  const quickFullPay = async (bill) => {
    setPayingId(bill._id)
    setError('')
    try {
      await api.post(`/billing/${bill._id}/pay`, {
        amountPaid: (bill.amountPaid || 0) + bill.balance,
        paymentType: 'Cash',
        paidDate: new Date().toISOString().split('T')[0],
      })
      setPaid({ ...bill, paidNow: bill.balance })
      setBills(prev => prev.filter(b => b._id !== bill._id))
      if (onDone) onDone()
    } catch {
      setError('Payment failed')
    } finally {
      setPayingId(null)
    }
  }

  const totalDue = bills.reduce((s, b) => s + (b.balance || 0), 0)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-gray-100">
          {step !== 'search' && (
            <button
              onClick={() => step === 'pay' ? setStep('bills') : (initialCustomer ? onClose() : (setStep('search'), setCustomer(null), setBills([])))}
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"
            >
              <MdArrowBack size={20} />
            </button>
          )}
          <div className="flex-1">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <MdPayments className="text-brand-700" size={20} />
              Quick Pay
            </h2>
            {customer && (
              <p className="text-xs text-gray-500 mt-0.5">
                {customer.name} <span className="mono text-gray-400">· {customer.userId}</span>
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500">
            <MdClose size={20} />
          </button>
        </div>

        {/* Success flash */}
        {paid && (
          <div className="mx-4 mt-3 flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-2.5 text-sm">
            <MdCheckCircle size={18} className="flex-shrink-0" />
            <span className="flex-1"><strong>{formatCurrency(paid.paidNow)}</strong> collected for {paid.month}</span>
            {(customer?.whatsapp || customer?.mobile) && (
              <button
                onClick={() => {
                  const phone = customer.whatsapp || customer.mobile
                  const msg = `Dear ${customer.name}, we received ${formatCurrency(paid.paidNow)} for ${paid.month}. Thank you!`
                  openWhatsApp(phone, msg)
                }}
                className="flex items-center gap-1 text-xs font-medium text-green-800 bg-green-100 hover:bg-green-200 px-2 py-1 rounded-lg transition-colors flex-shrink-0"
                title="Send WhatsApp receipt"
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Notify
              </button>
            )}
          </div>
        )}

        {/* STEP: search */}
        {step === 'search' && (
          <div className="flex-1 flex flex-col overflow-hidden p-4 gap-3">
            <div className="relative">
              <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                ref={searchRef}
                className="input pl-9 text-base"
                placeholder="Name, User ID, or Mobile..."
                value={query}
                onChange={handleQueryChange}
                autoComplete="off"
              />
              {searching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
              )}
            </div>

            <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-1">
              {results.length === 0 && query.length > 1 && !searching && (
                <p className="text-center text-sm text-gray-400 mt-8">No customers found</p>
              )}
              {results.map(c => (
                <button
                  key={c._id}
                  onClick={() => selectCustomer(c)}
                  className="w-full flex items-center gap-3 px-3 py-3 hover:bg-brand-50 active:bg-brand-100 rounded-xl text-left transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                    {c.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{c.name}</p>
                    <p className="text-xs text-gray-400 mono">{c.userId} {c.mobile ? `· ${c.mobile}` : ''}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {c.isActive ? 'Active' : 'Inactive'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP: bills */}
        {step === 'bills' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {bills.length > 0 && (
              <div className="flex items-center justify-between px-4 py-2 bg-red-50 border-b border-red-100">
                <p className="text-xs text-red-600 font-medium">{bills.length} outstanding bill{bills.length > 1 ? 's' : ''}</p>
                <p className="text-sm font-bold text-red-700">{formatCurrency(totalDue)} due</p>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingBills && (
                <div className="flex justify-center mt-8">
                  <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {!loadingBills && bills.length === 0 && (
                <div className="flex flex-col items-center mt-8 gap-2 text-gray-400">
                  <MdCheckCircle size={40} className="text-green-400" />
                  <p className="text-sm font-medium text-green-700">All bills cleared!</p>
                  <p className="text-xs">No outstanding dues for {customer?.name}</p>
                </div>
              )}

              {error && <p className="text-xs text-red-500 text-center">{error}</p>}

              {bills.map(bill => {
                const isPartial = bill.amountPaid > 0 && bill.balance > 0
                // ✅ FIXED: each bill checks its own ID against payingId
                const isThisBillPaying = payingId === bill._id

                return (
                  <div
                    key={bill._id}
                    className={`rounded-xl border p-4 space-y-3 ${isPartial ? 'border-amber-200 bg-amber-50/40' : 'border-red-200 bg-red-50/30'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-gray-900">{bill.month}</span>
                          {bill.plan && (
                            <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">{bill.plan}</span>
                          )}
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${isPartial ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                            {isPartial ? 'Partial' : 'Unpaid'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {formatDate(bill.billingDate)}{bill.billNumber ? ` · ${bill.billNumber}` : ''}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-lg font-bold text-red-600">{formatCurrency(bill.balance)}</p>
                        <p className="text-xs text-gray-400">due</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="bg-white rounded-lg py-1.5 border border-gray-100">
                        <p className="font-semibold text-gray-800">{formatCurrency(bill.amountBilled)}</p>
                        <p className="text-gray-400">Billed</p>
                      </div>
                      <div className="bg-white rounded-lg py-1.5 border border-gray-100">
                        <p className="font-semibold text-amber-600">{formatCurrency(bill.oldBalance)}</p>
                        <p className="text-gray-400">Old Bal</p>
                      </div>
                      <div className="bg-white rounded-lg py-1.5 border border-gray-100">
                        <p className="font-semibold text-green-600">{formatCurrency(bill.amountPaid)}</p>
                        <p className="text-gray-400">Paid</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {/* ✅ FIXED: disabled only when THIS bill is paying */}
                      <button
                        onClick={() => openPay(bill)}
                        disabled={isThisBillPaying}
                        className="flex-1 btn-secondary text-xs py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Custom Amount
                      </button>
                      <button
                        onClick={() => quickFullPay(bill)}
                        disabled={isThisBillPaying}
                        className="flex-1 btn-primary text-xs py-2 flex items-center justify-center gap-1 disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        {/* ✅ FIXED: spinner only on the bill being paid */}
                        {isThisBillPaying ? (
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <MdCheckCircle size={15} />
                        )}
                        {isThisBillPaying ? 'Paying…' : `Pay ${formatCurrency(bill.balance)}`}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* STEP: pay (custom amount) */}
        {step === 'pay' && selectedBill && (
          <div className="flex-1 flex flex-col overflow-hidden p-4 gap-4">
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-gray-900">{selectedBill.month}</p>
                  {selectedBill.plan && <p className="text-xs text-blue-600">{selectedBill.plan}</p>}
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-red-600">{formatCurrency(selectedBill.balance)}</p>
                  <p className="text-xs text-gray-400">outstanding</p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Amount to Collect (₹)</label>
              <input
                type="number"
                inputMode="numeric"
                className="input text-2xl font-bold text-center py-4 tracking-wide"
                value={payAmount}
                onChange={e => setPayAmount(e.target.value)}
                placeholder="0"
                min={1}
                max={selectedBill.balance}
              />
              <div className="flex gap-2 mt-2 flex-wrap">
                {[selectedBill.balance, 500, 1000, 200]
                  .filter((v, i, a) => v > 0 && a.indexOf(v) === i)
                  .map(amt => (
                    <button
                      key={amt}
                      onClick={() => setPayAmount(String(Math.min(amt, selectedBill.balance)))}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        Number(payAmount) === Math.min(amt, selectedBill.balance)
                          ? 'bg-brand-800 text-white border-brand-800'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-brand-600'
                      }`}
                    >
                      {amt === selectedBill.balance ? `Full ${formatCurrency(amt)}` : formatCurrency(amt)}
                    </button>
                  ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Payment Method</label>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_TYPES.map(t => (
                  <button
                    key={t}
                    onClick={() => setPayType(t)}
                    className={`py-2 px-2 rounded-lg text-xs font-medium border transition-colors ${
                      payType === t
                        ? 'bg-brand-800 text-white border-brand-800'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-brand-400'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Payment Date</label>
              <input
                type="date"
                className="input"
                value={payDate}
                onChange={e => setPayDate(e.target.value)}
              />
            </div>

            {error && <p className="text-xs text-red-500 text-center -mt-2">{error}</p>}

            {/* ✅ FIXED: confirm button checks selectedBill._id */}
            <button
              onClick={recordPayment}
              disabled={payingId === selectedBill._id || !payAmount || Number(payAmount) <= 0}
              className="btn-primary w-full py-4 text-base font-semibold flex items-center justify-center gap-2 rounded-xl disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {payingId === selectedBill._id ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <MdCheckCircle size={20} />
              )}
              {payingId === selectedBill._id
                ? 'Recording…'
                : `Collect ${payAmount ? formatCurrency(Number(payAmount)) : '₹0'}`}
            </button>

            {(customer?.whatsapp || customer?.mobile) && (
              <button
                type="button"
                onClick={() => {
                  const phone = customer.whatsapp || customer.mobile
                  const msg = `Dear ${customer.name}, your bill for ${selectedBill.month} has an outstanding balance of ${formatCurrency(selectedBill.balance)}. Please pay at the earliest. Thank you.`
                  openWhatsApp(phone, msg)
                }}
                className="w-full py-2.5 rounded-xl border border-green-300 text-green-700 bg-green-50 hover:bg-green-100 text-sm font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Send Due Notice via WhatsApp
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}