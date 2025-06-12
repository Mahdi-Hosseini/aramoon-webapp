import { Stack } from 'expo-router';
import React from 'react';
import ChatBotUI from './frontend/ChatBotUI';

export default function ChatBotScreen() {
  return (
    <>
      <Stack.Screen options={{ 
        title: 'Aramoon AI Assistant',
        headerStyle: { backgroundColor: '#A183BF' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' }
      }} />
      <ChatBotUI />
    </>
  );
} 