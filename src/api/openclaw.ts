// NOVA App - NovaMind API 连接
const API_WS_URL = 'ws://47.245.178.113:3001/ws';
const API_HTTP_URL = 'http://47.245.178.113:3001';
const APP_NAME = 'NOVA';
const API_TOKEN_KEY = 'nova_token';
const API_USER_KEY = 'nova_user';
const API_TOKEN_KEY = 'nova_token';
const API_USER_KEY = 'nova_user';

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

  // 登录验证
  async login(username: string, password: string): Promise<boolean> {
    try {
      const res = await fetch(`${OPENCLAW_HTTP_URL}/api/auth/login`, {
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

  // 连接 WebSocket
  private connectWebSocket() {
    this.ws = new WebSocket(`${OPENCLAW_WS_URL}?token=${this.token}`);
    this.ws.onmessage = (event) => {
      const msg: ChatMessage = JSON.parse(event.data);
      this.messageHandlers.forEach((h) => h(msg));
    };
    this.ws.onclose = () => {
      setTimeout(() => this.connectWebSocket(), 3000);
    };
  }

  // 发送文字消息
  sendText(text: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'text', content: text }));
    }
  }

  // 发送媒体（图片/语音/视频）
  sendMedia(uri: string, mediaType: 'image' | 'audio' | 'video') {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'media', mediaType, uri }));
    }
  }

  // 监听消息
  onMessage(handler: (msg: ChatMessage) => void) {
    this.messageHandlers.push(handler);
  }

  disconnect() {
    this.ws?.close();
    this.ws = null;
  }
}

export const openclawAPI = new OpenClawAPI();
