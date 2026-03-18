import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle } from 'lucide-react';

const barColor = (status) => ({
  safe: 'bg-emerald-500', warning: 'bg-amber-500',
  critical: 'bg-red-500', expired: 'bg-red-600',
}[status] || 'bg-gray-500');

const textColor = (status) => ({
  safe: 'text-emerald-400', warning: 'text-amber-400',
  critical: 'text-red-400', expired: 'text-red-400',
}[status] || 'text-gray-400');

export const CertExpiryPanel = ({ certificates = [] }) => {
  return (
    <Card className="border-border" data-testid="cert-expiry-panel">
      <CardHeader className="pb-3">
        <CardTitle className="font-heading text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          Certificates Expiring ({certificates.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-64">
          <div className="space-y-3">
            {certificates.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4 font-mono">
                No expiring certificates
              </p>
            ) : (
              certificates.map((cert, i) => (
                <div
                  key={`${cert.vessel_name}-${cert.cert_type}-${i}`}
                  className="space-y-1"
                  data-testid={`cert-item-${i}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate">{cert.vessel_name}</span>
                    <span className={`text-xs font-mono font-bold ${textColor(cert.status)}`}>
                      {cert.days_remaining > 0 ? `${cert.days_remaining}d` : 'EXP'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground font-mono w-14">
                      {cert.cert_type}
                    </span>
                    <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div
                        className={`h-full rounded-full ${barColor(cert.status)} ${
                          cert.status === 'expired' ? 'animate-urgent' : ''
                        }`}
                        style={{
                          width: `${Math.max(3, Math.min(100, (cert.days_remaining / 90) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
