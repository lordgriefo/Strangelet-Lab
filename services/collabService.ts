import { Track } from '../types';

export interface CollabUser {
  id: string;
  name: string;
  color: string;
  role: 'host' | 'producer' | 'guest';
  joinedAt: number;
  lastActive: number;
}

export interface CollabChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderColor: string;
  text: string;
  timestamp: number;
}

export interface CollabActivityItem {
  id: string;
  text: string;
  timestamp: number;
  color?: string;
}

export interface CollabSessionState {
  isConnected: boolean;
  isConnecting: boolean;
  sessionCode: string | null;
  isHost: boolean;
  currentUser: CollabUser | null;
  members: CollabUser[];
  chatMessages: CollabChatMessage[];
  activityLog: CollabActivityItem[];
  latencyMs: number | null;
  connectionType: 'websocket' | 'broadcast_mesh' | 'offline';
}

type TrackChangeHandler = (trackId: string, updates: Partial<Track>, senderName?: string) => void;
type AllTracksHandler = (tracks: Track[]) => void;
type TransportChangeHandler = (transport: { isPlaying?: boolean; tempo?: number; currentTime?: number }) => void;

class CollabService {
  private ws: WebSocket | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private reconnectTimeout: any = null;
  private pingInterval: any = null;
  private isRemoteUpdate: boolean = false;
  private listeners = new Set<(state: CollabSessionState) => void>();
  private trackChangeHandlers = new Set<TrackChangeHandler>();
  private allTracksHandlers = new Set<AllTracksHandler>();
  private transportHandlers = new Set<TransportChangeHandler>();

  private state: CollabSessionState = {
    isConnected: false,
    isConnecting: false,
    sessionCode: null,
    isHost: false,
    currentUser: null,
    members: [],
    chatMessages: [],
    activityLog: [],
    latencyMs: null,
    connectionType: 'offline'
  };

  constructor() {
    // Generate or restore current user profile
    const savedUser = localStorage.getItem('strangelet_collab_user');
    let user: CollabUser;
    if (savedUser) {
      try {
        user = JSON.parse(savedUser);
      } catch {
        user = this.generateRandomUser();
      }
    } else {
      user = this.generateRandomUser();
      localStorage.setItem('strangelet_collab_user', JSON.stringify(user));
    }
    this.state.currentUser = user;

    // Initialize BroadcastChannel as fallback / multi-tab mesh
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.broadcastChannel = new BroadcastChannel('strangelet_collab_mesh');
        this.broadcastChannel.onmessage = (event) => {
          this.handleIncomingMessage(event.data, 'broadcast_mesh');
        };
      } catch (e) {
        console.warn('BroadcastChannel not supported:', e);
      }
    }
  }

  private generateRandomUser(name?: string, role: 'host' | 'producer' | 'guest' = 'producer'): CollabUser {
    const colors = ['#00F0FF', '#FF007F', '#10B981', '#F59E0B', '#A855F7', '#EC4899', '#3B82F6'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const randomNum = Math.floor(100 + Math.random() * 900);
    return {
      id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: name || `Producer ${randomNum}`,
      color: randomColor,
      role,
      joinedAt: Date.now(),
      lastActive: Date.now()
    };
  }

  public getState(): CollabSessionState {
    return { ...this.state };
  }

  public subscribe(listener: (state: CollabSessionState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  public onTrackChange(handler: TrackChangeHandler): () => void {
    this.trackChangeHandlers.add(handler);
    return () => this.trackChangeHandlers.delete(handler);
  }

  public onAllTracks(handler: AllTracksHandler): () => void {
    this.allTracksHandlers.add(handler);
    return () => this.allTracksHandlers.delete(handler);
  }

  public onTransportChange(handler: TransportChangeHandler): () => void {
    this.transportHandlers.add(handler);
    return () => this.transportHandlers.delete(handler);
  }

  public getIsRemoteUpdate(): boolean {
    return this.isRemoteUpdate;
  }

  private notify() {
    const currentState = this.getState();
    this.listeners.forEach(fn => fn(currentState));
  }

  public updateCurrentUser(updates: Partial<CollabUser>) {
    if (!this.state.currentUser) return;
    this.state.currentUser = { ...this.state.currentUser, ...updates };
    localStorage.setItem('strangelet_collab_user', JSON.stringify(this.state.currentUser));
    
    // Broadcast updated profile to room
    if (this.state.isConnected && this.state.sessionCode) {
      this.send({
        type: 'user_profile_updated',
        user: this.state.currentUser
      });
    }
    this.notify();
  }

  /**
   * Connect to a collaborative session by code (e.g. "STUDIO-704" or custom)
   */
  public joinSession(
    code: string, 
    initialTracks?: Track[], 
    initialTempo?: number,
    role: 'host' | 'producer' | 'guest' = 'producer'
  ) {
    const sessionCode = code.trim().toUpperCase();
    if (!sessionCode) return;

    this.leaveSession();
    this.state.sessionCode = sessionCode;
    this.state.isConnecting = true;
    if (this.state.currentUser) {
      this.state.currentUser.role = role;
    }
    this.notify();

    this.connectWebSocket(sessionCode, initialTracks, initialTempo);
  }

  /**
   * Generates a new random 6-character session code and hosts a session
   */
  public createSession(initialTracks?: Track[], initialTempo?: number): string {
    const adjectives = ['NEON', 'CYBER', 'BEAM', 'SONIC', 'ANALOG', 'GROOVE', 'SOLAR', 'QUANTUM'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const num = Math.floor(1000 + Math.random() * 9000);
    const code = `${adj}-${num}`;

    this.joinSession(code, initialTracks, initialTempo, 'host');
    return code;
  }

  private connectWebSocket(sessionCode: string, initialTracks?: Track[], initialTempo?: number) {
    clearTimeout(this.reconnectTimeout);
    clearInterval(this.pingInterval);

    try {
      const isHttps = window.location.protocol === 'https:';
      const wsProtocol = isHttps ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${window.location.host}/ws-collab`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.state.isConnected = true;
        this.state.isConnecting = false;
        this.state.connectionType = 'websocket';

        // Send join packet to server
        this.ws?.send(JSON.stringify({
          type: 'join_session',
          sessionCode,
          userId: this.state.currentUser?.id,
          userName: this.state.currentUser?.name,
          userColor: this.state.currentUser?.color,
          role: this.state.currentUser?.role || 'producer',
          initialTracks,
          initialTempo
        }));

        // Keepalive ping
        this.pingInterval = setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            const start = performance.now();
            this.ws.send(JSON.stringify({ type: 'ping', timestamp: start }));
          }
        }, 15000);

        this.notify();
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleIncomingMessage(msg, 'websocket');
        } catch (e) {
          console.warn('Error parsing WS message:', e);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('WebSocket connection error, utilizing local broadcast mesh fallback:', err);
        // Fall back to broadcast channel mesh if server WS is unavailable
        this.fallbackToBroadcastMesh(sessionCode, initialTracks, initialTempo);
      };

      this.ws.onclose = () => {
        this.state.isConnected = false;
        clearInterval(this.pingInterval);
        this.notify();

        // Attempt reconnect if still in session
        if (this.state.sessionCode) {
          this.reconnectTimeout = setTimeout(() => {
            if (this.state.sessionCode) {
              this.connectWebSocket(this.state.sessionCode);
            }
          }, 3500);
        }
      };
    } catch (err) {
      console.warn('Failed to initiate WebSocket, falling back to BroadcastChannel:', err);
      this.fallbackToBroadcastMesh(sessionCode, initialTracks, initialTempo);
    }
  }

  private fallbackToBroadcastMesh(sessionCode: string, initialTracks?: Track[], initialTempo?: number) {
    this.state.isConnected = true;
    this.state.isConnecting = false;
    this.state.connectionType = 'broadcast_mesh';
    this.state.members = [this.state.currentUser!];
    this.notify();

    // Broadcast join on local mesh
    this.broadcastChannel?.postMessage({
      type: 'mesh_join',
      sessionCode,
      user: this.state.currentUser,
      initialTracks,
      initialTempo
    });
  }

  private handleIncomingMessage(msg: any, source: 'websocket' | 'broadcast_mesh') {
    if (!msg || !msg.type) return;

    switch (msg.type) {
      case 'pong': {
        if (msg.timestamp) {
          this.state.latencyMs = Math.round(performance.now() - msg.timestamp);
          this.notify();
        }
        break;
      }

      case 'session_init': {
        this.state.isHost = !!msg.isHost;
        this.state.members = msg.members || [this.state.currentUser];
        this.state.chatMessages = msg.chatMessages || [];
        this.state.activityLog = msg.activityLog || [];

        // Apply authoritative initial project state if tracks exist
        if (msg.projectState?.tracks && msg.projectState.tracks.length > 0) {
          this.isRemoteUpdate = true;
          this.allTracksHandlers.forEach(h => h(msg.projectState.tracks));
          if (msg.projectState.tempo) {
            this.transportHandlers.forEach(h => h({ tempo: msg.projectState.tempo, isPlaying: msg.projectState.isPlaying }));
          }
          setTimeout(() => { this.isRemoteUpdate = false; }, 50);
        }
        this.notify();
        break;
      }

      case 'user_joined': {
        this.state.members = msg.members || [...this.state.members, msg.user];
        if (msg.activity) {
          this.state.activityLog.push(msg.activity);
        }
        this.notify();
        break;
      }

      case 'user_left': {
        this.state.members = msg.members || this.state.members.filter(m => m.id !== msg.userId);
        if (msg.activity) {
          this.state.activityLog.push(msg.activity);
        }
        this.notify();
        break;
      }

      case 'track_updated': {
        // Prevent infinite echo loop if this client generated it
        if (msg.senderId === this.state.currentUser?.id) return;

        this.isRemoteUpdate = true;
        this.trackChangeHandlers.forEach(h => h(msg.trackId, msg.updates, msg.senderName));
        if (msg.activity) {
          this.state.activityLog.push(msg.activity);
          if (this.state.activityLog.length > 50) this.state.activityLog.shift();
        }
        setTimeout(() => { this.isRemoteUpdate = false; }, 40);
        this.notify();
        break;
      }

      case 'all_tracks_updated': {
        if (msg.senderId === this.state.currentUser?.id) return;

        this.isRemoteUpdate = true;
        this.allTracksHandlers.forEach(h => h(msg.tracks));
        setTimeout(() => { this.isRemoteUpdate = false; }, 40);
        this.notify();
        break;
      }

      case 'transport_updated': {
        if (msg.senderId === this.state.currentUser?.id) return;

        this.isRemoteUpdate = true;
        this.transportHandlers.forEach(h => h({
          isPlaying: msg.isPlaying,
          tempo: msg.tempo,
          currentTime: msg.currentTime
        }));
        setTimeout(() => { this.isRemoteUpdate = false; }, 40);
        break;
      }

      case 'chat_received': {
        if (msg.message) {
          this.state.chatMessages.push(msg.message);
          if (this.state.chatMessages.length > 100) this.state.chatMessages.shift();
          this.notify();
        }
        break;
      }

      // Broadcast mesh handlers
      case 'mesh_join': {
        if (msg.sessionCode === this.state.sessionCode && msg.user && msg.user.id !== this.state.currentUser?.id) {
          if (!this.state.members.some(m => m.id === msg.user.id)) {
            this.state.members.push(msg.user);
            this.state.activityLog.push({
              id: `act-${Date.now()}`,
              text: `${msg.user.name} joined via local mesh`,
              timestamp: Date.now(),
              color: msg.user.color
            });
            this.notify();
          }
        }
        break;
      }
    }
  }

  /**
   * Broadcast track parameter change (Volume, Pan, Mute, Solo, Arm)
   */
  public broadcastTrackUpdate(trackId: string, updates: Partial<Track>) {
    // If update arrived from remote peer, don't re-broadcast it (infinite loop protection!)
    if (this.isRemoteUpdate) return;
    if (!this.state.isConnected || !this.state.sessionCode) return;

    this.send({
      type: 'sync_track',
      trackId,
      updates,
      senderId: this.state.currentUser?.id,
      senderName: this.state.currentUser?.name
    });
  }

  /**
   * Broadcast all tracks (e.g. after adding, reordering or deleting stems)
   */
  public broadcastAllTracks(tracks: Track[]) {
    if (this.isRemoteUpdate) return;
    if (!this.state.isConnected || !this.state.sessionCode) return;

    this.send({
      type: 'sync_all_tracks',
      tracks,
      senderId: this.state.currentUser?.id
    });
  }

  /**
   * Broadcast play/pause or tempo adjustments
   */
  public broadcastTransport(isPlaying?: boolean, tempo?: number, currentTime?: number) {
    if (this.isRemoteUpdate) return;
    if (!this.state.isConnected || !this.state.sessionCode) return;

    this.send({
      type: 'sync_transport',
      isPlaying,
      tempo,
      currentTime,
      senderId: this.state.currentUser?.id
    });
  }

  /**
   * Send a collaborative in-session chat message
   */
  public sendChatMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || !this.state.isConnected || !this.state.sessionCode) return;

    this.send({
      type: 'send_chat',
      text: trimmed,
      senderId: this.state.currentUser?.id,
      senderName: this.state.currentUser?.name,
      senderColor: this.state.currentUser?.color
    });
  }

  private send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(data));
      } catch (err) {
        console.warn('Failed to send on WS:', err);
      }
    }

    // Always mirror to BroadcastChannel mesh for local tabs/LAN fallbacks
    try {
      this.broadcastChannel?.postMessage(data);
    } catch {}
  }

  /**
   * Leave active session
   */
  public leaveSession() {
    clearTimeout(this.reconnectTimeout);
    clearInterval(this.pingInterval);

    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }

    this.state.isConnected = false;
    this.state.isConnecting = false;
    this.state.sessionCode = null;
    this.state.isHost = false;
    this.state.members = [];
    this.state.chatMessages = [];
    this.state.activityLog = [];
    this.state.connectionType = 'offline';
    this.notify();
  }
}

export const collabService = new CollabService();
