import { useEffect, useMemo, useRef, useState } from "react";

type Tab = "translate" | "phrasebook" | "trip" | "emergency";

type SavedPhrase = {
  id: string;
  source: string;
  translation: string;
  pronunciation: string;
  category: string;
  isNew?: boolean;
};

type TranslationResult = {
  source: string;
  translation: string;
  pronunciation: string;
  context: string;
  language: string;
};

type TripItem = {
  id: string;
  label: string;
  done: boolean;
};

const starterPhrases: SavedPhrase[] = [
  { id: "help", source: "請問，可以幫我嗎？", translation: "Excuse me, could you help me?", pronunciation: "Qǐngwèn, kěyǐ bāng wǒ ma?", category: "Getting around" },
  { id: "allergy", source: "我對花生過敏。", translation: "I am allergic to peanuts.", pronunciation: "Wǒ duì huāshēng guòmǐn.", category: "Food & health" },
  { id: "water", source: "請給我一杯水，謝謝。", translation: "A glass of water, please.", pronunciation: "Qǐng gěi wǒ yì bēi shuǐ, xièxie.", category: "Essentials" },
];

const initialTripItems: TripItem[] = [
  { id: "passport", label: "Passport and exchange documents", done: true },
  { id: "adapter", label: "Universal adapter", done: false },
  { id: "insurance", label: "Insurance details saved", done: false },
  { id: "arrival", label: "Arrival route bookmarked", done: false },
];

const tabMeta: Record<Tab, { eyebrow: string; title: string; subtitle: string }> = {
  translate: { eyebrow: "YOUR EXCHANGE COMPANION", title: "Make the unfamiliar feel simple.", subtitle: "Translate a sign, save a phrase, and keep moving with confidence." },
  phrasebook: { eyebrow: "YOUR PHRASEBOOK", title: "Words you’ll want nearby.", subtitle: "Your useful phrases, ready for a quick tap and a clear voice." },
  trip: { eyebrow: "YOUR ARRIVAL PLAN", title: "A little less to remember.", subtitle: "Keep the practical details of your exchange in one calm place." },
  emergency: { eyebrow: "OFFLINE EXCHANGE KIT", title: "Ready when the signal isn’t.", subtitle: "Your essential details stay available when you need them most." },
};

function Icon({ name }: { name: "translate" | "book" | "trip" | "emergency" | "camera" | "arrow" | "copy" | "volume" | "check" | "plus" | "spark" | "lock" }) {
  const common = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<string, React.ReactNode> = {
    translate: <><path d="M4 5h7" /><path d="M7.5 3v2" /><path d="M5.5 9c1.3 1.7 3 3 5 4" /><path d="M4 13c2.2-1.2 4-3.3 5.1-6" /><path d="m14 15 3-7 3 7" /><path d="M15.1 12h3.8" /><path d="M13 20h8" /></>,
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z" /><path d="M4 5.5v16" /><path d="M8 7h8" /><path d="M8 11h6" /></>,
    trip: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z" /><path d="M4 5.5v16" /><path d="m9 8 2 2 4-4" /><path d="M9 14h6" /></>,
    emergency: <><path d="M12 3 4 6.5v5.2c0 4.6 3.2 7.8 8 9.3 4.8-1.5 8-4.7 8-9.3V6.5z" /><path d="M12 8v4" /><path d="M12 15.5h.01" /></>,
    camera: <><path d="M4 7h3l1.5-2h7L17 7h3v12H4z" /><circle cx="12" cy="13" r="3.2" /></>,
    arrow: <><path d="M5 12h13" /><path d="m13 6 6 6-6 6" /></>,
    copy: <><rect x="8" y="8" width="11" height="11" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" /></>,
    volume: <><path d="M4 10v4h4l5 4V6l-5 4z" /><path d="M17 9.5a4 4 0 0 1 0 5" /><path d="M19.5 7a7.5 7.5 0 0 1 0 10" /></>,
    check: <><path d="m5 12 4 4L19 6" /></>,
    plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
    spark: <><path d="m12 3 1.4 5.6L19 10l-5.6 1.4L12 17l-1.4-5.6L5 10l5.6-1.4z" /><path d="m19 16 .6 2.4L22 19l-2.4.6L19 22l-.6-2.4L16 19l2.4-.6z" /></>,
    lock: <><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
  };
  return <svg {...common} aria-hidden="true">{paths[name]}</svg>;
}

function App() {
  const [activeTab, setActiveTab] = useState<Tab>("translate");
  const [savedPhrases, setSavedPhrases] = useState<SavedPhrase[]>(() => loadStorage("savedPhrases", starterPhrases));
  const [tripItems, setTripItems] = useState<TripItem[]>(() => loadStorage("tripItems", initialTripItems));
  const [notes, setNotes] = useState(() => localStorage.getItem("exchangeNotes") ?? "");
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [text, setText] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const meta = tabMeta[activeTab];

  useEffect(() => localStorage.setItem("savedPhrases", JSON.stringify(savedPhrases)), [savedPhrases]);
  useEffect(() => localStorage.setItem("tripItems", JSON.stringify(tripItems)), [tripItems]);
  useEffect(() => localStorage.setItem("exchangeNotes", notes), [notes]);

  const tripProgress = useMemo(() => Math.round((tripItems.filter((item) => item.done).length / tripItems.length) * 100), [tripItems]);

  function selectTab(tab: Tab) {
    setActiveTab(tab);
    setNotice(null);
  }

  function handleImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setNotice("Please choose an image file.");
      return;
    }
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(URL.createObjectURL(file));
    setNotice("Photo ready. Add a little context if you want, then translate.");
  }

  function runTranslation() {
    if (!imageUrl && !text.trim()) {
      setNotice("Add a photo or type a phrase first.");
      return;
    }
    setIsTranslating(true);
    setNotice(null);
    window.setTimeout(() => {
      setResult({
        source: text.trim() || "請問，這個多少錢？",
        translation: text.trim() ? `A clear, natural translation of “${text.trim()}”.` : "Excuse me, how much does this cost?",
        pronunciation: text.trim() ? "Pronunciation will appear with the live translator." : "Qǐngwèn, zhège duōshǎo qián?",
        context: "This demo response is ready for the OpenAI vision connection in the next build step.",
        language: "Traditional Chinese",
      });
      setIsTranslating(false);
    }, 700);
  }

  function saveResult() {
    if (!result) return;
    const phrase: SavedPhrase = { id: `saved-${Date.now()}`, source: result.source, translation: result.translation, pronunciation: result.pronunciation, category: "Saved today", isNew: true };
    setSavedPhrases((current) => [phrase, ...current]);
    setNotice("Saved to your phrasebook.");
  }

  function copyText(value: string) {
    navigator.clipboard?.writeText(value).then(() => setNotice("Copied to clipboard.")).catch(() => setNotice("Select and copy the text manually."));
  }

  function speak(value: string) {
    if (!("speechSynthesis" in window)) {
      setNotice("Speech is not supported by this browser.");
      return;
    }
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(value));
  }

  function toggleTripItem(id: string) {
    setTripItems((items) => items.map((item) => item.id === id ? { ...item, done: !item.done } : item));
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-mark" aria-label="Exchange Companion home"><span>EC</span></div>
        <div className="topbar-actions">
          <span className="offline-pill"><span className="status-dot" /> Offline kit ready</span>
          <button className="avatar" aria-label="Open profile">Y</button>
        </div>
      </header>

      <main className="page-wrap">
        <section className="page-heading">
          <div>
            <p className="eyebrow">{meta.eyebrow}</p>
            <h1>{meta.title}</h1>
            <p className="subtitle">{meta.subtitle}</p>
          </div>
          <div className="date-card"><span>EXCHANGE DAY</span><strong>01</strong><small>Getting ready</small></div>
        </section>

        {activeTab === "translate" && <TranslateView imageUrl={imageUrl} fileInputRef={fileInputRef} text={text} setText={setText} handleImage={handleImage} runTranslation={runTranslation} isTranslating={isTranslating} result={result} saveResult={saveResult} copyText={copyText} speak={speak} notice={notice} setNotice={setNotice} />}
        {activeTab === "phrasebook" && <PhrasebookView phrases={savedPhrases} copyText={copyText} speak={speak} />}
        {activeTab === "trip" && <TripView items={tripItems} progress={tripProgress} toggleItem={toggleTripItem} notes={notes} setNotes={setNotes} />}
        {activeTab === "emergency" && <EmergencyView />}
      </main>

      <nav className="bottom-nav" aria-label="Main navigation">
        <NavButton active={activeTab === "translate"} icon="translate" label="Translate" onClick={() => selectTab("translate")} />
        <NavButton active={activeTab === "phrasebook"} icon="book" label="Phrasebook" onClick={() => selectTab("phrasebook")} />
        <NavButton active={activeTab === "trip"} icon="trip" label="Trip" onClick={() => selectTab("trip")} />
        <NavButton active={activeTab === "emergency"} icon="emergency" label="Emergency" onClick={() => selectTab("emergency")} />
      </nav>
    </div>
  );
}

function TranslateView({ imageUrl, fileInputRef, text, setText, handleImage, runTranslation, isTranslating, result, saveResult, copyText, speak, notice, setNotice }: { imageUrl: string | null; fileInputRef: React.RefObject<HTMLInputElement | null>; text: string; setText: (value: string) => void; handleImage: (event: React.ChangeEvent<HTMLInputElement>) => void; runTranslation: () => void; isTranslating: boolean; result: TranslationResult | null; saveResult: () => void; copyText: (value: string) => void; speak: (value: string) => void; notice: string | null; setNotice: (value: string | null) => void }) {
  return <div className="translate-layout">
    <section className="hero-card">
      <div className="hero-card-copy"><span className="hero-kicker"><Icon name="spark" /> PHOTO TRANSLATOR <span className="demo-badge">DEMO MODE</span></span><h2>Point, pause, understand.</h2><p>Take a photo of a menu, sign, or letter. We’ll turn the important bits into something you can use.</p></div>
      <div className="camera-orb"><Icon name="camera" /><span>Camera<br />ready</span></div>
    </section>

    <section className="translator-card">
      <div className="section-row"><div><p className="section-label">START WITH A PHOTO</p><h3>What are you looking at?</h3></div><span className="step-label">01 / 02</span></div>
      <input ref={fileInputRef} onChange={handleImage} className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" capture="environment" />
      <button className={`upload-zone ${imageUrl ? "has-image" : ""}`} onClick={() => fileInputRef.current?.click()} type="button">
        {imageUrl ? <img src={imageUrl} alt="Selected translation source" /> : <><span className="upload-icon"><Icon name="camera" /></span><strong>Tap to take a photo</strong><span>or choose one from your camera roll</span></>}
        {imageUrl && <span className="image-overlay"><Icon name="camera" /> Change photo</span>}
      </button>
      <div className="language-row"><div className="language-select"><span className="language-flag">中</span><div><small>FROM</small><strong>Auto-detect</strong></div><span className="chevron">⌄</span></div><Icon name="arrow" /><div className="language-select"><span className="language-flag target">A</span><div><small>TO</small><strong>English</strong></div><span className="chevron">⌄</span></div></div>
      <div className="text-input-wrap"><textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="Or type a phrase to translate..." rows={2} /><span>{text.length}/500</span></div>
      <div className="action-row"><button className="secondary-button" type="button" onClick={() => { setText(""); setNotice(null); }} disabled={!text && !imageUrl}>Clear</button><button className="primary-button" type="button" onClick={runTranslation} disabled={isTranslating}>{isTranslating ? <><span className="spinner" /> Translating...</> : <>Translate <Icon name="arrow" /></>}</button></div>
      {notice && <p className="inline-notice" role="status">{notice}</p>}
    </section>

    {result && <section className="result-card"><div className="result-top"><div><p className="section-label">TRANSLATION RESULT</p><span className="result-language"><span className="language-dot" /> {result.language}</span></div><button className="icon-button" type="button" aria-label="Save phrase" onClick={saveResult}><Icon name="plus" /></button></div><div className="result-block"><span>ORIGINAL</span><p className="source-text">{result.source}</p><div className="result-actions"><button onClick={() => copyText(result.source)} type="button"><Icon name="copy" /> Copy</button><button onClick={() => speak(result.source)} type="button"><Icon name="volume" /> Listen</button></div></div><div className="result-divider" /><div className="result-block"><span>ENGLISH</span><p className="translation-text">{result.translation}</p><p className="pronunciation">{result.pronunciation}</p><div className="result-actions"><button onClick={() => copyText(result.translation)} type="button"><Icon name="copy" /> Copy translation</button><button onClick={() => speak(result.translation)} type="button"><Icon name="volume" /> Hear it</button></div></div><div className="context-note"><Icon name="spark" /><p><strong>Context note</strong>{result.context}</p></div></section>}
    {!result && <section className="tip-strip"><div className="tip-icon"><Icon name="spark" /></div><div><strong>Small tip for better translations</strong><p>Fill the frame, keep the text flat, and include a little surrounding context.</p></div><Icon name="arrow" /></section>}
  </div>;
}

function PhrasebookView({ phrases, copyText, speak }: { phrases: SavedPhrase[]; copyText: (value: string) => void; speak: (value: string) => void }) {
  return <div className="content-stack"><div className="search-bar"><span>⌕</span><input placeholder="Search your phrases" /></div><div className="chip-row"><button className="filter-chip active" type="button">All phrases</button><button className="filter-chip" type="button">Food & health</button><button className="filter-chip" type="button">Getting around</button></div><div className="phrase-list">{phrases.map((phrase) => <article className="phrase-card" key={phrase.id}><div className="phrase-heading"><span className="phrase-category">{phrase.category}</span>{phrase.isNew && <span className="new-label">NEW</span>}</div><p className="phrase-source">{phrase.source}</p><p className="phrase-translation">{phrase.translation}</p><p className="phrase-pronunciation">{phrase.pronunciation}</p><div className="phrase-actions"><button type="button" onClick={() => copyText(phrase.translation)}><Icon name="copy" /> Copy</button><button type="button" onClick={() => speak(phrase.source)}><Icon name="volume" /> Listen</button></div></article>)}</div></div>;
}

function TripView({ items, progress, toggleItem, notes, setNotes }: { items: TripItem[]; progress: number; toggleItem: (id: string) => void; notes: string; setNotes: (value: string) => void }) {
  return <div className="content-stack"><section className="progress-card"><div><p className="section-label">ARRIVAL CHECKLIST</p><h3>{progress === 100 ? "You’re all set." : "One thoughtful step at a time."}</h3><p>{items.filter((item) => item.done).length} of {items.length} essentials ready</p></div><div className="progress-ring" style={{ "--progress": `${progress * 3.6}deg` } as React.CSSProperties}><strong>{progress}%</strong><span>ready</span></div></section><section className="checklist-card"><div className="section-row"><div><p className="section-label">BEFORE YOU GO</p><h3>Your essentials</h3></div><button className="plain-add" type="button"><Icon name="plus" /> Add</button></div><div className="checklist">{items.map((item) => <button key={item.id} className={`check-item ${item.done ? "done" : ""}`} type="button" onClick={() => toggleItem(item.id)}><span className="check-box">{item.done && <Icon name="check" />}</span><span>{item.label}</span></button>)}</div></section><section className="notes-card"><div className="section-row"><div><p className="section-label">A NOTE TO YOUR FUTURE SELF</p><h3>Keep it somewhere easy.</h3></div><span className="offline-label"><Icon name="lock" /> Private</span></div><textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Your first address, a reminder, or something you don’t want to forget..." rows={4} /></section></div>;
}

function EmergencyView() {
  return <div className="content-stack"><section className="emergency-banner"><div className="emergency-symbol"><Icon name="emergency" /></div><div><p className="section-label">ALWAYS AVAILABLE</p><h2>Your essentials, even offline.</h2><p>These details are saved on this device and don’t need a signal.</p></div></section><section className="contact-grid"><EmergencyCard label="Local emergency" value="112" detail="Police · fire · ambulance" /><EmergencyCard label="Embassy / consulate" value="Add number" detail="Tap to add your nearest contact" /><EmergencyCard label="Where I’m staying" value="Not added yet" detail="Your accommodation address" /><EmergencyCard label="My medical note" value="Not added yet" detail="Allergies and important details" /></section><section className="emergency-privacy"><Icon name="lock" /><div><strong>Your details stay yours.</strong><p>We’ll keep personal emergency information on this device by default. Cloud sync will always be opt-in.</p></div></section></div>;
}

function EmergencyCard({ label, value, detail }: { label: string; value: string; detail: string }) { return <article className="emergency-card"><span className="card-label">{label}</span><strong>{value}</strong><p>{detail}</p><button type="button">Edit <Icon name="arrow" /></button></article>; }
function NavButton({ active, icon, label, onClick }: { active: boolean; icon: "translate" | "book" | "trip" | "emergency"; label: string; onClick: () => void }) { return <button className={`nav-button ${active ? "active" : ""}`} onClick={onClick} type="button"><Icon name={icon} /><span>{label}</span></button>; }
function loadStorage<T>(key: string, fallback: T): T { try { const stored = localStorage.getItem(key); return stored ? JSON.parse(stored) as T : fallback; } catch { return fallback; } }

export default App;
