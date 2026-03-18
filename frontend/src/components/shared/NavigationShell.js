import { useState, useEffect } from 'react';
import { useDashboard } from '@/App';
import { Bell, RefreshCw, Anchor, X, DollarSign, IndianRupee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getNotifications, markNotificationRead, seedData } from '@/lib/api';
import { toast } from 'sonner';

export const NavigationShell = () => {
  const { activeView, setActiveView, currency, setCurrency } = useDashboard();
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  const fetchNotifs = async () => {
    try {
      const res = await getNotifications();
      setNotifications(res.data);
    } catch (e) { /* silent */ }
  };

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seedData();
      toast.success('Data refreshed with new seed');
      window.location.reload();
    } catch (e) {
      toast.error('Failed to refresh data');
    }
    setSeeding(false);
  };

  const markRead = async (id) => {
    await markNotificationRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const getSeverityColor = (severity) => {
    if (severity === 'critical' || severity === 'expired') return 'text-red-500';
    if (severity === 'warning') return 'text-amber-500';
    return 'text-emerald-500';
  };

  return (
    <nav
      className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-md"
      data-testid="navigation-shell"
    >
      <div className="flex items-center justify-between px-4 lg:px-8 h-16">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <Anchor className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="hidden sm:block">
            <h1 className="font-heading text-lg font-bold tracking-tight leading-none">
              Ch16.ai
            </h1>
            <p className="text-[10px] text-muted-foreground tracking-widest uppercase">
              AS Moloobhoy
            </p>
          </div>
        </div>

        {/* Toggle */}
        <div
          className="flex items-center bg-secondary rounded-full p-1"
          data-testid="dashboard-toggle"
        >
          <button
            data-testid="nav-toggle-sales"
            onClick={() => setActiveView('sales')}
            className={`px-5 py-1.5 rounded-full text-sm font-heading font-semibold tracking-wide transition-all duration-200 ${
              activeView === 'sales'
                ? 'bg-[#0B7C6E] text-white shadow-md'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            SALES
          </button>
          <button
            data-testid="nav-toggle-ops"
            onClick={() => setActiveView('ops')}
            className={`px-5 py-1.5 rounded-full text-sm font-heading font-semibold tracking-wide transition-all duration-200 ${
              activeView === 'ops'
                ? 'bg-[#0FA390] text-black shadow-md'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            OPS
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Currency Selector */}
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger 
              className="w-24 h-9 text-xs bg-secondary border-border"
              data-testid="currency-selector-trigger"
            >
              <SelectValue>
                <span className="flex items-center gap-1.5">
                  {currency === 'USD' ? (
                    <DollarSign className="w-3.5 h-3.5" />
                  ) : (
                    <IndianRupee className="w-3.5 h-3.5" />
                  )}
                  {currency}
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD" data-testid="currency-option-usd">
                <span className="flex items-center gap-2">
                  <DollarSign className="w-3.5 h-3.5" />
                  USD
                </span>
              </SelectItem>
              <SelectItem value="INR" data-testid="currency-option-inr">
                <span className="flex items-center gap-2">
                  <IndianRupee className="w-3.5 h-3.5" />
                  INR
                </span>
              </SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleSeed}
            disabled={seeding}
            data-testid="seed-data-btn"
            title="Refresh seed data"
          >
            <RefreshCw className={`w-4 h-4 ${seeding ? 'animate-spin' : ''}`} />
          </Button>

          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowNotifs(!showNotifs)}
              data-testid="nav-notifications-btn"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>

            {showNotifs && (
              <div
                className="absolute right-0 top-12 w-80 bg-card border border-border rounded-lg shadow-xl z-50"
                data-testid="notifications-panel"
              >
                <div className="flex items-center justify-between p-3 border-b border-border">
                  <span className="font-heading font-semibold text-sm">
                    Notifications ({unreadCount})
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setShowNotifs(false)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
                <ScrollArea className="max-h-72">
                  {notifications.length === 0 ? (
                    <p className="p-4 text-sm text-muted-foreground text-center">
                      No notifications
                    </p>
                  ) : (
                    notifications.slice(0, 15).map(n => (
                      <div
                        key={n.id}
                        className={`p-3 border-b border-border/50 hover:bg-muted/50 cursor-pointer transition-colors ${
                          !n.read ? 'bg-accent/50' : ''
                        }`}
                        onClick={() => markRead(n.id)}
                      >
                        <p className={`text-[10px] font-semibold uppercase tracking-wider ${getSeverityColor(n.severity)}`}>
                          {n.type === 'cert_expiry' ? 'Certificate Alert' : 'Update'}
                        </p>
                        <p className="text-sm mt-0.5 leading-snug">{n.message}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">{n.port}</p>
                      </div>
                    ))
                  )}
                </ScrollArea>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
