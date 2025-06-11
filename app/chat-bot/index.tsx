import { Stack } from 'expo-router';
import React from 'react';
import ChatBotUI from './frontend/ChatBotUI';

export default function ChatBotScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'AI Chat' }} />
      <ChatBotUI />
    </>
  );
} 