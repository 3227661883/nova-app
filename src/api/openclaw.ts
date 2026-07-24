// NOVA App - NOVA API 连接
const API_WS_URL = 'wss://api.m1911.xyz/ws';
const API_HTTP_URL = 'https://api.m1911.xyz';
const APP_NAME = 'NOVA';
const API_TOKEN_KEY = '***';
const API_USER_KEY = '***';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type: 'text' | 'image' | 'audio' | 'video';
  mediaUrl?: string;
  timestamp: number;
}

class OpenClawAPI {
  private ws: WebSocket | null = null;
  private token: string = '';
  private messageHandlers: ((msg: ChatMessage) => void)[] = [];

  async login(username: string, password: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_HTTP_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.token) {
        this.token = data.token;
        this.connectWebSocket();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  private connectWebSocket() {
    this.ws = new WebSocket(`${API_WS_URL}?token=***}`);
    this.ws.onmessage = (event) => {
      const msg: ChatMessage = JSON.parse(event.data);
      this.messageHandlers.forEach((h) => h(msg));
    };
    this.ws.onclose = () => {
      setTimeout(() => this.connectWebSocket(), 3000);
    };
  }

  sendText(text: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'text', content: text }));
    }
  }

  sendMedia(uri: string, mediaType: 'image' | 'audio' | 'video') {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'media', mediaType, uri }));
    }
  }

  onMessage(handler: (msg: ChatMessage) => void) {
    this.messageHandlers.push(handler);
  }

  disconnect() {
    this.ws?.close();
    this.ws = null;
  }
}

export const openclawAPI = new OpenClawAPI();
