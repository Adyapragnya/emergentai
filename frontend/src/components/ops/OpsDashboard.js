import { useState, useEffect, useCallback } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { JobCard } from './JobCard';
import { VesselFeed } from './VesselFeed';
import { CertExpiryPanel } from './CertExpiryPanel';
import { opsAPI, getFilters } from '@/lib/api';
import { Loader2, Briefcase, Clock, CheckCircle, AlertTriangle, Flag } from 'lucide-react';

const PORTS = ["Mumbai", "Kandla", "Kochi", "Tuticorin", "Chennai", "Vizag", "Mundra"];

export default function OpsDashboard() {
  const [selectedPort, setSelectedPort] = useState('Mumbai');
  const [selectedManager, setSelectedManager] = useState('All');
  const [selectedOwner, setSelectedOwner] = useState('All');
  const [managers, setManagers] = useState([]);
  const [owners, setOwners] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [feed, setFeed] = useState([]);
  const [certs, setCerts] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  const mgr = selectedManager !== 'All' ? selectedManager : null;
  const own = selectedOwner !== 'All' ? selectedOwner : null;

  useEffect(() => {
    getFilters().then(res => {
      setManagers(res.data.managers || []);
      setOwners(res.data.owners || []);
    }).catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [jobsRes, feedRes, certsRes, statsRes] = await Promise.all([
        opsAPI.getJobs(selectedPort, mgr, own),
        opsAPI.getFeed(selectedPort, mgr, own),
        opsAPI.getCertificates(selectedPort, mgr, own),
        opsAPI.getStats(selectedPort, mgr, own),
      ]);
      setJobs(jobsRes.data);
      setFeed(feedRes.data);
      setCerts(certsRes.data);
      setStats(statsRes.data);
    } catch (e) {
      console.error('Failed to fetch ops data:', e);
    }
    setLoading(false);
  }, [selectedPort, mgr, own]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const statItems = [
    { label: 'Total', value: stats.total_jobs, icon: Briefcase, color: 'text-[#0FA390]' },
    { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-amber-400' },
    { label: 'Active', value: stats.in_progress, icon: Loader2, color: 'text-blue-400' },
    { label: 'Done', value: stats.completed, icon: CheckCircle, color: 'text-emerald-400' },
    { label: 'Flagged', value: stats.flagged, icon: Flag, color: 'text-red-400' },
  ];

  return (
    <div className="p-4 lg:p-6" data-testid="ops-dashboard">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading font-bold text-2xl sm:text-3xl">My Day</h1>
          <p className="text-sm text-muted-foreground font-mono">
            {new Date().toLocaleDateString('en-IN', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={selectedPort} onValueChange={setSelectedPort}>
            <SelectTrigger
              className="w-full sm:w-40 bg-secondary border-border"
              data-testid="port-select-ops-trigger"
            >
              <SelectValue placeholder="Select Port" />
            </SelectTrigger>
            <SelectContent>
              {PORTS.map(p => (
                <SelectItem
                  key={p}
                  value={p}
                  data-testid={`port-option-${p.toLowerCase()}`}
                >
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedManager} onValueChange={setSelectedManager}>
            <SelectTrigger
              className="w-full sm:w-44 bg-secondary border-border text-xs"
              data-testid="ops-filter-manager-trigger"
            >
              <SelectValue placeholder="All Managers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Managers</SelectItem>
              {managers.map(m => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedOwner} onValueChange={setSelectedOwner}>
            <SelectTrigger
              className="w-full sm:w-44 bg-secondary border-border text-xs"
              data-testid="ops-filter-owner-trigger"
            >
              <SelectValue placeholder="All Owners" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Owners</SelectItem>
              {owners.map(o => (
                <SelectItem key={o} value={o}>{o}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {statItems.map(s => (
          <Card key={s.label} className="bg-card border-border">
            <CardContent className="p-3 flex items-center gap-3">
              <s.icon className={`w-5 h-5 ${s.color} shrink-0`} />
              <div>
                <p className="font-mono font-bold text-xl leading-none">{s.value ?? 0}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider">
                  {s.label}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Jobs List */}
          <div className="lg:col-span-7">
            <h2 className="font-heading font-semibold text-lg mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary" />
              Jobs ({jobs.length})
            </h2>
            <div className="space-y-3">
              {jobs.length === 0 ? (
                <p className="text-center text-muted-foreground py-12 font-mono text-sm">
                  No jobs scheduled for {selectedPort}
                </p>
              ) : (
                jobs.map((job, i) => (
                  <div
                    key={job.id}
                    className="animate-slide-up"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <JobCard job={job} onUpdate={fetchData} />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Panel */}
          <div className="lg:col-span-5 space-y-6">
            <VesselFeed vessels={feed} />
            <CertExpiryPanel certificates={certs} />
          </div>
        </div>
      )}
    </div>
  );
}
