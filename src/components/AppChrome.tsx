import { Ionicons } from '@expo/vector-icons';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';

export function AppHeader({
  title,
  notification = true,
}: {
  title?: string;
  notification?: boolean;
}) {
  const navigation = useNavigation();
  return (
    <View style={styles.header}>
      <Pressable onPress={() => navigation.dispatch(DrawerActions.openDrawer())} hitSlop={12}>
        <Ionicons name="menu" size={30} color={colors.ink} />
      </Pressable>
      {title ? <Text style={styles.title}>{title}</Text> : <View />}
      {notification ? (
        <Ionicons name="notifications-outline" size={25} color={colors.ink} />
      ) : (
        <View style={{ width: 25 }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 58,
    justifyContent: 'space-between',
  },
  title: { color: colors.ink, fontFamily: 'Poppins_700Bold', fontSize: 18 },
});
