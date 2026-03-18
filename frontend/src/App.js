import { createContext, useContext, useState, useEffect } from 'react';
import '@/App.css';
import { Toaster } from 'sonner';
import { NavigationShell } from '@/components/shared/NavigationShell';
import SalesDashboard from '@/components/sales/SalesDashboard';
import OpsDashboard from '@/components/ops/OpsDashboard';

const DashboardContext = createContext();
export const useDashboard = () => useContext(DashboardContext);

// Currency conversion rate (approximate)
const USD_TO_INR_RATE = 83.5;

// Currency formatter utility
export const formatCurrency = (amount, currency = 'USD') => {
  if (currency === 'USD') {
    // Convert INR to USD (data is stored in INR)
    const usdAmount = amount / USD_TO_INR_RATE;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(usdAmount);
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

function App() {
  const [activeView, setActiveView] = useState('sales');
  const [currency, setCurrency] = useState('USD');

  useEffect(() => {
    if (activeView === 'ops') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [activeView]);

  return (
    <DashboardContext.Provider value={{ activeView, setActiveView, currency, setCurrency }}>
      <div className="min-h-screen bg-background text-foreground">
        <NavigationShell />
        <main>
          {activeView === 'sales' ? <SalesDashboard /> : <OpsDashboard />}
        </main>
        <Toaster
          theme={activeView === 'ops' ? 'dark' : 'light'}
          position="top-right"
          richColors
          closeButton
        />
      </div>
    </DashboardContext.Provider>
  );
}

export default App;
