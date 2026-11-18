import 'react-native-gesture-handler';

import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  useFonts,
} from '@expo-google-fonts/poppins';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';

import { AuthProvider } from './src/auth/AuthContext';
import { ApplicationProvider } from './src/application/ApplicationContext';
import { SchoolDataProvider } from './src/data/SchoolContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { PushRegistration } from './src/notifications/PushRegistration';
import { ConsentFormsReminder } from './src/notifications/ConsentFormsReminder';
import { colors } from './src/theme';

const TextWithDefaults = Text as typeof Text & { defaultProps?: { style?: unknown } };
const InputWithDefaults = TextInput as typeof TextInput & { defaultProps?: { style?: unknown } };
TextWithDefaults.defaultProps = {
  ...TextWithDefaults.defaultProps,
  style: [{ fontFamily: 'Poppins_400Regular' }, TextWithDefaults.defaultProps?.style],
};
InputWithDefaults.defaultProps = {
  ...InputWithDefaults.defaultProps,
  style: [{ fontFamily: 'Poppins_400Regular' }, InputWithDefaults.defaultProps?.style],
};

export default function App() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });
  if (!fontsLoaded)
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.green} />
      </View>
    );
  return (
    <AuthProvider>
      <PushRegistration>
        <ApplicationProvider>
          <SchoolDataProvider>
            <StatusBar style="dark" />
            <ConsentFormsReminder />
            <AppNavigator />
          </SchoolDataProvider>
        </ApplicationProvider>
      </PushRegistration>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: 'center',
    backgroundColor: colors.cream,
    flex: 1,
    justifyContent: 'center',
  },
});
