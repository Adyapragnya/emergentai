import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { opsAPI } from '@/lib/api';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { CheckCircle, Play, Flag, ThumbsUp, Clock, MapPin, Wrench, AlertTriangle } from 'lucide-react';
import { formatStatusLabel } from '@/lib/utils';

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  acknowledged: { label: 'Acknowledged', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  in_progress: { label: 'In Progress', color: 'bg-[#0FA390]/20 text-[#0FA390] border-[#0FA390]/30' },
  completed: { label: 'Completed', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  flagged: { label: 'Flagged', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

const certBarColor = (status) => ({
  safe: 'bg-emerald-500', warning: 'bg-amber-500',
  critical: 'bg-red-500', expired: 'bg-red-600',
}[status] || 'bg-gray-500');

const svcColor = (svc) => ({
  LSA: 'bg-teal-900/30 text-teal-400',
  FFA: 'bg-amber-900/30 text-amber-400',
  NAVCOM: 'bg-blue-900/30 text-blue-400',
}[svc] || 'bg-gray-900/30 text-gray-400');

const svcFullName = {
  LSA: 'Life-Saving Appliance Inspection',
  FFA: 'Fire-Fighting Appliance Certification',
  NAVCOM: 'Navigation & Comms Supply',
};

export const JobCard = ({ job, onUpdate }) => {
  const [loading, setLoading] = useState(null);

  const updateStatus = async (newStatus) => {
    setLoading(newStatus);
    try {
      await opsAPI.updateJobStatus(job.id, newStatus);
      toast.success(
        newStatus === 'flagged'
          ? `Issue flagged: ${job.vessel_name}`
          : `Job ${newStatus}: ${job.vessel_name}`
      );
      onUpdate?.();
    } catch (e) {
      toast.error('Failed to update status');
    }
    setLoading(null);
  };

  const eta = new Date(job.eta);
  const etd = new Date(job.etd);
  const config = statusConfig[job.status] || statusConfig.pending;
  const statusLabel = formatStatusLabel(job.status);

  return (
    <Card className="border border-border bg-card overflow-hidden" data-testid={`job-card-${job.id}`}>
      <div className="p-4">
        {/* Time + Status */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-primary" />
            <span className="font-mono text-sm font-bold">{format(eta, 'HH:mm')}</span>
          </div>
          <Badge className={`${config.color} border text-[10px]`}>{statusLabel}</Badge>
        </div>

        {/* Vessel Info */}
        <h3 className="font-heading font-bold text-base mb-0.5">{job.vessel_name}</h3>
        <p className="font-mono text-sm font-semibold text-primary mb-1">
          {job.service_type} — <span className="font-normal text-muted-foreground">{svcFullName[job.service_type]}</span>
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground font-mono mb-3">
          <span>{job.ship_owner} | {job.ship_manager}</span>
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {job.berth}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {format(eta, 'HH:mm')} &rarr; {format(etd, 'HH:mm')}
          </span>
        </div>

        {/* Service Type Badge */}
        <div className="flex items-center gap-2 mb-3">
          <Wrench className="w-3.5 h-3.5 text-primary" />
          <span className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-bold ${svcColor(job.service_type)}`}>
            {job.service_type}
          </span>
          {job.vessel_type && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
              {job.vessel_type}
            </span>
          )}
        </div>

        {/* Cert Expiry Bar */}
        {job.cert_days_remaining !== null && (
          <div className="flex items-center gap-2 text-xs font-mono mb-3">
            <span className="text-muted-foreground w-10">Cert:</span>
            <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
              <div
                className={`h-full rounded-full ${certBarColor(job.cert_status)} ${
                  job.cert_status === 'expired' ? 'animate-urgent' : ''
                }`}
                style={{
                  width: `${Math.max(5, Math.min(100, (job.cert_days_remaining / 90) * 100))}%`,
                }}
              />
            </div>
            <span
              className={`w-14 text-right font-bold ${
                job.cert_status === 'expired' || job.cert_status === 'critical'
                  ? 'text-red-400'
                  : job.cert_status === 'warning'
                    ? 'text-amber-400'
                    : 'text-emerald-400'
              }`}
            >
              {job.cert_days_remaining > 0 ? `${job.cert_days_remaining}d` : 'EXP'}
            </span>
          </div>
        )}

        {/* Next Port */}
        {job.next_port && (
          <div className="flex items-center gap-1.5 text-xs font-mono mb-3">
            <span className="text-muted-foreground">Next:</span>
            <span className={!job.next_port.covered ? 'text-red-400 font-semibold' : 'text-muted-foreground'}>
              {job.next_port.name} ({job.next_port.code})
            </span>
            {!job.next_port.covered && (
              <span className="flex items-center gap-0.5 text-red-400 font-semibold">
                <AlertTriangle className="w-3 h-3" /> Last window
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-3 border-t border-border">
          {job.status === 'pending' && (
            <Button
              size="sm"
              onClick={() => updateStatus('acknowledged')}
              disabled={loading === 'acknowledged'}
              data-testid={`job-acknowledge-btn-${job.id}`}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9 flex-1 min-w-[90px]"
            >
              <ThumbsUp className="w-3 h-3 mr-1" />
              Acknowledge
            </Button>
          )}
          {(job.status === 'pending' || job.status === 'acknowledged') && (
            <Button
              size="sm"
              onClick={() => updateStatus('in_progress')}
              disabled={loading === 'in_progress'}
              data-testid={`job-start-btn-${job.id}`}
              className="bg-[#0FA390] hover:bg-[#0d8f7f] text-black text-xs h-9 flex-1 min-w-[90px]"
            >
              <Play className="w-3 h-3 mr-1" />
              Start Job
            </Button>
          )}
          {job.status === 'in_progress' && (
            <Button
              size="sm"
              onClick={() => updateStatus('completed')}
              disabled={loading === 'completed'}
              data-testid={`job-complete-btn-${job.id}`}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 flex-1 min-w-[90px]"
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              Complete
            </Button>
          )}
          {job.status !== 'completed' && job.status !== 'flagged' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => updateStatus('flagged')}
              disabled={loading === 'flagged'}
              data-testid={`job-flag-btn-${job.id}`}
              className="border-red-500/50 text-red-400 hover:bg-red-500/10 text-xs h-9"
            >
              <Flag className="w-3 h-3 mr-1" />
              Flag
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};
