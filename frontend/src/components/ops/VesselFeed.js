import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Ship, Circle } from 'lucide-react';
import { format } from 'date-fns';

export const VesselFeed = ({ vessels = [] }) => {
  return (
    <Card className="border-border" data-testid="vessel-feed">
      <CardHeader className="pb-3">
        <CardTitle className="font-heading text-sm flex items-center gap-2">
          <Ship className="w-4 h-4 text-primary" />
          Vessel Feed ({vessels.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-64">
          <div className="space-y-1">
            {vessels.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4 font-mono">
                No vessels in feed
              </p>
            ) : (
              vessels.map(v => (
                <div
                  key={v.id}
                  className="flex items-center gap-3 p-2.5 rounded-md hover:bg-secondary/50 transition-colors"
                  data-testid={`feed-vessel-${v.id}`}
                >
                  <Circle
                    className={`w-2.5 h-2.5 shrink-0 ${
                      v.has_jobs
                        ? 'fill-[#0FA390] text-[#0FA390]'
                        : 'fill-gray-500 text-gray-500'
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{v.name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      {v.berth} &middot; ETA {format(new Date(v.eta), 'HH:mm')}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-mono shrink-0 ${
                      v.has_jobs
                        ? 'bg-[#0FA390]/20 text-[#0FA390]'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}
                  >
                    {v.has_jobs ? 'Assigned' : 'Open'}
                  </span>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
