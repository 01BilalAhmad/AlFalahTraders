// Powered by OnSpace.AI
import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/contexts/AuthContext';
import { ShopsProvider } from '@/contexts/ShopsContext';
import { LockProvider } from '@/contexts/LockContext';
import { LockOverlay } from '@/components/LockOverlay';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ShopsProvider>
          <LockProvider>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="login" />
              <Stack.Screen name="(tabs)" />
            </Stack>
            <LockOverlay />
          </LockProvider>
        </ShopsProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
