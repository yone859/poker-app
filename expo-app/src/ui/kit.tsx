/**
 * 共通の部品。Web版では HTML 要素と CSS で作っていたものを、React Native の部品で作り直したもの。
 * - <div> → <View>、文字 → <Text>（React Native では文字は必ず <Text> の中に書く）
 * - <button> → <Pressable>、<input> → <TextInput>、<select> → ボタンを並べる（Segmented）
 */
import type { ReactNode } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { colors, font, MAX_WIDTH } from './theme';

// ---------- 文字 ----------

type TextVariant = 'body' | 'h1' | 'h2' | 'muted' | 'small' | 'mutedSmall';

export function T({
  children,
  variant = 'body',
  style,
  testID,
  numberOfLines,
}: {
  children: ReactNode;
  variant?: TextVariant;
  style?: StyleProp<TextStyle>;
  testID?: string;
  numberOfLines?: number;
}) {
  return (
    <Text testID={testID} numberOfLines={numberOfLines} style={[textStyles.base, textStyles[variant], style]}>
      {children}
    </Text>
  );
}

const textStyles = StyleSheet.create({
  base: { color: colors.text, fontSize: font.body, lineHeight: 23 },
  body: {},
  h1: { fontSize: font.h1, fontWeight: '700', lineHeight: 30 },
  h2: { fontSize: font.h2, fontWeight: '700', marginBottom: 4 },
  muted: { color: colors.muted },
  small: { fontSize: font.small, lineHeight: 18 },
  mutedSmall: { color: colors.muted, fontSize: font.small, lineHeight: 18 },
});

// ---------- 画面の外枠 ----------

/** 画面全体。ノッチなどを避け（SafeArea）、縦にスクロールできる */
export function Screen({ children, scroll = true, testID }: { children: ReactNode; scroll?: boolean; testID?: string }) {
  const inner = <View style={layout.inner}>{children}</View>;
  return (
    <SafeAreaView style={layout.safe} testID={testID}>
      {scroll ? (
        <ScrollView contentContainerStyle={layout.scroll} keyboardShouldPersistTaps="handled">
          {inner}
        </ScrollView>
      ) : (
        <View style={layout.scroll}>{inner}</View>
      )}
    </SafeAreaView>
  );
}

export function ScreenHeader({ title, onBack, backTestID }: { title: string; onBack: () => void; backTestID?: string }) {
  const { t } = useTranslation();
  return (
    <View style={layout.header}>
      <Btn variant="link" onPress={onBack} testID={backTestID ?? 'back'}>
        {t('common.back')}
      </Btn>
      <T variant="h1" testID="screen-title">
        {title}
      </T>
    </View>
  );
}

export function Card({ children, style, testID }: { children: ReactNode; style?: StyleProp<ViewStyle>; testID?: string }) {
  return (
    <View style={[layout.card, style]} testID={testID}>
      {children}
    </View>
  );
}

export function Row({ children, style, wrap }: { children: ReactNode; style?: StyleProp<ViewStyle>; wrap?: boolean }) {
  return <View style={[layout.row, wrap && layout.wrap, style]}>{children}</View>;
}

export function Notice({ children, testID }: { children: ReactNode; testID?: string }) {
  return (
    <View style={layout.notice} testID={testID}>
      <T variant="small" style={{ fontSize: 14 }}>
        {children}
      </T>
    </View>
  );
}

const layout = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, alignItems: 'center' },
  inner: { width: '100%', maxWidth: MAX_WIDTH, paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  header: { alignItems: 'flex-start', gap: 2 },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  wrap: { flexWrap: 'wrap' },
  notice: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: colors.noticeBg,
    borderWidth: 1,
    borderColor: colors.noticeBorder,
  },
});

// ---------- ボタン ----------

export type BtnVariant =
  | 'default'
  | 'primary'
  | 'link'
  | 'danger'
  | 'dangerFill'
  | 'fold'
  | 'call'
  | 'raise'
  | 'icon';

interface BtnProps {
  children: ReactNode;
  onPress: () => void;
  variant?: BtnVariant;
  big?: boolean;
  selected?: boolean;
  disabled?: boolean;
  flex?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  testID?: string;
  /** 読み上げ機能向けの名前（表示が記号だけのボタンなど） */
  label?: string;
  role?: 'button' | 'radio';
}

export function Btn({
  children,
  onPress,
  variant = 'default',
  big,
  selected,
  disabled,
  flex,
  style,
  textStyle,
  testID,
  label,
  role = 'button',
}: BtnProps) {
  return (
    <Pressable
      testID={testID}
      // role・aria-* は Android・iOS・Web のすべてで読み上げ機能に伝わる（古い accessibility* の書き方は Web に出力されない）
      role={role}
      aria-label={label}
      aria-disabled={!!disabled}
      aria-checked={role === 'radio' ? !!selected : undefined}
      aria-selected={role === 'button' ? !!selected : undefined}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        btn.base,
        btn[variant],
        big && btn.big,
        selected && (variant === 'default' ? btn.selectedOutline : btn.selectedFill),
        flex && { flex: 1 },
        disabled && btn.disabled,
        pressed && !disabled && btn.pressed,
        style,
      ]}
    >
      <Text
        style={[
          btn.text,
          btnText[variant],
          big && btn.bigText,
          selected && (variant === 'default' ? btnText.selectedOutline : btnText.selectedFill),
          textStyle,
        ]}
      >
        {children}
      </Text>
    </Pressable>
  );
}

const btn = StyleSheet.create({
  base: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  default: {},
  primary: { backgroundColor: colors.accent, borderColor: colors.accent },
  link: { backgroundColor: 'transparent', borderWidth: 0, paddingHorizontal: 0, minHeight: 32, alignItems: 'flex-start' },
  danger: {},
  dangerFill: { backgroundColor: colors.danger, borderColor: colors.danger },
  fold: { backgroundColor: colors.fold, borderWidth: 0, minHeight: 52 },
  call: { backgroundColor: colors.call, borderWidth: 0, minHeight: 52 },
  raise: { backgroundColor: colors.raise, borderWidth: 0, minHeight: 52 },
  icon: { minWidth: 40, paddingHorizontal: 0 },
  big: { minHeight: 52 },
  selectedOutline: { borderColor: colors.accent },
  selectedFill: { backgroundColor: colors.accent, borderColor: colors.accent },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.75 },
  text: { color: colors.text, fontSize: font.body, textAlign: 'center' },
  bigText: { fontSize: 17 },
});

const btnText = StyleSheet.create({
  default: {},
  primary: { color: colors.accentText, fontWeight: '700' },
  link: { color: colors.accent, textAlign: 'left' },
  danger: { color: colors.danger },
  dangerFill: { color: colors.white, fontWeight: '700' },
  fold: { color: colors.white, fontWeight: '700' },
  call: { color: colors.white, fontWeight: '700' },
  raise: { color: colors.white, fontWeight: '700' },
  icon: {},
  selectedOutline: { color: colors.accent },
  selectedFill: { color: colors.accentText, fontWeight: '700' },
});

// ---------- 入力 ----------

/** 数値の入力欄。空欄のときは NaN を返す（入力チェックで弾く） */
export function NumberInput({
  value,
  onChange,
  label,
  style,
  testID,
}: {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  style?: StyleProp<TextStyle>;
  testID?: string;
}) {
  return (
    <TextInput
      testID={testID}
      aria-label={label}
      style={[inputStyle.field, inputStyle.number, style]}
      keyboardType="number-pad"
      value={Number.isNaN(value) ? '' : String(value)}
      onChangeText={(text) => {
        const digits = text.replace(/[^0-9]/g, '');
        onChange(digits === '' ? NaN : Number(digits));
      }}
      selectTextOnFocus
    />
  );
}

export function TextField({
  value,
  onChange,
  placeholder,
  testID,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  testID?: string;
}) {
  return (
    <TextInput
      testID={testID}
      style={[inputStyle.field, { flex: 1 }]}
      value={value}
      placeholder={placeholder}
      placeholderTextColor={colors.muted}
      onChangeText={onChange}
    />
  );
}

export const inputStyle = StyleSheet.create({
  field: {
    minHeight: 40,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    color: colors.text,
    fontSize: font.body,
    minWidth: 0,
  },
  number: { textAlign: 'right' },
});

/** 選択肢をボタンで並べる（<select> の代わり） */
export function Segmented<V extends string | number>({
  value,
  options,
  onChange,
  wrap,
  testID,
}: {
  value: V;
  options: { value: V; label: string }[];
  onChange: (value: V) => void;
  wrap?: boolean;
  testID?: string;
}) {
  return (
    <View style={[layout.row, { gap: 4 }, wrap && layout.wrap]} testID={testID} role="radiogroup">
      {options.map((o) => (
        <Btn
          key={String(o.value)}
          role="radio"
          variant="primary"
          selected={o.value === value}
          onPress={() => onChange(o.value)}
          style={o.value === value ? undefined : { backgroundColor: colors.surface2, borderColor: colors.border }}
          textStyle={o.value === value ? undefined : { color: colors.text, fontWeight: '400' }}
          testID={testID ? `${testID}-${o.value}` : undefined}
        >
          {o.label}
        </Btn>
      ))}
    </View>
  );
}

// ---------- モーダル ----------

/** 画面の下からせり上がるパネル（順位、履歴） */
export function Sheet({
  title,
  onClose,
  children,
  testID,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  testID?: string;
}) {
  const { t } = useTranslation();
  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <View style={sheet.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} aria-label={t('common.close')} />
        <SafeAreaView edges={['bottom']} style={sheet.panel} testID={testID}>
          <Row style={{ justifyContent: 'space-between' }}>
            <T variant="h2">{title}</T>
            <Btn variant="icon" onPress={onClose} label={t('common.close')} testID="sheet-close">
              ×
            </Btn>
          </Row>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 4, paddingBottom: 16 }}>
            {children}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

/** 確認ダイアログ（Web版の ConfirmDialog と同じ） */
export function ConfirmDialog({
  message,
  confirmLabel,
  danger,
  onConfirm,
  onCancel,
}: {
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Modal transparent animationType="fade" onRequestClose={onCancel}>
      <View style={[sheet.backdrop, { justifyContent: 'center', padding: 16 }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        <View style={sheet.dialog} testID="dialog" role="alertdialog">
          <T style={{ lineHeight: 26 }}>{message}</T>
          <Row>
            <Btn flex onPress={onCancel} testID="dialog-cancel">
              {t('common.cancel')}
            </Btn>
            <Btn flex variant={danger ? 'dangerFill' : 'primary'} onPress={onConfirm} testID="dialog-ok">
              {confirmLabel}
            </Btn>
          </Row>
        </View>
      </View>
    </Modal>
  );
}

const sheet = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.backdrop, justifyContent: 'flex-end', alignItems: 'center' },
  panel: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    maxHeight: '85%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    gap: 8,
  },
  dialog: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
});
