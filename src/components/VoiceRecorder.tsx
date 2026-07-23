import React, {useState, useRef, useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
  Alert,
} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';

// 语音录音组件
// 功能：长按录音、松开发送、上滑取消、录制时长显示

interface VoiceRecorderProps {
  onSend: (uri: string, duration: number) => void;
  onCancel?: () => void;
}

export default function VoiceRecorder({onSend, onCancel}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [cancelMode, setCancelMode] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // 开始录音
  const startRecording = useCallback(() => {
    setIsRecording(true);
    setRecordingTime(0);
    setCancelMode(false);
    startTimeRef.current = Date.now();

    // 模拟录音计时（实际项目中使用 react-native-sound 录音）
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setRecordingTime(elapsed);
      if (elapsed >= 60) {
        // 最长60秒自动停止
        stopRecording(true);
      }
    }, 1000);

    // 录音动画
    Animated.spring(scaleAnim, {
      toValue: 1.3,
      useNativeDriver: true,
    }).start();
  }, []);

  // 停止录音
  const stopRecording = useCallback(
    (send: boolean) => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);

      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }).start();

      if (send && duration >= 1) {
        // 生成模拟音频 URI（实际项目中是真实录音文件）
        const mockUri = `file:///tmp/record_${Date.now()}.m4a`;
        onSend(mockUri, duration);
      } else {
        onCancel?.();
      }

      setIsRecording(false);
      setRecordingTime(0);
      setCancelMode(false);
    },
    [onSend, onCancel],
  );

  // 上滑取消手势
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => isRecording,
    onMoveShouldSetPanResponder: () => isRecording,
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy < -50) {
        setCancelMode(true);
      } else {
        setCancelMode(false);
      }
    },
    onPanResponderRelease: () => {
      if (cancelMode) {
        stopRecording(false);
      } else {
        stopRecording(true);
      }
    },
  });

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      {isRecording && (
        <Animated.View
          style={[
            styles.recordingOverlay,
            {transform: [{scale: scaleAnim}]},
          ]}>
          <View
            style={[
              styles.recordingBubble,
              cancelMode && styles.recordingBubbleCancel,
            ]}>
            <Text style={styles.recordingIcon}>
              {cancelMode ? '🗑️' : '🎤'}
            </Text>
            <Text style={styles.recordingTime}>{formatTime(recordingTime)}</Text>
            <Text style={styles.recordingHint}>
              {cancelMode ? '松开取消' : '上滑取消'}
            </Text>
          </View>
        </Animated.View>
      )}

      <TouchableOpacity
        style={[styles.voiceBtn, isRecording && styles.voiceBtnActive]}
        onPressIn={startRecording}
        onPressOut={() => isRecording && stopRecording(!cancelMode)}
        {...panResponder.panHandlers}>
        <Text style={styles.voiceBtnText}>{isRecording ? '🎤' : '🔊'}</Text>
        <Text style={styles.voiceBtnLabel}>
          {isRecording ? formatTime(recordingTime) : '按住说话'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  voiceBtn: {
    width: '100%',
    height: 44,
    backgroundColor: '#fff',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  voiceBtnActive: {
    backgroundColor: '#07C160',
    borderColor: '#07C160',
  },
  voiceBtnText: {fontSize: 18, marginRight: 8},
  voiceBtnLabel: {fontSize: 15, color: '#333'},
  recordingOverlay: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
    zIndex: 100,
  },
  recordingBubble: {
    backgroundColor: 'rgba(7, 193, 96, 0.95)',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 32,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  recordingBubbleCancel: {
    backgroundColor: 'rgba(255, 71, 87, 0.95)',
  },
  recordingIcon: {fontSize: 40, marginBottom: 8},
  recordingTime: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  recordingHint: {fontSize: 13, color: 'rgba(255,255,255,0.8)'},
});
