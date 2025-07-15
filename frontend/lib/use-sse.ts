import { useEffect, useRef, useState } from 'react';

export interface SSEHookOptions {
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export interface SSEMessage {
  type: string;
  data: any;
}

export function useServerSentEvents(
  url: string | null,
  options: SSEHookOptions = {}
) {
  const {
    reconnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<SSEMessage | null>(null);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const listenersRef = useRef<{ [event: string]: ((data: any) => void)[] }>({});

  const connect = () => {
    if (!url || eventSourceRef.current) return;

    try {
      console.log('🔗 Establishing SSE connection to:', url);
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('✅ SSE connection established');
        setIsConnected(true);
        setError(null);
        reconnectAttempts.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const message: SSEMessage = JSON.parse(event.data);
          setLastMessage(message);

          // Call type-specific listeners
          if (listenersRef.current[message.type]) {
            listenersRef.current[message.type].forEach(callback => {
              callback(message.data);
            });
          }

          // Call generic listeners
          if (listenersRef.current['*']) {
            listenersRef.current['*'].forEach(callback => {
              callback(message);
            });
          }
        } catch (err) {
          console.error('Failed to parse SSE message:', err);
        }
      };

      eventSource.onerror = (err) => {
        console.error('❌ SSE connection error:', err);
        setIsConnected(false);
        setError('Connection error');
        
        // Close current connection
        eventSource.close();
        eventSourceRef.current = null;

        // Attempt reconnection
        if (reconnect && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          console.log(`🔄 Attempting reconnection ${reconnectAttempts.current}/${maxReconnectAttempts} in ${reconnectInterval}ms`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          setError('Max reconnection attempts reached');
          console.error('🚫 Max reconnection attempts reached');
        }
      };

    } catch (err) {
      console.error('Failed to create SSE connection:', err);
      setError('Failed to establish connection');
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      console.log('🔌 Closing SSE connection');
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setIsConnected(false);
    setError(null);
    reconnectAttempts.current = 0;
  };

  const addEventListener = (type: string, callback: (data: any) => void) => {
    if (!listenersRef.current[type]) {
      listenersRef.current[type] = [];
    }
    listenersRef.current[type].push(callback);

    // Return cleanup function
    return () => {
      if (listenersRef.current[type]) {
        listenersRef.current[type] = listenersRef.current[type].filter(cb => cb !== callback);
      }
    };
  };

  useEffect(() => {
    if (url) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [url]);

  return {
    isConnected,
    error,
    lastMessage,
    connect,
    disconnect,
    addEventListener
  };
}

// Specialized hook for room updates (hosts)
export function useRoomSSE(quizCode: string | null) {
  const url = quizCode ? `/api/quizblitz/events/room/${quizCode}` : null;
  const [players, setPlayers] = useState<any[]>([]);
  const [roomStatus, setRoomStatus] = useState<string>('waiting');
  
  const sse = useServerSentEvents(url);

  useEffect(() => {
    const cleanup = sse.addEventListener('room_update', (data) => {
      if (data.success) {
        setPlayers(data.players || []);
        setRoomStatus(data.status);
      }
    });

    return cleanup;
  }, [sse]);

  return {
    ...sse,
    players,
    roomStatus
  };
}

// Specialized hook for session updates (players)
export function useSessionSSE(quizCode: string | null) {
  const url = quizCode ? `/api/quizblitz/events/session/${quizCode}` : null;
  const [sessionData, setSessionData] = useState<any>(null);
  
  const sse = useServerSentEvents(url);

  useEffect(() => {
    const cleanup = sse.addEventListener('session_update', (data) => {
      setSessionData(data);
    });

    return cleanup;
  }, [sse]);

  return {
    ...sse,
    sessionData
  };
}
