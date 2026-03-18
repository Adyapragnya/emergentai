import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Phone, AlertTriangle, Bell } from 'lucide-react';
import { salesAPI } from '@/lib/api';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { formatStatusLabel } from '@/lib/utils';

export const QuickActions = ({ vessels = [], notifications = [], onRefresh }) => {
  const priorityCalls = vessels
    .filter(
      v =>
        v.call_status !== 'called' &&
        v.certificates?.some(c => c.status === 'critical' || c.status === 'expired')
    )
    .slice(0, 5);

  const recentActivity = notifications.slice(0, 8);

  const quickCall = async (vesselId, vesselName) => {
    try {
      await salesAPI.markCalled(vesselId);
      toast.success(`Call logged for ${vesselName}`);
      onRefresh?.();
    } catch (e) {
      toast.error('Failed to log call');
    }
  };

  return (
    <div className="sticky top-20 space-y-4" data-testid="quick-actions-panel">
      {/* Priority Calls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Priority Calls
          </CardTitle>
        </CardHeader>
        <CardContent>
          {priorityCalls.length === 0 ? (
            <p className="text-xs text-muted-foreground">All clear — no priority calls</p>
          ) : (
            <div className="space-y-2">
              {priorityCalls.map(v => {
                const urgentCert = v.certificates?.find(
                  c => c.status === 'expired' || c.status === 'critical'
                );
                return (
                  <div key={v.id} className="flex items-center justify-between py-1.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{v.name}</p>
                      <p className="text-[10px] text-red-500 font-medium">
                        {urgentCert?.type}{' '}
                        {urgentCert?.days_remaining <= 0
                          ? 'EXPIRED'
                          : `${urgentCert?.days_remaining}d left`}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-primary shrink-0"
                      onClick={() => quickCall(v.id, v.name)}
                      data-testid={`quick-call-${v.id}`}
                    >
                      <Phone className="w-3 h-3 mr-1" />
                      Call
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-sm flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-56">
            {recentActivity.length === 0 ? (
              <p className="text-xs text-muted-foreground">No recent activity</p>
            ) : (
                        <div className="space-y-2">
                {recentActivity.map(n => {
                  // Format the message to use proper status labels
                  const formattedMessage = n.message.replace(
                    /: (pending|acknowledged|in_progress|completed|flagged|[a-z]+:[a-z_]+)$/i,
                    (match, status) => `: ${formatStatusLabel(status)}`
                  );
                  return (
                    <div key={n.id} className="flex items-start gap-2 py-1">
                      <div
                        className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                          n.severity === 'critical' || n.severity === 'expired'
                            ? 'bg-red-500'
                            : n.severity === 'warning'
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                        }`}
                      />
                      <div className="min-w-0">
                        <p className="text-xs leading-snug">{formattedMessage}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
