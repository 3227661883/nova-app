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

class NovaAPI {
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

  async register(username: string, password: string, nickname?: string) {
    const res = await fetch(`${API_HTTP_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, nickname: nickname || username }),
    });
    return res.json();
  }

  async getHistory(limit = 50) {
    const res = await fetch(`${API_HTTP_URL}/api/messages/history?limit=${limit}`, {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    return res.json();
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

  // HTTP 上传（作为 WS 不可用时的降级）
  async uploadMedia(file: { uri: string; type: string; name: string }, mediaType: 'image' | 'audio' | 'video') {
    const formData = new FormData();
    formData.append('file', file as any);
    const res = await fetch(`${API_HTTP_URL}/api/messages/${mediaType}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}` },
      body: formData,
    });
    return res.json();
  }

  onMessage(handler: (msg: ChatMessage) => void) {
    this.messageHandlers.push(handler);
  }

  disconnect() {
    this.ws?.close();
    this.ws = null;
  }
}

export const novaAPI = new NovaAPI();