import React, {useState, useEffect, useRef, useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';

// 语音播放组件
// 功能：点击自动播放、播放动画、进度显示、时长显示

interface VoicePlayerProps {
  uri: string;
  duration: number; // 秒
  isUser: boolean;
}

export default function VoicePlayer({uri, duration, isUser}: VoicePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const waveAnim = useRef(new Animated.Value(0)).current;

  // 自动播放（收到语音消息时）
  useEffect(() => {
    if (!isUser) {
      // 对方发的语音，自动播放
      playAudio();
    }
    return () => stopAudio();
  }, [uri]);

  const playAudio = useCallback(() => {
    setIsPlaying(true);
    setCurrentTime(0);

    // 播放动画
    Animated.loop(
      Animated.sequence([
        Animated.timing(waveAnim, {toValue: 1, duration: 300, useNativeDriver: true}),
        Animated.timing(waveAnim, {toValue: 0, duration: 300, useNativeDriver: true}),
      ]),
    ).start();

    // 模拟播放进度（实际项目中使用 react-native-sound）
    timerRef.current = setInterval(() => {
      setCurrentTime((prev) => {
        if (prev >= duration) {
          stopAudio();
          return 0;
        }
        return prev + 1;
      });
    }, 1000);
  }, [duration]);

  const stopAudio = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsPlaying(false);
    waveAnim.stopAnimation();
    waveAnim.setValue(0);
  }, []);

  const togglePlay = () => {
    if (isPlaying) {
      stopAudio();
    } else {
      playAudio();
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // 波形动画条
  const renderWaveform = () => {
    const bars = [0.4, 0.7, 1, 0.6, 0.8, 0.5, 0.9, 0.7, 0.6, 0.8, 0.5, 0.7];
    return (
      <View style={styles.waveform}>
        {bars.map((height, index) => (
          <Animated.View
            key={index}
            style={[
              styles.waveBar,
              {
                height: waveAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [4, height * 20],
                }),
                backgroundColor: isUser ? '#1aad19' : '#07C160',
              },
            ]}
          />
        ))}
      </View>
    );
  };

  return (
    <TouchableOpacity
      style={[styles.container, isUser && styles.containerUser]}
      onPress={togglePlay}
      activeOpacity={0.7}>
      <View style={styles.playIcon}>
        <Text style={[styles.playIconText, isUser && styles.playIconTextUser]}>
          {isPlaying ? '⏸' : '▶'}
        </Text>
      </View>

      {isPlaying ? renderWaveform() : <View style={styles.waveformPlaceholder} />}

      <Text style={[styles.duration, isUser && styles.durationUser]}>
        {formatTime(isPlaying ? currentTime : duration)}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 120,
  },
  containerUser: {backgroundColor: '#95EC69'},
  playIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  playIconText: {fontSize: 14, color: '#333'},
  playIconTextUser: {color: '#1aad19'},
  waveform: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 24,
    marginRight: 8,
  },
  waveBar: {
    width: 3,
    borderRadius: 1.5,
    marginHorizontal: 1,
  },
  waveformPlaceholder: {
    flex: 1,
    height: 24,
    marginRight: 8,
  },
  duration: {fontSize: 12, color: '#666', minWidth: 30, textAlign: 'right'},
  durationUser: {color: '#333'},
});
