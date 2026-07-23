import React, {useState, useEffect, useRef, useCallback} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://47.245.178.113:3001';
const WS_URL = 'ws://47.245.178.113:3001/ws';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type: 'text' | 'image' | 'audio' | 'video';
  mediaUrl?: string;
  duration?: number;
  timestamp: number;
}

// 预设背景图
const BACKGROUNDS = [
  {id: 'default', name: '默认', color: '#EDEDED'},
  {id: 'dark', name: '深色', color: '#1a1a2e'},
  {id: 'green', name: '薄荷', color: '#e8f5e9'},
  {id: 'blue', name: '海洋', color: '#e3f2fd'},
  {id: 'pink', name: '樱花', color: '#fce4ec'},
  {id: 'warm', name: '暖阳', color: '#fff3e0'},
];

export default function ChatScreen({navigation}: any) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [bgColor, setBgColor] = useState('#EDEDED');
  const [showEmoji, setShowEmoji] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const token = useRef<string>('');
  const recordingRef = useRef(false);

  // 加载 token 和背景设置
  useEffect(() => {
    (async () => {
      const tk = await AsyncStorage.getItem('token');
      const bg = await AsyncStorage.getItem('bgColor');
      if (tk) {
        token.current = tk;
        connectWebSocket(tk);
        loadHistory();
      }
      if (bg) setBgColor(bg);
    })();
    return () => wsRef.current?.close();
  }, []);

  const connectWebSocket = (tk: string) => {
    const ws = new WebSocket(`${WS_URL}?token=***}`);
    wsRef.current = ws;
    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => {
      setIsConnected(false);
      setTimeout(() => connectWebSocket(token.current), 3000);
    };
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'stream') {
          setStreamingContent((prev) => prev + data.content);
        } else if (data.type === 'message') {
          setMessages((prev) => [...prev, {
            id: data.id || Date.now().toString(),
            role: 'assistant',
            content: data.content,
            type: 'text',
            timestamp: data.timestamp || Date.now(),
          }]);
          setStreamingContent('');
        }
      } catch {}
    };
  };

  const loadHistory = async () => {
    try {
      const res = await fetch(`${API_URL}/api/messages/history?limit=50`, {
        headers: {Authorization: `Bearer ${token.current}`},
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setMessages(data.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          type: m.type,
          mediaUrl: m.media_url,
          timestamp: new Date(m.created_at).getTime(),
        })));
      }
    } catch {}
  };

  const sendMessage = useCallback(() => {
    if (!inputText.trim()) return;
    const text = inputText.trim();
    setInputText('');

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      type: 'text',
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({type: 'text', content: text}));
    } else {
      fetch(`${API_URL}/api/messages/text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token.current}`,
        },
        body: JSON.stringify({content: text}),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.reply) {
            setMessages((prev) => [...prev, {
              id: Date.now().toString(),
              role: 'assistant',
              content: data.reply,
              type: 'text',
              timestamp: Date.now(),
            }]);
          }
        })
        .catch(() => {});
    }
  }, [inputText]);

  // 语音发送
  const sendVoice = async (uri: string, duration: number) => {
    const formData = new FormData();
    formData.append('file', {
      uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
      type: 'audio/m4a',
      name: `voice_${Date.now()}.m4a`,
    } as any);

    try {
      const res = await fetch(`${API_URL}/api/messages/audio`, {
        method: 'POST',
        headers: {Authorization: `Bearer ${token.current}`},
        body: formData,
      });
      const data = await res.json();
      if (data.mediaUrl) {
        const userMsg: Message = {
          id: Date.now().toString(),
          role: 'user',
          content: '[语音]',
          type: 'audio',
          mediaUrl: `${API_URL}${data.mediaUrl}`,
          duration,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, userMsg]);
      }
    } catch {}
  };

  const pickImage = () => {
    launchImageLibrary({mediaType: 'photo', quality: 0.8}, (res) => {
      if (res.assets?.[0]?.uri) uploadMedia(res.assets[0].uri, 'image');
    });
  };

  const pickVideo = () => {
    launchImageLibrary({mediaType: 'video', quality: 0.8}, (res) => {
      if (res.assets?.[0]?.uri) uploadMedia(res.assets[0].uri, 'video');
    });
  };

  const uploadMedia = async (uri: string, type: 'image' | 'video') => {
    const formData = new FormData();
    formData.append('file', {
      uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
      type: type === 'image' ? 'image/jpeg' : 'video/mp4',
      name: `${type}_${Date.now()}.jpg`,
    } as any);

    try {
      const res = await fetch(`${API_URL}/api/messages/${type}`, {
        method: 'POST',
        headers: {Authorization: `Bearer ${token.current}`},
        body: formData,
      });
      const data = await res.json();
      if (data.mediaUrl) {
        const userMsg: Message = {
          id: Date.now().toString(),
          role: 'user',
          content: type === 'image' ? '[图片]' : '[视频]',
          type: type,
          mediaUrl: `${API_URL}${data.mediaUrl}`,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, userMsg]);
      }
    } catch {}
  };

  const changeBackground = async (color: string) => {
    setBgColor(color);
    await AsyncStorage.setItem('bgColor', color);
    setShowBgPicker(false);
  };

  // 长按录音
  const handleVoicePressIn = () => {
    recordingRef.current = true;
    // 实际项目中启动录音
  };

  const handleVoicePressOut = () => {
    if (recordingRef.current) {
      recordingRef.current = false;
      // 模拟发送语音
      sendVoice(`file:///tmp/voice_${Date.now()}.m4a`, 3);
    }
  };

  const renderMessage = ({item, index}: {item: Message; index: number}) => {
    const isUser = item.role === 'user';

    // 时间分隔线
    const showTime = index === 0 || (item.timestamp - messages[index - 1].timestamp) > 5 * 60 * 1000;

    return (
      <View>
        {showTime && (
          <View style={styles.timeDivider}>
            <Text style={styles.timeDividerText}>
              {new Date(item.timestamp).toLocaleString('zh-CN', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        )}
        <View style={[styles.msgRow, isUser && styles.msgRowRight]}>
          {!isUser && (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>🧠</Text>
            </View>
          )}
          <View style={[styles.bubble, isUser ? styles.bubbleRight : styles.bubbleLeft]}>
            {item.type === 'text' && (
              <Text style={[styles.msgText, isUser && styles.msgTextRight]}>
                {item.content}
              </Text>
            )}
            {item.type === 'image' && item.mediaUrl && (
              <Image source={{uri: item.mediaUrl}} style={styles.mediaImage} resizeMode="cover" />
            )}
            {item.type === 'video' && (
              <View style={styles.mediaPlaceholder}>
                <Text style={styles.mediaPlaceholderText}>🎬</Text>
                <Text style={styles.mediaPlaceholderLabel}>视频消息</Text>
              </View>
            )}
            {item.type === 'audio' && (
              <View style={styles.audioPlayer}>
                <TouchableOpacity style={styles.audioPlayBtn}>
                  <Text style={styles.audioPlayIcon}>▶</Text>
                </TouchableOpacity>
                <View style={styles.audioWave}>
                  {[...Array(8)].map((_, i) => (
                    <View key={i} style={[styles.audioWaveBar, {height: 4 + Math.random() * 12}]} />
                  ))}
                </View>
                <Text style={styles.audioDuration}>{item.duration || 1}"</Text>
              </View>
            )}
          </View>
          {isUser && (
            <View style={[styles.avatar, styles.avatarUser]}>
              <Text style={styles.avatarText}>👤</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderStreaming = () => {
    if (!streamingContent) return null;
    return (
      <View style={styles.msgRow}>
        <View style={styles.avatar}><Text style={styles.avatarText}>🧠</Text></View>
        <View style={[styles.bubble, styles.bubbleLeft]}>
          <Text style={styles.msgText}>{streamingContent}</Text>
          <Text style={styles.streamingDot}>▊</Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={[styles.container, {backgroundColor: bgColor}]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* 头部 */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>🧠 艾莉丝</Text>
          <Text style={[styles.headerStatus, isConnected && styles.headerStatusOnline]}>
            {isConnected ? '● 在线' : '○ 连接中...'}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => setShowBgPicker(true)}>
            <Text style={styles.headerBtnText}>🎨</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={() => setShowSettings(true)}>
            <Text style={styles.headerBtnText}>⋮</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 消息列表 */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={styles.msgList}
        contentContainerStyle={styles.msgListContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({animated: true})}
        ListFooterComponent={renderStreaming}
      />

      {/* 输入栏 */}
      <View style={styles.inputBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => setShowEmoji(!showEmoji)}>
          <Text style={styles.iconText}>😊</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="输入消息..."
          placeholderTextColor="#999"
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
        />
        {inputText.trim() ? (
          <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
            <Text style={styles.sendBtnText}>发送</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.iconBtn} onPress={pickImage}>
            <Text style={styles.iconText}>📷</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 语音按钮（独立区域） */}
      <View style={styles.voiceBar}>
        <TouchableOpacity
          style={styles.voiceBtn}
          onPressIn={handleVoicePressIn}
          onPressOut={handleVoicePressOut}>
          <Text style={styles.voiceBtnText}>🎤 按住说话</Text>
        </TouchableOpacity>
      </View>

      {/* 背景选择弹窗 */}
      <Modal visible={showBgPicker} transparent animationType="fade" onRequestClose={() => setShowBgPicker(false)}>
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowBgPicker(false)}>
          <View style={styles.bgPicker}>
            <Text style={styles.bgPickerTitle}>选择聊天背景</Text>
            <View style={styles.bgGrid}>
              {BACKGROUNDS.map((bg) => (
                <TouchableOpacity
                  key={bg.id}
                  style={[styles.bgItem, {backgroundColor: bg.color}, bgColor === bg.color && styles.bgItemActive]}
                  onPress={() => changeBackground(bg.color)}>
                  <Text style={styles.bgItemText}>{bg.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 设置弹窗 */}
      <Modal visible={showSettings} transparent animationType="slide" onRequestClose={() => setShowSettings(false)}>
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowSettings(false)}>
          <View style={styles.settingsPanel}>
            <Text style={styles.settingsTitle}>设置</Text>
            <TouchableOpacity style={styles.settingsItem} onPress={() => { setShowSettings(false); setShowBgPicker(true); }}>
              <Text style={styles.settingsItemText}>🎨 更换背景</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingsItem}>
              <Text style={styles.settingsItemText}>🔔 消息通知</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingsItem}>
              <Text style={styles.settingsItemText}>🗑️ 清空聊天记录</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingsItem}>
              <Text style={styles.settingsItemText}>ℹ️ 关于 NovaMind</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  header: {
    height: 56,
    backgroundColor: 'rgba(247,247,247,0.95)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#D9D9D9',
  },
  headerLeft: {flexDirection: 'row', alignItems: 'center'},
  headerRight: {flexDirection: 'row'},
  headerTitle: {fontSize: 17, fontWeight: '600', color: '#111', marginRight: 8},
  headerStatus: {fontSize: 12, color: '#999'},
  headerStatusOnline: {color: '#07C160'},
  headerBtn: {padding: 8, marginLeft: 4},
  headerBtnText: {fontSize: 20},
  msgList: {flex: 1},
  msgListContent: {padding: 12, paddingBottom: 4},
  timeDivider: {alignItems: 'center', marginVertical: 12},
  timeDividerText: {fontSize: 12, color: '#999', backgroundColor: 'rgba(0,0,0,0.05)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12},
  msgRow: {flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end'},
  msgRowRight: {flexDirection: 'row-reverse'},
  avatar: {width: 36, height: 36, borderRadius: 4, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginHorizontal: 8, elevation: 1},
  avatarUser: {backgroundColor: '#07C160'},
  avatarText: {fontSize: 20},
  bubble: {maxWidth: '65%', padding: 10, borderRadius: 8, elevation: 0.5},
  bubbleLeft: {backgroundColor: '#fff'},
  bubbleRight: {backgroundColor: '#95EC69'},
  msgText: {fontSize: 16, color: '#111', lineHeight: 22},
  msgTextRight: {color: '#111'},
  mediaImage: {width: 200, height: 200, borderRadius: 8},
  mediaPlaceholder: {width: 160, height: 80, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.05)', justifyContent: 'center', alignItems: 'center'},
  mediaPlaceholderText: {fontSize: 28},
  mediaPlaceholderLabel: {fontSize: 12, color: '#666', marginTop: 4},
  audioPlayer: {flexDirection: 'row', alignItems: 'center', minWidth: 120},
  audioPlayBtn: {width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.05)', justifyContent: 'center', alignItems: 'center', marginRight: 8},
  audioPlayIcon: {fontSize: 12},
  audioWave: {flex: 1, flexDirection: 'row', alignItems: 'center', height: 20},
  audioWaveBar: {width: 3, backgroundColor: '#07C160', borderRadius: 1.5, marginHorizontal: 1},
  audioDuration: {fontSize: 12, color: '#666', marginLeft: 8},
  streamingDot: {fontSize: 16, color: '#07C160'},
  inputBar: {flexDirection: 'row', alignItems: 'center', padding: 8, backgroundColor: 'rgba(247,247,247,0.95)', borderTopWidth: 0.5, borderTopColor: '#D9D9D9'},
  iconBtn: {width: 36, height: 36, justifyContent: 'center', alignItems: 'center'},
  iconText: {fontSize: 22},
  input: {flex: 1, minHeight: 40, maxHeight: 100, backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, fontSize: 16, marginHorizontal: 8, borderWidth: 0.5, borderColor: '#ddd'},
  sendBtn: {height: 36, paddingHorizontal: 16, backgroundColor: '#07C160', borderRadius: 18, justifyContent: 'center', alignItems: 'center'},
  sendBtnText: {color: '#fff', fontSize: 15, fontWeight: '600'},
  voiceBar: {paddingVertical: 8, paddingHorizontal: 16, backgroundColor: 'rgba(247,247,247,0.95)', borderTopWidth: 0.5, borderTopColor: '#D9D9D9'},
  voiceBtn: {height: 40, backgroundColor: '#fff', borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#ddd'},
  voiceBtnText: {fontSize: 15, color: '#333'},
  modalOverlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center'},
  bgPicker: {backgroundColor: '#fff', borderRadius: 16, padding: 20, width: '80%', maxWidth: 320},
  bgPickerTitle: {fontSize: 18, fontWeight: '600', marginBottom: 16, textAlign: 'center'},
  bgGrid: {flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between'},
  bgItem: {width: '30%', height: 60, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12, borderWidth: 2, borderColor: 'transparent'},
  bgItemActive: {borderColor: '#07C160'},
  bgItemText: {fontSize: 13, color: '#333'},
  settingsPanel: {backgroundColor: '#fff', borderRadius: 16, padding: 20, width: '80%', maxWidth: 320},
  settingsTitle: {fontSize: 18, fontWeight: '600', marginBottom: 16, textAlign: 'center'},
  settingsItem: {paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: '#eee'},
  settingsItemText: {fontSize: 16, color: '#333'},
});
