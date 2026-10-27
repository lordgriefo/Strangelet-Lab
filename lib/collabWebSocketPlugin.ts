import type { Plugin } from 'vite';
import { WebSocketServer, WebSocket } from 'ws';

interface CollabUser {
  id: string;
  name: string;
  color: string;
  role: 'host' | 'producer' | 'guest';
  joinedAt: number;
  lastActive: number;
}

interface CollabChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderColor: string;
  text: string;
  timestamp: number;
}

interface CollabSession {
  sessionCode: string;
  hostId: string;
  createdAt: number;
  members: Map<string, { ws: WebSocket; user: CollabUser }>;
  projectState: {
    tracks: any[];
    tempo: number;
    isPlaying: boolean;
    currentTime: number;
    selectedTrackId?: string;
  };
  chatMessages: CollabChatMessage[];
  activityLog: { id: string; text: string; timestamp: number; color?: string }[];
}

/**
 * In-memory server-authoritative state for real-time collaborative sessions.
 */
const activeSessions = new Map<string, CollabSession>();

function getOrCreateSession(code: string, hostId: string): CollabSession {
  const normCode = code.trim().toUpperCase();
  let session = activeSessions.get(normCode);
  if (!session) {
    session = {
      sessionCode: normCode,
      hostId,
      createdAt: Date.now(),
      members: new Map(),
      projectState: {
        tracks: [],
        tempo: 120,
        isPlaying: false,
        currentTime: 0
      },
      chatMessages: [
        {
          id: `msg-welcome-${Date.now()}`,
          senderId: 'system',
          senderName: 'Session Host',
          senderColor: '#00F0FF',
          text: `Collab session [${normCode}] initialized. Multiple producers can jam, adjust faders, and sync tracks in real-time.`,
          timestamp: Date.now()
        }
      ],
      activityLog: [
        {
          id: `act-init-${Date.now()}`,
          text: `Session ${normCode} created`,
          timestamp: Date.now(),
          color: '#10B981'
        }
      ]
    };
    activeSessions.set(normCode, session);
  }
  return session;
}

function broadcastToSession(session: CollabSession, message: any, excludeWs?: WebSocket) {
  const data = JSON.stringify(message);
  session.members.forEach(({ ws }) => {
    if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(data);
      } catch (err) {
        console.warn('Failed to send WebSocket message:', err);
      }
    }
  });
}

/**
 * Vite plugin that attaches a real WebSocket Server for collaborative studio sessions
 * on the exact same port (3000) using path: /ws-collab.
 */
export function collabWebSocketPlugin(): Plugin {
  return {
    name: 'collab-websocket-plugin',
    configureServer(server) {
      if (!server.httpServer) return;

      const wss = new WebSocketServer({
        noServer: true
      });

      server.httpServer.on('upgrade', (request, socket, head) => {
        const url = new URL(request.url || '', `http://${request.headers.host}`);
        if (url.pathname === '/ws-collab') {
          wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
          });
        }
      });

      wss.on('connection', (ws) => {
        let currentSessionCode: string | null = null;
        let currentUserId: string | null = null;

        ws.on('message', (raw) => {
          try {
            const msg = JSON.parse(raw.toString());
            const type = msg.type;

            // 1. Client joins a session
            if (type === 'join_session') {
              const code = (msg.sessionCode || 'STRANGELET-1').trim().toUpperCase();
              const userId = msg.userId || `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
              const user: CollabUser = {
                id: userId,
                name: msg.userName || `Producer ${code.slice(-3)}`,
                color: msg.userColor || '#00F0FF',
                role: msg.role || 'producer',
                joinedAt: Date.now(),
                lastActive: Date.now()
              };

              currentSessionCode = code;
              currentUserId = userId;

              const session = getOrCreateSession(code, userId);
              session.members.set(userId, { ws, user });

              // If client sent initial tracks and server is empty, seed with client's tracks
              if (session.projectState.tracks.length === 0 && Array.isArray(msg.initialTracks) && msg.initialTracks.length > 0) {
                session.projectState.tracks = msg.initialTracks;
                session.projectState.tempo = msg.initialTempo || 120;
              }

              // Send full state to newly joined client
              const memberList = Array.from(session.members.values()).map(m => m.user);
              ws.send(JSON.stringify({
                type: 'session_init',
                sessionCode: code,
                isHost: session.hostId === userId,
                user,
                members: memberList,
                projectState: session.projectState,
                chatMessages: session.chatMessages,
                activityLog: session.activityLog
              }));

              // Notify everyone else that user joined
              broadcastToSession(session, {
                type: 'user_joined',
                user,
                members: Array.from(session.members.values()).map(m => m.user),
                activity: {
                  id: `act-${Date.now()}`,
                  text: `${user.name} joined the session`,
                  timestamp: Date.now(),
                  color: user.color
                }
              }, ws);

              session.activityLog.push({
                id: `act-${Date.now()}`,
                text: `${user.name} joined the session`,
                timestamp: Date.now(),
                color: user.color
              });
            }

            // 2. Track updates (Volume, Pan, Mute, Solo, Record Arm)
            else if (type === 'sync_track' && currentSessionCode) {
              const session = activeSessions.get(currentSessionCode);
              if (!session) return;

              const { trackId, updates, senderName } = msg;
              // Update server-authoritative state
              const trkIdx = session.projectState.tracks.findIndex((t: any) => t.id === trackId);
              if (trkIdx >= 0) {
                session.projectState.tracks[trkIdx] = {
                  ...session.projectState.tracks[trkIdx],
                  ...updates
                };
              }

              // Log activity
              let actText = `${senderName || 'Collaborator'} adjusted ${updates.name || 'track'}`;
              if (updates.volume !== undefined) {
                const db = (20 * Math.log10(updates.volume + 0.0001)).toFixed(1);
                actText = `${senderName || 'Collaborator'} set ${session.projectState.tracks[trkIdx]?.name || 'track'} vol to ${db} dB`;
              } else if (updates.pan !== undefined) {
                const panStr = updates.pan === 0 ? 'Center' : updates.pan < 0 ? `L ${Math.round(Math.abs(updates.pan) * 100)}%` : `R ${Math.round(updates.pan * 100)}%`;
                actText = `${senderName || 'Collaborator'} panned ${session.projectState.tracks[trkIdx]?.name || 'track'} ${panStr}`;
              } else if (updates.muted !== undefined) {
                actText = `${senderName || 'Collaborator'} ${updates.muted ? 'muted' : 'unmuted'} ${session.projectState.tracks[trkIdx]?.name || 'track'}`;
              } else if (updates.soloed !== undefined) {
                actText = `${senderName || 'Collaborator'} ${updates.soloed ? 'soloed' : 'un-soloed'} ${session.projectState.tracks[trkIdx]?.name || 'track'}`;
              } else if (updates.isArmedForRecord !== undefined) {
                actText = `${senderName || 'Collaborator'} ${updates.isArmedForRecord ? 'armed' : 'disarmed'} ${session.projectState.tracks[trkIdx]?.name || 'track'}`;
              }

              const actItem = {
                id: `act-${Date.now()}`,
                text: actText,
                timestamp: Date.now()
              };
              session.activityLog.push(actItem);
              if (session.activityLog.length > 50) session.activityLog.shift();

              // Broadcast update to all other connected peers
              broadcastToSession(session, {
                type: 'track_updated',
                trackId,
                updates,
                senderId: currentUserId,
                activity: actItem
              }, ws);
            }

            // 3. Full tracks sync (e.g. added track, deleted track)
            else if (type === 'sync_all_tracks' && currentSessionCode) {
              const session = activeSessions.get(currentSessionCode);
              if (!session) return;

              session.projectState.tracks = msg.tracks;
              broadcastToSession(session, {
                type: 'all_tracks_updated',
                tracks: msg.tracks,
                senderId: currentUserId
              }, ws);
            }

            // 4. Transport sync (Play, Pause, Tempo, Time)
            else if (type === 'sync_transport' && currentSessionCode) {
              const session = activeSessions.get(currentSessionCode);
              if (!session) return;

              if (msg.tempo !== undefined) session.projectState.tempo = msg.tempo;
              if (msg.isPlaying !== undefined) session.projectState.isPlaying = msg.isPlaying;
              if (msg.currentTime !== undefined) session.projectState.currentTime = msg.currentTime;

              broadcastToSession(session, {
                type: 'transport_updated',
                tempo: msg.tempo,
                isPlaying: msg.isPlaying,
                currentTime: msg.currentTime,
                senderId: currentUserId
              }, ws);
            }

            // 5. Collaborative Chat Message
            else if (type === 'send_chat' && currentSessionCode) {
              const session = activeSessions.get(currentSessionCode);
              if (!session) return;

              const chatMsg: CollabChatMessage = {
                id: `chat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                senderId: currentUserId || 'anon',
                senderName: msg.senderName || 'Producer',
                senderColor: msg.senderColor || '#00F0FF',
                text: msg.text,
                timestamp: Date.now()
              };

              session.chatMessages.push(chatMsg);
              if (session.chatMessages.length > 100) session.chatMessages.shift();

              broadcastToSession(session, {
                type: 'chat_received',
                message: chatMsg
              });
            }

            // 6. Ping / Heartbeat
            else if (type === 'ping') {
              ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
            }
          } catch (err) {
            console.warn('Error handling collab message:', err);
          }
        });

        ws.on('close', () => {
          if (currentSessionCode && currentUserId) {
            const session = activeSessions.get(currentSessionCode);
            if (session) {
              const departingUser = session.members.get(currentUserId)?.user;
              session.members.delete(currentUserId);

              if (departingUser) {
                const actItem = {
                  id: `act-leave-${Date.now()}`,
                  text: `${departingUser.name} disconnected`,
                  timestamp: Date.now(),
                  color: '#EF4444'
                };
                session.activityLog.push(actItem);

                broadcastToSession(session, {
                  type: 'user_left',
                  userId: currentUserId,
                  members: Array.from(session.members.values()).map(m => m.user),
                  activity: actItem
                });
              }

              // Clean up empty session after 10 minutes of inactivity
              if (session.members.size === 0) {
                setTimeout(() => {
                  if (session.members.size === 0) {
                    activeSessions.delete(currentSessionCode!);
                  }
                }, 10 * 60 * 1000);
              }
            }
          }
        });
      });
    }
  };
}
