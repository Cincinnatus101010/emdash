import { ExternalLink, Globe, Square } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { rpc } from '@renderer/lib/ipc';
import { Button } from '@renderer/lib/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/lib/ui/tooltip';
import { useDevServers, useWorkspaceId } from '../task-view-context';

function formatUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.port ? `${u.hostname}:${u.port}` : u.hostname;
  } catch {
    return url;
  }
}

export const DevServerPills = observer(function DevServerPills({
  projectId,
  taskId,
}: {
  projectId: string;
  taskId: string;
}) {
  const workspaceId = useWorkspaceId();
  const devServers = useDevServers();
  const entries = devServers.entries;
  const [isStopping, setIsStopping] = useState(false);

  const handleStopAll = async () => {
    if (isStopping || entries.length === 0) return;
    setIsStopping(true);
    try {
      await rpc.terminals.stopDevServers({
        projectId,
        taskId,
        workspaceId,
        servers: entries.map(({ scopeId, terminalId }) => ({ scopeId, terminalId })),
      });
    } catch {
      // Best-effort action; the pills stay visible if the backend cannot stop a server.
    } finally {
      setIsStopping(false);
    }
  };

  if (entries.length === 0) return null;

  return (
    <>
      {entries.map(({ scopeId, terminalId, url }) => (
        <Tooltip key={`${scopeId}:${terminalId}`}>
          <TooltipTrigger>
            <button
              type="button"
              onClick={() => rpc.app.openExternal(url)}
              className="flex h-7 items-center gap-1.5 rounded-lg bg-background-info px-2 text-xs text-foreground-muted transition-colors hover:border-border-info hover:bg-background-info-hover hover:text-foreground"
            >
              <Globe className="size-3 shrink-0 text-foreground-info" />
              <span className="text-foreground-info">{formatUrl(url)}</span>
              <ExternalLink className="size-3 shrink-0 text-foreground-info" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Dev server running at {url}
          </TooltipContent>
        </Tooltip>
      ))}
      <Tooltip>
        <TooltipTrigger>
          <Button
            variant="destructive"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            disabled={isStopping}
            onClick={() => void handleStopAll()}
          >
            <Square className="size-3 fill-current" />
            {isStopping ? 'Stopping...' : 'Stop all'}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          Stop all dev servers shown for this task
        </TooltipContent>
      </Tooltip>
    </>
  );
});
