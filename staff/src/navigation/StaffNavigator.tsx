import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { QueueScreen } from '../screens/QueueScreen';
import { JobDetailScreen } from '../screens/JobDetailScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { libraryColors } from '../theme/colors';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const QueueStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="QueueList" component={QueueScreen} />
    <Stack.Screen name="JobDetail" component={JobDetailScreen} />
  </Stack.Navigator>
);

export const StaffNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: libraryColors.primary,
        tabBarInactiveTintColor: libraryColors.mediumGray,
        tabBarStyle: {
          backgroundColor: libraryColors.white,
          borderTopColor: libraryColors.borderLight,
          height: 60,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          fontFamily: 'GoogleSansFlex_400Regular',
        },
      }}
    >
      <Tab.Screen
        name="Queue"
        component={QueueStack}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'print' : 'print-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'time' : 'time-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'settings' : 'settings-outline'} size={22} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};
