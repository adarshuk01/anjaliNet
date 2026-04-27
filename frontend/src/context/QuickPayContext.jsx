import { createContext, useContext, useState } from 'react'

const QuickPayContext = createContext(null)

export function QuickPayProvider({ children }) {
  const [quickPayCustomer, setQuickPayCustomer] = useState(null) // null = closed, {} = open with customer, 'search' = open at search

  const openQuickPay = (customer = null) => setQuickPayCustomer(customer || 'search')
  const closeQuickPay = () => setQuickPayCustomer(null)

  return (
    <QuickPayContext.Provider value={{ quickPayCustomer, openQuickPay, closeQuickPay }}>
      {children}
    </QuickPayContext.Provider>
  )
}

export function useQuickPay() {
  return useContext(QuickPayContext)
}
