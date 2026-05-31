import { events } from '@renderer/lib/ipc';
import type { IDisposable } from '@renderer/lib/stores/lifecycle';
import { Resource } from '@renderer/lib/stores/resource';
import { hostPreviewEventChannel } from '@shared/events/hostPreviewEvents';
import type { HostPreviewEvent } from '@shared/hostPreview';

export type DevServerEntry = {
  scopeId: string;
  terminalId: string;
  url: string;
};

export class DevServerStore implements IDisposable {
  /**
   * Event-driven resource — starts empty, updated by `hostPreviewEventChannel`
   * events. Each event atomically replaces the map to trigger MobX reactivity.
   */
  readonly servers: Resource<Map<string, DevServerEntry>, HostPreviewEvent>;

  constructor(taskId: string, workspaceId: string) {
    this.servers = new Resource<Map<string, DevServerEntry>, HostPreviewEvent>(
      null,
      [
        {
          kind: 'event',
          subscribe: (handler) =>
            events.on(hostPreviewEventChannel, (event) => {
              if (event.taskId === taskId || event.taskId === workspaceId) {
                handler(event);
              }
            }),
          onEvent: (event, ctx) => {
            const next = new Map(ctx.data ?? []);
            if (event.type === 'url' && event.terminalId && event.url) {
              next.set(`${event.taskId}:${event.terminalId}`, {
                scopeId: event.taskId,
                terminalId: event.terminalId,
                url: event.url,
              });
            } else if (event.type === 'exit' && event.terminalId) {
              next.delete(`${event.taskId}:${event.terminalId}`);
            }
            ctx.set(next);
          },
        },
      ],
      { init: new Map() }
    );

    this.servers.start();
  }

  get urls(): string[] {
    return this.entries.map((server) => server.url);
  }

  get entries(): DevServerEntry[] {
    return Array.from(this.servers.data?.values() ?? []);
  }

  dispose(): void {
    this.servers.dispose();
  }
}
