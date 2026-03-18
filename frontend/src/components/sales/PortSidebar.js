import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Ship, AlertTriangle, PhoneOff, FileText, UserPlus, ShieldAlert, ShieldX, ShieldCheck } from 'lucide-react';

const statItems = [
  { key: 'arriving_this_week', label: 'Arriving', icon: Ship, color: 'text-[#0B7C6E]' },
  { key: 'certificates_expiring', label: 'Certs Expiring', icon: AlertTriangle, color: 'text-amber-500' },
  { key: 'overdue_calls', label: 'Overdue', icon: PhoneOff, color: 'text-red-500' },
  { key: 'open_quotes', label: 'Open Quotes', icon: FileText, color: 'text-blue-500' },
  { key: 'new_leads', label: 'New Leads', icon: UserPlus, color: 'text-violet-500' },
];

const certStatusOptions = [
  { value: 'All', label: 'All Certificates', icon: ShieldCheck, color: 'text-emerald-500' },
  { value: 'expired', label: 'Expired', icon: ShieldX, color: 'text-red-600', countKey: 'cert_expired' },
  { value: 'critical', label: 'Critical (<7 days)', icon: ShieldAlert, color: 'text-red-500', countKey: 'cert_critical' },
  { value: 'warning', label: 'Warning (<30 days)', icon: AlertTriangle, color: 'text-amber-500', countKey: 'cert_warning' },
];

export const PortSidebar = ({
  ports,
  selectedPorts,
  onPortChange,
  stats,
  managers = [],
  owners = [],
  selectedManager = 'All',
  selectedOwner = 'All',
  onManagerChange,
  onOwnerChange,
  portCounts = {},
  selectedCertStatus = 'All',
  onCertStatusChange,
}) => {
  const togglePort = (port) => {
    if (selectedPorts.includes(port)) {
      onPortChange(selectedPorts.filter(p => p !== port));
    } else {
      onPortChange([...selectedPorts, port]);
    }
  };

  return (
    <div className="sticky top-20 space-y-5" data-testid="port-sidebar">
      {/* Port Filter */}
      <div>
        <h2 className="font-heading font-semibold text-xs mb-3 text-muted-foreground tracking-widest uppercase">
          Ports
        </h2>
        <div className="space-y-1">
          {ports.map(port => (
            <label
              key={port}
              className="flex items-center gap-2.5 cursor-pointer hover:bg-accent rounded-md px-2 py-2 transition-colors"
              data-testid={`port-filter-${port.toLowerCase()}`}
            >
              <Checkbox
                checked={selectedPorts.includes(port)}
                onCheckedChange={() => togglePort(port)}
              />
              <span className="text-sm">
                {port}{' '}
                <span className="text-muted-foreground text-xs">({portCounts[port] ?? 0})</span>
              </span>
            </label>
          ))}
        </div>
        {selectedPorts.length > 0 && (
          <button
            className="text-xs text-primary hover:underline mt-2 ml-2"
            onClick={() => onPortChange([])}
            data-testid="clear-port-filter"
          >
            Clear all
          </button>
        )}
      </div>

      <Separator />

      {/* Certificate Status Filter */}
      <div>
        <h2 className="font-heading font-semibold text-xs mb-2 text-muted-foreground tracking-widest uppercase">
          Cert Status
        </h2>
        <div className="space-y-1">
          {certStatusOptions.map(option => (
            <button
              key={option.value}
              onClick={() => onCertStatusChange?.(option.value)}
              className={`w-full flex items-center justify-between px-2 py-2 rounded-md text-sm transition-colors ${
                selectedCertStatus === option.value
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'hover:bg-accent text-muted-foreground'
              }`}
              data-testid={`cert-filter-${option.value.toLowerCase()}`}
            >
              <div className="flex items-center gap-2">
                <option.icon className={`w-3.5 h-3.5 ${option.color}`} />
                <span>{option.label}</span>
              </div>
              {option.countKey && (
                <span className={`text-xs font-mono font-bold ${option.color}`}>
                  {stats[option.countKey] ?? 0}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Manager Filter */}
      <div>
        <h2 className="font-heading font-semibold text-xs mb-2 text-muted-foreground tracking-widest uppercase">
          Manager
        </h2>
        <Select value={selectedManager} onValueChange={onManagerChange}>
          <SelectTrigger className="w-full h-9 text-xs" data-testid="filter-manager-trigger">
            <SelectValue placeholder="All Managers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All" data-testid="filter-manager-all">All Managers</SelectItem>
            {managers.map(m => (
              <SelectItem key={m} value={m} data-testid={`filter-manager-${m}`}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Owner Filter */}
      <div>
        <h2 className="font-heading font-semibold text-xs mb-2 text-muted-foreground tracking-widest uppercase">
          Owner
        </h2>
        <Select value={selectedOwner} onValueChange={onOwnerChange}>
          <SelectTrigger className="w-full h-9 text-xs" data-testid="filter-owner-trigger">
            <SelectValue placeholder="All Owners" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All" data-testid="filter-owner-all">All Owners</SelectItem>
            {owners.map(o => (
              <SelectItem key={o} value={o} data-testid={`filter-owner-${o}`}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Stats */}
      <div>
        <h2 className="font-heading font-semibold text-xs mb-3 text-muted-foreground tracking-widest uppercase">
          Overview
        </h2>
        <div className="space-y-3">
          {statItems.map(item => (
            <div key={item.key} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
                <span className="text-xs text-muted-foreground">{item.label}</span>
              </div>
              <span className="font-heading font-bold text-lg leading-none">
                {stats[item.key] ?? 0}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
