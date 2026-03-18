import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Phone, FileText, UserCheck, StickyNote, MapPin, Clock } from 'lucide-react';
import { salesAPI } from '@/lib/api';
import { toast } from 'sonner';
import { format } from 'date-fns';

const serviceColors = {
  LSA: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  FFA: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  NAVCOM: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

const certBarColor = (status) => ({
  safe: 'bg-emerald-500', warning: 'bg-amber-500',
  critical: 'bg-red-500', expired: 'bg-red-600',
}[status] || 'bg-gray-400');

const certTextColor = (status) => ({
  safe: 'text-emerald-600 dark:text-emerald-400',
  warning: 'text-amber-600 dark:text-amber-400',
  critical: 'text-red-600 dark:text-red-400',
  expired: 'text-red-600 dark:text-red-400 font-bold',
}[status] || 'text-gray-500');

const borderColor = (certs) => {
  if (certs?.some(c => c.status === 'expired')) return 'border-l-red-500';
  if (certs?.some(c => c.status === 'critical')) return 'border-l-red-400';
  if (certs?.some(c => c.status === 'warning')) return 'border-l-amber-400';
  return 'border-l-[#0B7C6E]';
};

export const VesselCard = ({ vessel, onAction }) => {
  const [noteText, setNoteText] = useState('');
  const [noteOpen, setNoteOpen] = useState(false);
  const [loading, setLoading] = useState(null);

  const handleAction = async (action) => {
    setLoading(action);
    try {
      if (action === 'call') {
        await salesAPI.markCalled(vessel.id);
        toast.success(`Call logged for ${vessel.name}`);
      } else if (action === 'quote') {
        await salesAPI.createQuote(vessel.id);
        toast.success(`Quote created for ${vessel.name}`);
      } else if (action === 'assign') {
        await salesAPI.assignEngineer(vessel.id, 'Field Team');
        toast.success(`Engineer assigned to ${vessel.name}`);
      }
      onAction?.();
    } catch (e) {
      toast.error(`Action failed`);
    }
    setLoading(null);
  };

  const handleNote = async () => {
    if (!noteText.trim()) return;
    try {
      await salesAPI.addNote(vessel.id, noteText);
      toast.success('Note added');
      setNoteText('');
      setNoteOpen(false);
      onAction?.();
    } catch (e) {
      toast.error('Failed to add note');
    }
  };

  const etaDate = new Date(vessel.eta);

  return (
    <Card
      className={`border-l-4 ${borderColor(vessel.certificates)} hover:shadow-md transition-all duration-200`}
      data-testid={`vessel-card-${vessel.id}`}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-heading font-bold text-base leading-snug">{vessel.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {vessel.ship_owner} | {vessel.ship_manager}
            </p>
            {vessel.gross_tonnage && (
              <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                GT {vessel.gross_tonnage?.toLocaleString()} · DWT {vessel.dwt?.toLocaleString()} · Built {vessel.year_built}
              </p>
            )}
          </div>
          <Badge
            className={`text-[10px] border-0 shrink-0 ${
              vessel.relationship === 'existing'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
            }`}
          >
            {vessel.relationship === 'existing' ? 'Customer' : 'New Lead'}
          </Badge>
        </div>

        {/* Info row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground mb-3">
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {vessel.port}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            ETA: {format(etaDate, 'MMM dd, HH:mm')}
          </span>
          <span>Berth: {vessel.berth}</span>
          {vessel.call_status === 'called' && (
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Called</span>
          )}
          {vessel.call_status === 'overdue' && (
            <span className="text-red-600 dark:text-red-400 font-semibold">Overdue</span>
          )}
        </div>

        {/* Service tags + vessel type */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {vessel.service_types.map(s => (
            <span
              key={s}
              className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${serviceColors[s]}`}
            >
              {s}
            </span>
          ))}
          {vessel.vessel_type && (
            <span className="text-[11px] px-2.5 py-0.5 rounded-full font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {vessel.vessel_type}
            </span>
          )}
        </div>

        {/* Cert expiry bars */}
        <div className="space-y-1.5 mb-3">
          {vessel.certificates?.map(cert => (
            <div key={cert.type} className="flex items-center gap-2 text-xs">
              <span className="w-14 font-medium text-muted-foreground">{cert.type}</span>
              <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${certBarColor(cert.status)} ${
                    cert.status === 'expired' ? 'animate-urgent' : ''
                  }`}
                  style={{
                    width: `${Math.max(5, Math.min(100, (cert.days_remaining / 90) * 100))}%`,
                  }}
                />
              </div>
              <span className={`w-16 text-right ${certTextColor(cert.status)}`}>
                {cert.days_remaining > 0 ? `${cert.days_remaining}d` : 'EXPIRED'}
              </span>
            </div>
          ))}
        </div>

        {/* Next Port */}
        {vessel.next_port && (
          <p className="text-[11px] font-mono text-muted-foreground mb-3">
            Next: {vessel.next_port.name} ({vessel.next_port.code})
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleAction('call')}
            disabled={loading === 'call' || vessel.call_status === 'called'}
            data-testid={`vessel-call-btn-${vessel.id}`}
            className="text-xs h-8"
          >
            <Phone className="w-3 h-3 mr-1" />
            {vessel.call_status === 'called' ? 'Called' : 'Call'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleAction('quote')}
            disabled={loading === 'quote'}
            data-testid={`vessel-quote-btn-${vessel.id}`}
            className="text-xs h-8"
          >
            <FileText className="w-3 h-3 mr-1" />
            Quote
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleAction('assign')}
            disabled={loading === 'assign'}
            data-testid={`vessel-assign-btn-${vessel.id}`}
            className="text-xs h-8"
          >
            <UserCheck className="w-3 h-3 mr-1" />
            Assign
          </Button>

          <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                data-testid={`vessel-note-btn-${vessel.id}`}
                className="text-xs h-8"
              >
                <StickyNote className="w-3 h-3 mr-1" />
                Note
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-heading">
                  Log Note — {vessel.name}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground text-sm">
                  Add a note about this vessel for your records.
                </DialogDescription>
              </DialogHeader>
              <Textarea
                placeholder="Enter your note..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                data-testid="note-textarea"
                className="min-h-[100px]"
              />
              <Button
                onClick={handleNote}
                data-testid="note-submit-btn"
                className="bg-[#0B7C6E] hover:bg-[#096b5e] text-white"
              >
                Save Note
              </Button>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </Card>
  );
};
