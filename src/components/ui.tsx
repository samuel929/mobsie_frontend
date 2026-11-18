import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  KeyboardTypeOptions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, shadow } from '../theme';

export function Screen({
  children,
  scroll = true,
  style,
  onRefresh,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
  onRefresh?: () => Promise<void> | void;
}) {
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    if (!onRefresh || refreshing) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh, refreshing]);

  const content = scroll ? (
    <ScrollView
      contentContainerStyle={[s.content, onRefresh && s.refreshableContent, style]}
      showsVerticalScrollIndicator={false}
      alwaysBounceVertical={Boolean(onRefresh)}
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.green}
            colors={[colors.green]}
            progressBackgroundColor={colors.paper}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[s.content, s.flex, style]}>{children}</View>
  );
  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        style={s.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {content}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function Header({
  title,
  onMenu,
  onBell = true,
  fallbackRoute,
}: {
  title?: string;
  onMenu?: () => void;
  onBell?: boolean;
  fallbackRoute?: string;
}) {
  const navigation = useNavigation<any>();
  const handleLeadingPress = () => {
    if (onMenu) {
      onMenu();
      return;
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    if (fallbackRoute) navigation.navigate(fallbackRoute);
  };
  return (
    <View style={s.header}>
      <Pressable onPress={handleLeadingPress} hitSlop={12}>
        <Ionicons name={onMenu ? 'menu' : 'chevron-back'} size={24} color={colors.ink} />
      </Pressable>
      <Text style={s.headerTitle}>{title}</Text>
      {onBell ? (
        <Ionicons name="notifications-outline" size={21} color={colors.ink} />
      ) : (
        <View style={{ width: 21 }} />
      )}
    </View>
  );
}
export function Button({
  title,
  onPress,
  color = colors.orange,
  outline = false,
  icon,
  disabled = false,
  style
}: {
  title: string;
  onPress?: () => void;
  color?: string;
  outline?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        {
          backgroundColor: outline ? 'transparent' : color,
          borderColor: color,
          opacity: disabled ? 0.55 : pressed ? 0.82 : 1,
        },
        style
      ]}
    >
      {icon && <Ionicons name={icon} size={17} color={outline ? color : '#fff'} />}
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[s.buttonText, { color: outline ? color : '#fff' }]}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[s.card, style]}>{children}</View>;
}
export function Field({
  label,
  placeholder,
  value,
  onChangeText,
  keyboardType = 'default',
  multiline = false,
  secureTextEntry = false,
  error,
  autoCapitalize,
  autoCorrect,
  autoComplete,
  textContentType,
  rightIcon,
  onRightIconPress,
}: {
  label: string;
  placeholder?: string;
  value?: string;
  onChangeText?: (v: string) => void;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  secureTextEntry?: boolean;
  error?: string;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoCorrect?: boolean;
  autoComplete?: TextInputProps['autoComplete'];
  textContentType?: TextInputProps['textContentType'];
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
}) {
  return (
    <View style={s.fieldWrap}>
      <Text style={s.label}>{label}</Text>
      <View style={s.inputRow}>
        <TextInput
          style={[
            s.input,
            rightIcon && { paddingRight: 50 },
            multiline && { height: 72, textAlignVertical: 'top' },
            error && s.inputError,
          ]}
          placeholder={placeholder}
          placeholderTextColor="#AAA"
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          multiline={multiline}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          autoComplete={autoComplete}
          textContentType={textContentType}
        />
        {!!rightIcon && (
          <Pressable accessibilityRole="button" accessibilityLabel="Toggle password visibility" style={s.inputIcon} onPress={onRightIconPress} hitSlop={10}>
            <Ionicons name={rightIcon} size={22} color={colors.muted} />
          </Pressable>
        )}
      </View>
      {!!error && <Text style={s.fieldError}>{error}</Text>}
    </View>
  );
}
export function SectionTitle({ title, action }: { title: string; action?: string }) {
  return (
    <View style={s.sectionRow}>
      <Text style={s.sectionTitle}>{title}</Text>
      {action && <Text style={s.action}>{action}</Text>}
    </View>
  );
}
export function Avatar({
  name,
  size = 48,
  color = colors.green,
}: {
  name: string;
  size?: number;
  color?: string;
}) {
  return (
    <View
      style={[
        s.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
      ]}
    >
      <Text style={[s.avatarText, { fontSize: size * 0.32 }]}>
        {name
          .split(' ')
          .map((x) => x[0])
          .join('')
          .slice(0, 2)}
      </Text>
    </View>
  );
}
export function Progress({ step }: { step: number }) {
  return (
    <View>
      <Text style={s.step}>Step {step} of 3</Text>
      <View style={s.track}>
        <View style={[s.fill, { width: `${(step / 3) * 100}%` }]} />
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  keyboardAvoidingView: { flex: 1 },
  flex: { flex: 1 },
  content: { padding: 18, paddingBottom: 36 },
  refreshableContent: { flexGrow: 1 },
  header: {
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: colors.ink },
  card: {
    backgroundColor: colors.paper,
    borderRadius: radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F0ECE3',
    ...shadow,
  },
  button: {
    height: 46,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    marginVertical: 5,
  },
  buttonText: { fontFamily: 'Poppins_700Bold', fontSize: 14, lineHeight: 20 },
  fieldWrap: { marginVertical: 7 },
  inputRow: { position: 'relative' },
  inputIcon: { position: 'absolute', right: 16, top: 0, bottom: 0, justifyContent: 'center' },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 6,
  },
  input: {
    height: 45,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    color: colors.text,
  },
  inputError: { borderColor: colors.danger, borderWidth: 1.5 },
  fieldError: { color: colors.danger, fontSize: 9, marginTop: 4 },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: colors.ink },
  action: { fontSize: 11, color: colors.blue, fontWeight: '700' },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  avatarText: { color: '#fff', fontWeight: '900' },
  step: {
    fontSize: 11,
    color: colors.green,
    fontWeight: '800',
    marginBottom: 5,
  },
  track: { height: 4, backgroundColor: '#DCEBE7', borderRadius: 3 },
  fill: { height: 4, backgroundColor: colors.green, borderRadius: 3 },
});
