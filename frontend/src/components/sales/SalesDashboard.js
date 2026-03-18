import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { VesselCard } from './VesselCard';
import { PortSidebar } from './PortSidebar';
import { QuickActions } from './QuickActions';
import { salesAPI, getNotifications, getFilters } from '@/lib/api';
import { Loader2, Ship, AlertTriangle, FileText, UserPlus } from 'lucide-react';
import { useDashboard, formatCurrency } from '@/App';

const PORTS = ["Mumbai", "Kandla", "Kochi", "Tuticorin", "Chennai", "Vizag", "Mundra"];

export default function SalesDashboard() {
  const { currency } = useDashboard();
  const [selectedPorts, setSelectedPorts] = useState([]);
  const [selectedManager, setSelectedManager] = useState('All');
  const [selectedOwner, setSelectedOwner] = useState('All');
  const [selectedCertStatus, setSelectedCertStatus] = useState('All');
  const [managers, setManagers] = useState([]);
  const [owners, setOwners] = useState([]);
  const [activeTab, setActiveTab] = useState('arriving');
  const [vessels, setVessels] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [portCounts, setPortCounts] = useState({});

  const portParam = selectedPorts.length > 0 ? selectedPorts.join(',') : null;
  const mgr = selectedManager !== 'All' ? selectedManager : null;
  const own = selectedOwner !== 'All' ? selectedOwner : null;
  const certStat = selectedCertStatus !== 'All' ? selectedCertStatus : null;

  useEffect(() => {
    getFilters().then(res => {
      setManagers(res.data.managers || []);
      setOwners(res.data.owners || []);
    }).catch(() => {});
    salesAPI.getPortCounts().then(res => setPortCounts(res.data)).catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, notifsRes] = await Promise.all([
        salesAPI.getStats(portParam, mgr, own, certStat),
        getNotifications(),
      ]);
      setStats(statsRes.data);
      setNotifications(notifsRes.data);

      if (activeTab === 'arriving' || activeTab === 'overdue') {
        const res = await salesAPI.getVessels(portParam, activeTab, mgr, own, certStat);
        setVessels(res.data);
      } else if (activeTab === 'quotes') {
        const res = await salesAPI.getQuotes(portParam, mgr, own, certStat);
        setQuotes(res.data);
      } else if (activeTab === 'leads') {
        const res = await salesAPI.getLeads(portParam, mgr, own, certStat);
        setLeads(res.data);
      }
    } catch (e) {
      console.error('Failed to fetch data:', e);
    }
    setLoading(false);
  }, [portParam, activeTab, mgr, own, certStat]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const tabConfig = [
    { key: 'arriving', label: 'Arriving This Week', icon: <Ship className="w-3.5 h-3.5" />, countKey: 'arriving_this_week' },
    { key: 'overdue', label: 'Call Overdue', icon: <AlertTriangle className="w-3.5 h-3.5" />, countKey: 'overdue_calls' },
    { key: 'quotes', label: 'Open Quotes', icon: <FileText className="w-3.5 h-3.5" />, countKey: 'open_quotes' },
    { key: 'leads', label: 'New Leads', icon: <UserPlus className="w-3.5 h-3.5" />, countKey: 'new_leads' },
  ];

  const renderVesselList = (list, emptyMsg) => (
    <div className="space-y-3">
      {list.length === 0 ? (
        <p className="text-center text-muted-foreground py-16 text-sm">{emptyMsg}</p>
      ) : (
        list.map((v, i) => (
          <div key={v.id} className="animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
            <VesselCard vessel={v} onAction={fetchData} />
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="grid grid-cols-12 gap-4 lg:gap-6 p-4 lg:p-6 xl:p-8" data-testid="sales-dashboard">
      {/* Left Sidebar */}
      <aside className="col-span-12 lg:col-span-2">
        <PortSidebar
          ports={PORTS}
          selectedPorts={selectedPorts}
          onPortChange={setSelectedPorts}
          stats={stats}
          managers={managers}
          owners={owners}
          selectedManager={selectedManager}
          selectedOwner={selectedOwner}
          onManagerChange={setSelectedManager}
          onOwnerChange={setSelectedOwner}
          portCounts={portCounts}
          selectedCertStatus={selectedCertStatus}
          onCertStatusChange={setSelectedCertStatus}
        />
      </aside>

      {/* Main Content */}
      <div className="col-span-12 lg:col-span-7">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start bg-secondary/60 mb-4 h-10">
            {tabConfig.map(tab => (
              <TabsTrigger
                key={tab.key}
                value={tab.key}
                data-testid={`tab-${tab.key}`}
                className="flex items-center gap-1.5 text-xs data-[state=active]:bg-background"
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                  {stats[tab.countKey] ?? 0}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <TabsContent value="arriving">
                {renderVesselList(vessels, 'No vessels arriving this week')}
              </TabsContent>

              <TabsContent value="overdue">
                {renderVesselList(vessels, 'No overdue calls — great job!')}
              </TabsContent>

              <TabsContent value="quotes">
                <div className="space-y-3">
                  {quotes.length === 0 ? (
                    <p className="text-center text-muted-foreground py-16 text-sm">No open quotes</p>
                  ) : (
                    quotes.map((q, i) => (
                      <div
                        key={q.id}
                        className="animate-slide-up border border-border rounded-lg p-4 bg-card hover:shadow-sm transition-shadow"
                        style={{ animationDelay: `${i * 50}ms` }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-heading font-semibold">{q.vessel_name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {q.ship_manager} | {q.port}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-heading font-bold text-lg text-primary">
                              {formatCurrency(q.amount, currency)}
                            </p>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                q.status === 'sent'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {q.status.toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-1.5 mt-2">
                          {q.service_types.map(s => (
                            <span
                              key={s}
                              className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="leads">
                <div className="space-y-3">
                  {leads.length === 0 ? (
                    <p className="text-center text-muted-foreground py-16 text-sm">No new leads</p>
                  ) : (
                    leads.map((l, i) => (
                      <div
                        key={l.id}
                        className="animate-slide-up border border-border rounded-lg p-4 bg-card hover:shadow-sm transition-shadow"
                        style={{ animationDelay: `${i * 50}ms` }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-heading font-semibold">{l.vessel_name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {l.ship_manager} | {l.port}
                            </p>
                          </div>
                          <span className="text-[10px] px-2.5 py-1 rounded-full bg-violet-100 text-violet-700 font-medium">
                            {l.source}
                          </span>
                        </div>
                        <div className="flex gap-1.5 mt-2">
                          {l.service_types.map(s => (
                            <span
                              key={s}
                              className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>

      {/* Right Panel */}
      <aside className="col-span-12 lg:col-span-3">
        <QuickActions
          vessels={vessels}
          notifications={notifications}
          onRefresh={fetchData}
        />
      </aside>
    </div>
  );
}
