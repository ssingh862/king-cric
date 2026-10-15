import { createThemedStyles } from '../../lib/theme';
import { ReactNode, useEffect, useRef } from 'react';
import {
  findNodeHandle,
  Keyboard,
  Platform,
  ScrollView,
  TextInput,
  type ReactElement,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface KeyboardFormProps {
  children: ReactNode;
  contentContainerStyle?: ViewStyle;
  refreshControl?: ReactElement;
}

type KeyboardScroller = {
  scrollResponderScrollNativeHandleToKeyboard?: (
    nodeHandle: number,
    additionalOffset: number,
    preventNegativeScrollOffset: boolean,
  ) => void;
};

let activeScroll: ScrollView | null = null;

/** Called when any field is focused so it can move above an already-open keyboard. */
export function revealFocusedField() {
  const reveal = () => scrollFocusedField(activeScroll);
  requestAnimationFrame(reveal);
  setTimeout(reveal, 80);
}

function scrollFocusedField(scroll: ScrollView | null) {
  const focused = TextInput.State.currentlyFocusedInput?.();
  const handle = focused ? findNodeHandle(focused as never) : null;
  const responder = scroll?.getScrollResponder?.() as KeyboardScroller | undefined;
  if (handle == null || !responder?.scrollResponderScrollNativeHandleToKeyboard) return;
  responder.scrollResponderScrollNativeHandleToKeyboard(handle, 140, true);
}

/** Scrollable form that keeps the focused field above the keyboard. */
export function KeyboardForm({ children, contentContainerStyle, refreshControl }: KeyboardFormProps) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const bindScroll = (node: ScrollView | null) => {
    scrollRef.current = node;
    activeScroll = node;
  };

  useEffect(() => {
    const event = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const sub = Keyboard.addListener(event, () => {
      const reveal = () => scrollFocusedField(scrollRef.current);
      requestAnimationFrame(reveal);
      setTimeout(reveal, 120);
    });
    return () => sub.remove();
  }, []);

  return (
    <ScrollView
      ref={bindScroll}
      style={styles.flex}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
      automaticallyAdjustKeyboardInsets
      contentContainerStyle={[
        styles.content,
        contentContainerStyle,
        { paddingBottom: Math.max(insets.bottom, 24) + 280 },
      ]}
    >
      {children}
    </ScrollView>
  );
}

const styles = createThemedStyles({
  flex: { flex: 1 },
  content: { padding: 20, flexGrow: 1 },
});
