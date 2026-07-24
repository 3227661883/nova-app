import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';

import {novaAPI} from '../api/nova-api';

export default function RegisterScreen({navigation}: any) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!username || !password) {
      Alert.alert('提示', '请输入用户名和密码');
      return;
    }
    if (password.length < 6) {
      Alert.alert('提示', '密码至少6位');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('提示', '两次密码不一致');
      return;
    }

    setLoading(true);
    try {
      const res = await novaAPI.register(username, password, nickname || username);
      if (res.ok) {
        Alert.alert('注册成功', '请登录', [
          {text: '去登录', onPress: () => navigation.replace('Login')},
        ]);
      } else {
        Alert.alert('注册失败', res.error || '未知错误');
      }
    } catch {
      Alert.alert('网络错误', '请检查网络连接');
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>✨ NOVA</Text>
      <Text style={styles.subtitle}>创建账号</Text>

      <TextInput
        style={styles.input}
        placeholder="用户名"
        placeholderTextColor="#999"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="昵称（可选）"
        placeholderTextColor="#999"
        value={nickname}
        onChangeText={setNickname}
      />
      <TextInput
        style={styles.input}
        placeholder="密码（至少6位）"
        placeholderTextColor="#999"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TextInput
        style={styles.input}
        placeholder="确认密码"
        placeholderTextColor="#999"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>注册</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.link}>已有账号？去登录</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#EDEDED', padding: 20},
  logo: {fontSize: 48, fontWeight: 'bold', color: '#07C160', marginBottom: 8},
  subtitle: {fontSize: 16, color: '#888', marginBottom: 40},
  input: {width: '100%', height: 48, backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 16, fontSize: 16, marginBottom: 12, borderWidth: 1, borderColor: '#ddd'},
  button: {width: '100%', height: 48, backgroundColor: '#07C160', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 8},
  buttonText: {color: '#fff', fontSize: 18, fontWeight: '600'},
  link: {color: '#07C160', fontSize: 14, marginTop: 20},
});