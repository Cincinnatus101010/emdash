import { Ban, ChevronDown, ExternalLink, Globe, Server } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { useCallback, useRef, useState } from 'react';
import { rpc } from '@renderer/lib/ipc';
import { Button } from '@renderer/lib/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@renderer/lib/ui/popover';
import { useDevServers, useWorkspaceId } from '../task-view-context';

type ServerRef = {
  scopeId: string;
  terminalId: string;
};

function formatUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.port ? `${u.hostname}:${u.port}` : u.hostname;
  } catch {
    return url;
  }
}

function getServerKey(server: ServerRef): string {
  return `${server.scopeId}:${server.terminalId}`;
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
  const [stoppingKey, setStoppingKey] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const setRootRef = useCallback((node: HTMLDivElement | null) => {
    mountedRef.current = node !== null;
  }, []);

  const stopServers = async (servers: ServerRef[], key: string) => {
    if (stoppingKey || servers.length === 0) return;
    setStoppingKey(key);
    try {
      await rpc.terminals.stopDevServers({
        projectId,
        taskId,
        workspaceId,
        servers,
      });
    } catch {
      // Best-effort action; the pills stay visible if the backend cannot stop a server.
    } finally {
      if (mountedRef.current) {
        setStoppingKey(null);
      }
    }
  };

  if (entries.length === 0) return null;

  const firstEntry = entries[0];
  const triggerLabel = formatUrl(firstEntry.url);
  const hiddenServerCount = entries.length - 1;
  const allServerRefs = entries.map(({ scopeId, terminalId }) => ({ scopeId, terminalId }));

  return (
    <Popover>
      <div
        ref={setRootRef}
        className="flex h-7 max-w-72 min-w-0 items-center overflow-hidden rounded-lg bg-background-info text-xs text-foreground-info transition-colors hover:bg-background-info-hover"
      >
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-1.5 px-2 text-left"
          aria-label={`Open ${formatUrl(firstEntry.url)}`}
          title={firstEntry.url}
          onClick={() => void rpc.app.openExternal(firstEntry.url)}
        >
          <Globe className="size-3 shrink-0" />
          <span className="min-w-0 truncate font-medium">{triggerLabel}</span>
          {hiddenServerCount > 0 && (
            <span className="shrink-0 rounded-full bg-background-info-hover px-1.5 text-[10px] leading-4 font-medium tabular-nums">
              +{hiddenServerCount}
            </span>
          )}
          <ExternalLink className="size-3 shrink-0" />
        </button>
        <PopoverTrigger
          type="button"
          className="focus-visible:ring-ring/50 flex h-7 w-6 shrink-0 items-center justify-center text-foreground-info transition-colors hover:bg-background-info-hover focus-visible:ring-2 focus-visible:outline-none"
          aria-label="Open dev servers menu"
        >
          <ChevronDown className="size-3" />
        </PopoverTrigger>
      </div>
      <PopoverContent
        align="end"
        sideOffset={6}
        className="w-64 gap-1 rounded-lg bg-background-quaternary p-1"
      >
        <div className="flex items-center justify-between px-2 py-1.5">
          <span className="text-xs font-medium text-foreground-muted">Dev servers</span>
          <span className="rounded-full bg-background-info px-1.5 text-[10px] leading-4 font-medium text-foreground-info tabular-nums">
            {entries.length}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          {entries.map(({ scopeId, terminalId, url }) => {
            const key = getServerKey({ scopeId, terminalId });
            const isStopping = stoppingKey === key;
            return (
              <div
                key={key}
                className="group/server flex h-8 items-center gap-1.5 rounded-md px-2 text-sm text-foreground transition-colors hover:bg-background-quaternary-1"
              >
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-1.5 text-left transition-colors hover:text-foreground-info"
                  title={url}
                  onClick={() => void rpc.app.openExternal(url)}
                >
                  <Server className="size-3.5 shrink-0 text-foreground-info" />
                  <span className="truncate">{formatUrl(url)}</span>
                  <ExternalLink className="size-3 shrink-0 text-foreground-passive transition-colors group-hover/server:text-foreground-info" />
                </button>
                <Button
                  variant="ghost"
                  size="xs"
                  className="h-7 px-2.5 text-foreground-destructive hover:bg-background-destructive hover:text-foreground-destructive"
                  disabled={stoppingKey !== null}
                  onClick={() => void stopServers([{ scopeId, terminalId }], key)}
                >
                  {isStopping ? 'Stopping...' : 'Stop'}
                </Button>
              </div>
            );
          })}
        </div>
        <div className="mx-2 my-1 h-px bg-border" />
        <Button
          variant="destructive"
          size="sm"
          className="h-8 w-full gap-1.5 text-sm"
          disabled={stoppingKey !== null}
          onClick={() => void stopServers(allServerRefs, 'all')}
        >
          <Ban className="size-3.5 shrink-0" />
          {stoppingKey === 'all' ? 'Stopping servers...' : 'Stop all servers'}
        </Button>
      </PopoverContent>
    </Popover>
  );
});
