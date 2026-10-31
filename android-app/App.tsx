// App.tsx: Green Room for Android, native screens mirroring the web phone flow (components/mobile.tsx).
// Start (example or your work) -> optional fans-also-love -> confirm ambiguous titles -> card deck (swipe right keeps,
// left skips, every gesture has a button, "i" shows Qloo facts) -> "Your 3 picks" with Copy pitch and Share.
import { StatusBar } from "expo-status-bar";
import * as Clipboard from "expo-clipboard";
import { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator, Animated, Image, Modal, PanResponder, Platform, Pressable, ScrollView, Share,
  StatusBar as RNStatusBar, StyleSheet, Text, TextInput, Vibration, View,
} from "react-native";
import { API_BASE, runBrief, showDetail } from "./src/api";
import {
  DEMO_BRIEF, draftPitch, fitOf, GOAL, hasDeck, parseSeeds, plainLine, stateMessage,
  type Brief, type Run, type Show, type ShowDetail,
} from "./src/logic";

const C = { paper: "#faf6ef", card: "#ffffff", ink: "#1f2a24", muted: "#5b6660", line: "#ddd6c8", primary: "#2f6b4f", coral: "#b8432c" };
const SWIPE_AT = 110;
const buzz = () => Vibration.vibrate(12);

export default function App() {
  const [work, setWork] = useState("");
  const [seedText, setSeedText] = useState("");
  const [step, setStep] = useState<"start" | "seeds">("start");
  const [brief, setBrief] = useState<Brief | null>(null);
  const [run, setRun] = useState<Run | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decided, setDecided] = useState<Set<string>>(new Set());
  const [kept, setKept] = useState<Show[]>([]);
  const [showPicks, setShowPicks] = useState(false);
  const [details, setDetails] = useState<Record<string, ShowDetail>>({});

  async function go(next: Brief) {
    setBrief(next); setBusy(true); setError(null);
    setDecided(new Set()); setKept([]); setShowPicks(false); setDetails({});
    try {
      setRun(await runBrief(next));
    } catch (e) {
      setRun(null);
      const m = e instanceof Error ? e.message : "";
      setError(m === "rate_limited" ? "Too many tries in a row. Wait a minute and try again." : "Couldn't reach Green Room. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const restart = () => { setRun(null); setBrief(null); setError(null); setStep("start"); };
  const deck = (run?.results ?? []).filter((s) => !decided.has(s.id));
  const decide = (show: Show, keep: boolean) => {
    buzz();
    setDecided((d) => new Set(d).add(show.id));
    if (keep) {
      setKept((k) => {
        const next = [...k, show];
        if (next.length >= GOAL) setTimeout(() => setShowPicks(true), 250);
        return next;
      });
    }
  };
  const loadDetail = async (show: Show) => {
    if (details[show.id] || !run?.workId) return;
    try {
      const d = await showDetail(run.workId, show.id);
      setDetails((x) => ({ ...x, [show.id]: d }));
    } catch { /* facts are optional */ }
  };

  let screen: React.ReactNode;
  if (!API_BASE) screen = <Notice title="API not configured" body="This build has no EXPO_PUBLIC_API_BASE. Set it to the deployed Green Room URL in eas.json and build again." />;
  else if (busy) screen = <Listening work={brief?.work ?? work} />;
  else if (error) screen = <Notice title="Not this time" body={error} action="Try again" onAction={() => brief && go(brief)} onBack={restart} />;
  else if (run?.state === "needs_confirmation" && brief) screen = <PickScreen run={run} brief={brief} onGo={go} onBack={restart} />;
  else if (run && hasDeck(run) && brief) {
    screen = showPicks || deck.length === 0
      ? <PicksScreen work={brief.work} kept={kept} details={details} canSwipe={deck.length > 0} onMore={() => setShowPicks(false)} onRestart={restart} />
      : <DeckScreen run={run} deck={deck} kept={kept.length} details={details} onDetail={loadDetail} onDecide={decide} onPicks={() => setShowPicks(true)} onRestart={restart} />;
  } else if (run) screen = <Notice title="No matches yet" body={stateMessage(run)} action="Start over" onAction={restart} />;
  else if (step === "seeds") {
    screen = <SeedsScreen work={work} seedText={seedText} setSeedText={setSeedText} onBack={() => setStep("start")}
      onGo={() => go({ work: work.trim(), seeds: parseSeeds(seedText), confirmed: {} })} />;
  } else screen = <StartScreen work={work} setWork={setWork} onDemo={() => go(DEMO_BRIEF)} onNext={() => setStep("seeds")} />;

  return (
    <View style={s.root}>
      <StatusBar style="dark" />
      {screen}
    </View>
  );
}

// ---------- Shared pieces

function Button({ label, onPress, kind = "primary", disabled }: { label: string; onPress: () => void; kind?: "primary" | "ghost" | "coral"; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled}
      style={({ pressed }) => [s.btn, kind === "primary" && s.btnPrimary, kind === "coral" && s.btnCoral, kind === "ghost" && s.btnGhost, (pressed || disabled) && { opacity: disabled ? 0.5 : 0.85 }]}>
      <Text style={[s.btnText, kind === "ghost" && { color: C.ink }]}>{label}</Text>
    </Pressable>
  );
}

function Header({ onBack, right }: { onBack?: () => void; right?: React.ReactNode }) {
  return (
    <View style={s.header}>
      {onBack ? <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} style={s.iconBtn}><Text style={s.iconText}>←</Text></Pressable> : <View style={s.iconBtn} />}
      <Text style={s.brand}>Green Room</Text>
      <View style={s.iconBtn}>{right}</View>
    </View>
  );
}

function Notice({ title, body, action, onAction, onBack }: { title: string; body: string; action?: string; onAction?: () => void; onBack?: () => void }) {
  return (
    <View style={s.page}>
      <Header onBack={onBack} />
      <Text style={s.h1}>{title}</Text>
      <Text style={s.lead}>{body}</Text>
      {action && onAction && <View style={{ marginTop: 24 }}><Button label={action} onPress={onAction} /></View>}
    </View>
  );
}

function Listening({ work }: { work: string }) {
  return (
    <View style={[s.page, { justifyContent: "center", alignItems: "center" }]}>
      <ActivityIndicator size="large" color={C.primary} />
      <Text style={[s.lead, { textAlign: "center" }]}>Asking Qloo which podcasts fans of {work || "your work"} love…</Text>
    </View>
  );
}

function ModeLine({ mode }: { mode: Run["mode"] }) {
  return <Text style={s.mode}>{mode === "live" ? "Real data from Qloo" : "SAMPLE data, not Qloo results"}</Text>;
}

// ---------- Start and seeds

function StartScreen({ work, setWork, onDemo, onNext }: { work: string; setWork: (v: string) => void; onDemo: () => void; onNext: () => void }) {
  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
      <Header />
      <Text style={s.h1}>Get on the podcasts your fans <Text style={{ color: C.coral }}>already love.</Text></Text>
      <Text style={s.lead}>Swipe through real matches. Keep three.</Text>
      <Pressable accessibilityRole="button" onPress={onDemo} style={({ pressed }) => [s.demo, pressed && { opacity: 0.9 }]}>
        <Text style={s.demoTitle}>See a real example</Text>
        <Text style={s.demoSub}>Atomic Habits · live results</Text>
      </Pressable>
      <Text style={s.label}>Or start with your book, film or brand</Text>
      <TextInput value={work} onChangeText={setWork} placeholder="e.g. Atomic Habits" placeholderTextColor={C.muted} maxLength={200}
        autoCorrect={false} returnKeyType="next" onSubmitEditing={() => work.trim() && onNext()} style={s.input} accessibilityLabel="Your book, film or brand" />
      <Button label="Next" onPress={onNext} disabled={!work.trim()} />
    </ScrollView>
  );
}

function SeedsScreen({ work, seedText, setSeedText, onBack, onGo }: { work: string; seedText: string; setSeedText: (v: string) => void; onBack: () => void; onGo: () => void }) {
  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
      <Header onBack={onBack} />
      <Text style={s.h2}>What else do fans of {work.trim()} love?</Text>
      <Text style={s.lead}>Optional. Up to 3 books, films, artists or brands, separated by commas.</Text>
      <TextInput value={seedText} onChangeText={setSeedText} placeholder="e.g. Nike Training Club" placeholderTextColor={C.muted} maxLength={300}
        autoCorrect={false} returnKeyType="search" onSubmitEditing={onGo} style={s.input} accessibilityLabel="What fans also love" />
      <Button label="Find podcasts" onPress={onGo} />
      <View style={{ height: 8 }} />
      <Button label="Skip this step" kind="ghost" onPress={() => { setSeedText(""); onGo(); }} />
    </ScrollView>
  );
}

// ---------- Confirm ambiguous titles: the person picks, the app never guesses an id

function PickScreen({ run, brief, onGo, onBack }: { run: Run; brief: Brief; onGo: (b: Brief) => void; onBack: () => void }) {
  const [choices, setChoices] = useState<Record<string, string>>({});
  const ready = run.candidates.every((g) => choices[g.name]);
  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.page}>
      <Header onBack={onBack} />
      <Text style={s.h2}>Which one did you mean?</Text>
      {run.candidates.map((g) => (
        <View key={g.name} style={{ marginTop: 16 }}>
          <Text style={s.label}>{g.name}</Text>
          {g.options.map((o) => {
            const on = choices[g.name] === o.id;
            return (
              <Pressable key={o.id} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => setChoices((c) => ({ ...c, [g.name]: o.id }))}
                style={[s.option, on && { borderColor: C.primary, backgroundColor: "#eaf2ec" }]}>
                <Text style={s.optionName}>{o.name}</Text>
                {(o.kind || o.detail) && <Text style={s.small}>{[o.kind, o.detail].filter(Boolean).join(" · ")}</Text>}
              </Pressable>
            );
          })}
        </View>
      ))}
      <View style={{ marginTop: 20 }}>
        <Button label="Find podcasts" disabled={!ready} onPress={() => onGo({ ...brief, confirmed: { ...brief.confirmed, ...choices } })} />
      </View>
    </ScrollView>
  );
}

// ---------- Deck

function DeckScreen({ run, deck, kept, details, onDetail, onDecide, onPicks, onRestart }: {
  run: Run; deck: Show[]; kept: number; details: Record<string, ShowDetail>;
  onDetail: (s: Show) => void; onDecide: (s: Show, keep: boolean) => void; onPicks: () => void; onRestart: () => void;
}) {
  const show = deck[0];
  const [facts, setFacts] = useState(false);
  const pan = useRef(new Animated.ValueXY()).current;
  const latest = useRef({ show, onDecide });
  latest.current = { show, onDecide };

  const fling = (keep: boolean) => {
    Animated.timing(pan, { toValue: { x: keep ? 500 : -500, y: 0 }, duration: 180, useNativeDriver: Platform.OS !== "web" }).start(() => {
      pan.setValue({ x: 0, y: 0 });
      latest.current.onDecide(latest.current.show, keep);
    });
  };
  const responder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderMove: Animated.event([null, { dx: pan.x }], { useNativeDriver: false }),
    onPanResponderRelease: (_, g) => {
      if (g.dx > SWIPE_AT) fling(true);
      else if (g.dx < -SWIPE_AT) fling(false);
      else Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: Platform.OS !== "web" }).start();
    },
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  const rotate = pan.x.interpolate({ inputRange: [-300, 0, 300], outputRange: ["-12deg", "0deg", "12deg"] });
  const fit = fitOf(show);
  const line = plainLine(show);
  const detail = details[show.id];
  const openFacts = () => { onDetail(show); setFacts(true); };

  return (
    <View style={s.page}>
      <Header onBack={onRestart} right={kept > 0 ? <Pressable accessibilityRole="button" accessibilityLabel="Your picks" onPress={onPicks} style={s.iconBtn}><Text style={s.count}>{kept}/{GOAL}</Text></Pressable> : null} />
      <ModeLine mode={run.mode} />
      <Animated.View {...responder.panHandlers} accessibilityHint="Swipe right to keep, left to skip"
        style={[s.card, { transform: [{ translateX: pan.x }, { rotate }] }]}>
        {show.image ? <Image source={{ uri: show.image }} style={s.cover} accessibilityIgnoresInvertColors /> : <View style={[s.cover, s.coverEmpty]}><Text style={s.coverLetter}>{show.name.slice(0, 1)}</Text></View>}
        <View style={{ padding: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
            <Text style={[s.showName, { flex: 1 }]} numberOfLines={2}>{show.name}</Text>
            {fit !== undefined && <View style={s.fit} accessibilityLabel={`Fit ${fit} out of 100`}><Text style={s.fitNum}>{fit}</Text><Text style={s.fitLabel}>fit</Text></View>}
          </View>
          {line && <Text style={s.small} numberOfLines={2}>{line}</Text>}
          {!!show.topics?.length && <Text style={[s.small, { marginTop: 6 }]} numberOfLines={1}>{show.topics.slice(0, 3).join(" · ")}</Text>}
        </View>
      </Animated.View>
      <View style={s.actions}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Skip ${show.name}`} onPress={() => fling(false)} style={[s.round, { borderColor: C.coral }]}><Text style={[s.roundText, { color: C.coral }]}>✕</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`Facts about ${show.name}`} onPress={openFacts} style={[s.round, s.roundSmall]}><Text style={s.roundText}>i</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`Keep ${show.name}`} onPress={() => fling(true)} style={[s.round, { borderColor: C.primary, backgroundColor: C.primary }]}><Text style={[s.roundText, { color: "#fff" }]}>♥</Text></Pressable>
      </View>
      <Text style={[s.small, { textAlign: "center" }]}>{deck.length} left · keep {Math.max(GOAL - kept, 0)} more</Text>
      <Modal visible={facts} transparent animationType="slide" onRequestClose={() => setFacts(false)}>
        <Pressable style={s.scrim} onPress={() => setFacts(false)} accessibilityLabel="Close facts" />
        <View style={s.sheet}>
          <Text style={s.h2}>{show.name}</Text>
          <Fact label="Fit" value={fit !== undefined ? `${fit} out of 100` : "Not available"} />
          <Fact label="Shared themes" value={detail ? (detail.angles.join(", ") || "None returned") : "Loading…"} />
          <Fact label="Ages that lean in most" value={detail ? (detail.ages.join(", ") || "Not available") : "Loading…"} />
          {show.episodes && <Fact label="Episodes" value={show.episodes} />}
          <View style={{ marginTop: 16 }}><Button label="Close" kind="ghost" onPress={() => setFacts(false)} /></View>
        </View>
      </Modal>
    </View>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={s.factLabel}>{label}</Text>
      <Text style={s.factValue}>{value}</Text>
    </View>
  );
}

// ---------- Picks

function PicksScreen({ work, kept, details, canSwipe, onMore, onRestart }: {
  work: string; kept: Show[]; details: Record<string, ShowDetail>; canSwipe: boolean; onMore: () => void; onRestart: () => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const pitch = (show: Show) => draftPitch(work, show.name, details[show.id]?.angles ?? [], show.topics);
  const copy = async (show: Show) => {
    await Clipboard.setStringAsync(pitch(show));
    buzz(); setCopied(show.id); setTimeout(() => setCopied(null), 1800);
  };
  const share = (show: Show) => { Share.share({ message: pitch(show), title: `Pitch for ${show.name}` }).catch(() => undefined); };
  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.page}>
      <Header onBack={onRestart} />
      <Text style={s.h1}>Your {kept.length === 1 ? "pick" : `${kept.length} picks`}</Text>
      <Text style={s.lead}>{kept.length ? "Copy a ready pitch or share it. We never send anything." : "Swipe right on a show to keep it."}</Text>
      {kept.map((show) => (
        <View key={show.id} style={s.pick}>
          <Text style={s.optionName}>{show.name}</Text>
          {fitOf(show) !== undefined && <Text style={s.small}>Fit {fitOf(show)} out of 100</Text>}
          <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
            <View style={{ flex: 1 }}><Button label={copied === show.id ? "Copied" : "Copy pitch"} onPress={() => copy(show)} /></View>
            <View style={{ flex: 1 }}><Button label="Share" kind="ghost" onPress={() => share(show)} /></View>
          </View>
        </View>
      ))}
      <Text style={[s.small, { marginTop: 16 }]}>Read each pitch over and make it yours before you send it.</Text>
      <View style={{ marginTop: 16, gap: 8 }}>
        {canSwipe && <Button label="Keep swiping" kind="ghost" onPress={onMore} />}
        <Button label="Start over" kind="ghost" onPress={onRestart} />
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.paper, paddingTop: Platform.OS === "android" ? RNStatusBar.currentHeight ?? 24 : 44 },
  scroll: { flex: 1 },
  page: { flexGrow: 1, paddingHorizontal: 16, paddingBottom: 32 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8 },
  brand: { fontSize: 20, fontWeight: "700", color: C.primary },
  iconBtn: { minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center" },
  iconText: { fontSize: 26, color: C.ink },
  count: { fontSize: 16, fontWeight: "700", color: C.primary },
  h1: { fontSize: 36, lineHeight: 42, fontWeight: "700", color: C.ink, marginTop: 24 },
  h2: { fontSize: 26, lineHeight: 32, fontWeight: "700", color: C.ink, marginTop: 12 },
  lead: { fontSize: 18, lineHeight: 26, color: C.muted, marginTop: 12 },
  label: { fontSize: 16, fontWeight: "700", color: C.ink, marginTop: 24, marginBottom: 8 },
  small: { fontSize: 14, lineHeight: 20, color: C.muted, marginTop: 4 },
  mode: { fontSize: 13, fontWeight: "600", color: C.primary, marginBottom: 8 },
  input: { minHeight: 56, borderWidth: 2, borderColor: C.line, borderRadius: 16, backgroundColor: C.card, paddingHorizontal: 16, fontSize: 18, color: C.ink, marginBottom: 12 },
  btn: { minHeight: 56, borderRadius: 16, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  btnPrimary: { backgroundColor: C.primary },
  btnCoral: { backgroundColor: C.coral },
  btnGhost: { backgroundColor: C.card, borderWidth: 2, borderColor: C.line },
  btnText: { fontSize: 18, fontWeight: "700", color: "#fff" },
  demo: { marginTop: 24, minHeight: 64, borderRadius: 16, backgroundColor: C.coral, paddingHorizontal: 20, paddingVertical: 12, justifyContent: "center" },
  demoTitle: { fontSize: 18, fontWeight: "700", color: "#fff" },
  demoSub: { fontSize: 14, color: "#ffffffe6", marginTop: 2 },
  option: { minHeight: 56, borderWidth: 2, borderColor: C.line, borderRadius: 14, backgroundColor: C.card, padding: 12, marginBottom: 8, justifyContent: "center" },
  optionName: { fontSize: 17, fontWeight: "700", color: C.ink },
  card: { flex: 1, maxHeight: 520, borderRadius: 24, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, overflow: "hidden", elevation: 4 },
  cover: { width: "100%", flex: 1, minHeight: 180, backgroundColor: "#e9e2d4" },
  coverEmpty: { alignItems: "center", justifyContent: "center" },
  coverLetter: { fontSize: 72, fontWeight: "700", color: C.primary },
  showName: { fontSize: 22, lineHeight: 28, fontWeight: "700", color: C.ink },
  fit: { width: 56, height: 56, borderRadius: 28, borderWidth: 3, borderColor: C.primary, alignItems: "center", justifyContent: "center" },
  fitNum: { fontSize: 18, fontWeight: "700", color: C.primary },
  fitLabel: { fontSize: 10, color: C.muted },
  actions: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 24, marginVertical: 16 },
  round: { width: 68, height: 68, borderRadius: 34, borderWidth: 3, borderColor: C.line, backgroundColor: C.card, alignItems: "center", justifyContent: "center" },
  roundSmall: { width: 52, height: 52, borderRadius: 26 },
  roundText: { fontSize: 26, fontWeight: "700", color: C.ink },
  scrim: { flex: 1, backgroundColor: "#00000055" },
  sheet: { backgroundColor: C.paper, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 },
  factLabel: { fontSize: 13, fontWeight: "700", color: C.muted, textTransform: "uppercase" },
  factValue: { fontSize: 17, color: C.ink, marginTop: 2 },
  pick: { marginTop: 16, padding: 16, borderRadius: 18, backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
});
