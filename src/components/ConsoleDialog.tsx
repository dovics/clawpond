'use client';

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ZeroClawInstance } from '@/types';
import { Terminal } from 'lucide-react';
import { authFetch } from '@/components/AuthGate';

interface ConsoleDialogProps {
  instance: ZeroClawInstance | null;
  open: boolean;
  onClose: () => void;
}

export function ConsoleDialog({ instance, open, onClose }: ConsoleDialogProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<any>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const execIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open || !instance) return;

    const initTerminal = async () => {
      try {
        setError(null);

        // Dynamically import xterm
        const { Terminal } = await import('xterm');
        const { FitAddon } = await import('xterm-addon-fit');

        // Create terminal
        const terminal = new Terminal({
          cursorBlink: true,
          fontSize: 14,
          fontFamily: 'Monaco, Menlo, "DejaVu Sans Mono", "Lucida Console", monospace',
          theme: {
            background: '#1a1a1a',
            foreground: '#ffffff',
            cursor: '#ffffff',
            selection: '#rgba(255, 255, 255, 0.3)',
          },
          allowProposedApi: true,
        });

        // Create fit addon
        const fitAddon = new FitAddon();
        terminal.loadAddon(fitAddon);

        // Mount terminal
        if (terminalRef.current) {
          terminalRef.current.innerHTML = '';
          terminal.open(terminalRef.current);
          fitAddon.fit();

          // Handle terminal resize
          const resizeObserver = new ResizeObserver(() => {
            fitAddon.fit();
          });
          resizeObserver.observe(terminalRef.current);

          // Handle terminal input
          terminal.onData(async (data: string) => {
            if (instance && execIdRef.current) {
              try {
                await authFetch(`/api/containers/${instance.id}/terminal/input`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ input: data }),
                });
              } catch (err) {
                console.error('Error sending input:', err);
              }
            }
          });

          xtermRef.current = { terminal, fitAddon, resizeObserver };

          // Create terminal session
          const response = await authFetch(`/api/containers/${instance.id}/terminal`, {
            method: 'POST',
          });

          if (!response.ok) {
            throw new Error('Failed to create terminal session');
          }

          const { execId, reconnect } = await response.json();
          execIdRef.current = execId;

          // Get token for SSE connection (EventSource doesn't support custom headers)
          const token = localStorage.getItem('auth_token');

          // Set up SSE for output
          const eventSource = new EventSource(`/api/containers/${instance.id}/terminal?token=${encodeURIComponent(token || '')}`);
          eventSourceRef.current = eventSource;

          eventSource.onmessage = (event) => {
            try {
              const message = JSON.parse(event.data);

              if (message.connected) {
                setIsConnected(true);
                terminal.writeln('\x1b[32m✓ Connected to container\x1b[0m');
                terminal.writeln('');
              } else if (message.data) {
                terminal.write(message.data);
              }
            } catch (e) {
              console.error('Error parsing SSE message:', e);
            }
          };

          eventSource.onerror = (err) => {
            console.error('SSE error:', err);
            setIsConnected(false);
            eventSource.close();
          };

          // Initial resize
          const dims = { cols: terminal.cols, rows: terminal.rows };
          await authFetch(`/api/containers/${instance.id}/terminal/input`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dims),
          });

          // Handle window resize
          const handleResize = () => {
            fitAddon.fit();
            const newDims = { cols: terminal.cols, rows: terminal.rows };
            authFetch(`/api/containers/${instance.id}/terminal/input`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(newDims),
            }).catch(console.error);
          };

          window.addEventListener('resize', handleResize);

          // Cleanup function
          return () => {
            window.removeEventListener('resize', handleResize);
            resizeObserver.disconnect();
            eventSource.close();
            terminal.dispose();
          };
        }
      } catch (err) {
        console.error('Error initializing terminal:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize terminal');
        setIsConnected(false);
      }
    };

    const cleanup = initTerminal();

    return () => {
      cleanup.then((cleanupFn) => {
        if (cleanupFn) cleanupFn();
      });
    };
  }, [open, instance]);

  const handleClose = async () => {
    // Close the terminal session
    if (instance) {
      try {
        await authFetch(`/api/containers/${instance.id}/terminal`, {
          method: 'DELETE',
        });
      } catch (err) {
        console.error('Error closing terminal:', err);
      }
    }

    // Close event source
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    // Dispose terminal
    if (xtermRef.current) {
      xtermRef.current.resizeObserver.disconnect();
      xtermRef.current.terminal.dispose();
      xtermRef.current = null;
    }

    setIsConnected(false);
    execIdRef.current = null;
    onClose();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl h-[600px] bg-black border-gray-800">
        <DialogHeader className="border-b border-gray-800 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="h-5 w-5 text-primary" />
              <div>
                <DialogTitle className="text-white">
                  Console: {instance?.name}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Interactive terminal console for container {instance?.name}
                </DialogDescription>
              </div>
              {isConnected && (
                <span className="flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
              )}
            </div>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          {error && (
            <div className="p-4 bg-red-900/20 border border-red-800 rounded-md mb-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
          <div
            ref={terminalRef}
            className="h-full w-full bg-[#1a1a1a] rounded-md overflow-hidden"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
