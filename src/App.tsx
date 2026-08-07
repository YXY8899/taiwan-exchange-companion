import { useEffect, useMemo, useRef, useState } from "react";
import type { EmergencyDetails, Expense, MedicalInfo, PersonalProfile, SavedAddress, SavedPhrase, StoredImage, Tab, TranslationHistoryItem, TranslationMode, TripItem, UsefulLink, TranslationResult } from "./types";
import { loadStoredImages, putStoredImage, removeStoredImage, loadStorage, resizeImageForTranslation, saveStorage } from "./storage";
import { requestTranslation, type TranslationQuality } from "./translation";
import { decryptPrivateData, encryptPrivateData, type EncryptedVault, type PrivateVaultData } from "./secureVault";

const emptyPersonalProfile: PersonalProfile = { name: "", studentId: "", passportId: "" };
const emptyMedicalInfo: MedicalInfo = { allergies: "", medications: "", bloodType: "", emergencyContact: "" };
const emptyEmergencyDetails: EmergencyDetails = { accommodation: "", university: "", embassy: "", insurance: "", localEmergency: "112" };

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
  const [usefulLinks, setUsefulLinks] = useState<UsefulLink[]>(() => loadStorage("usefulLinks", []));
  const [expenses, setExpenses] = useState<Expense[]>(() => loadStorage("expenses", []));
  const [addresses, setAddresses] = useState<SavedAddress[]>(() => loadStorage("savedAddresses", []));
  const [storedImages, setStoredImages] = useState<StoredImage[]>([]);
  const [notes, setNotes] = useState(() => loadStorage("exchangeNotes", ""));
  const [translationHistory, setTranslationHistory] = useState<TranslationHistoryItem[]>(() => loadStorage("translationHistory", []));
  const [profile, setProfile] = useState<PersonalProfile>(() => loadStorage("personalProfile", emptyPersonalProfile));
  const [medicalInfo, setMedicalInfo] = useState<MedicalInfo>(() => loadStorage("medicalInfo", emptyMedicalInfo));
  const [emergencyDetails, setEmergencyDetails] = useState<EmergencyDetails>(() => loadStorage("emergencyDetails", emptyEmergencyDetails));
  const [privateLocked, setPrivateLocked] = useState(() => Boolean(localStorage.getItem("privateVault")));
  const [privatePin, setPrivatePin] = useState<string | null>(null);
  const [privateError, setPrivateError] = useState<string | null>(null);
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [translationMode, setTranslationMode] = useState<TranslationMode>("readChinese");
  const [isShowingTranslation, setIsShowingTranslation] = useState(false);
  const [text, setText] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [notice, setNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const translationAbortRef = useRef<AbortController | null>(null);
  const meta = tabMeta[activeTab];

  useEffect(() => saveStorage("savedPhrases", savedPhrases), [savedPhrases]);
  useEffect(() => saveStorage("tripItems", tripItems), [tripItems]);
  useEffect(() => saveStorage("usefulLinks", usefulLinks), [usefulLinks]);
  useEffect(() => saveStorage("expenses", expenses), [expenses]);
  useEffect(() => saveStorage("savedAddresses", addresses), [addresses]);
  useEffect(() => { if (!privateLocked) saveStorage("personalProfile", profile); }, [profile, privateLocked]);
  useEffect(() => { if (!privateLocked) saveStorage("medicalInfo", medicalInfo); }, [medicalInfo, privateLocked]);
  useEffect(() => { if (!privateLocked) saveStorage("emergencyDetails", emergencyDetails); }, [emergencyDetails, privateLocked]);
  useEffect(() => {
    if (!privateLocked || !privatePin) return;
    const data: PrivateVaultData = { profile, medicalInfo, emergencyDetails };
    encryptPrivateData(data, privatePin).then((vault) => localStorage.setItem("privateVault", JSON.stringify(vault))).catch((error: unknown) => setPrivateError(error instanceof Error ? error.message : "Could not encrypt private details."));
  }, [emergencyDetails, medicalInfo, privateLocked, privatePin, profile]);
  useEffect(() => {
    loadStoredImages().then(setStoredImages).catch(() => setStoredImages([]));
  }, []);
  useEffect(() => {
    const online = () => setIsOnline(true);
    const offline = () => setIsOnline(false);
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, []);
  useEffect(() => saveStorage("exchangeNotes", notes), [notes]);
  useEffect(() => saveStorage("translationHistory", translationHistory), [translationHistory]);
  useEffect(() => {
    fetch("/api/profile")
      .then((response) => response.ok ? response.json() : null)
      .then((seed: unknown) => {
        if (!isPersonalProfile(seed)) return;
        setProfile((current) => ({
          name: current.name || seed.name,
          studentId: current.studentId || seed.studentId,
          passportId: current.passportId || seed.passportId,
        }));
      })
      .catch(() => undefined);
  }, []);

  const tripProgress = useMemo(() => Math.round((tripItems.filter((item) => item.done).length / tripItems.length) * 100), [tripItems]);

  function selectTab(tab: Tab) {
    setActiveTab(tab);
    setNotice(null);
  }

  async function handleImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setNotice("Choose a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setNotice("Choose an image smaller than 8 MB for now.");
      return;
    }
    try {
      setImageUrl(await resizeImageForTranslation(file));
      setNotice("Photo ready. Add a little context if you want, then translate.");
    } catch {
      setNotice("That image could not be prepared. Please try another one.");
    }
  }

  async function runTranslation(quality: TranslationQuality = "standard") {
    if (!imageUrl && !text.trim()) {
      setNotice("Add a photo or type a phrase first.");
      return;
    }
    if (!isOnline) {
      setNotice("You are offline. Saved phrases and trip details still work, but AI translation needs a connection.");
      return;
    }
    if (text.trim().length > 500) {
      setNotice("Keep the optional note under 500 characters.");
      return;
    }
    translationAbortRef.current?.abort();
    const controller = new AbortController();
    translationAbortRef.current = controller;
    setIsTranslating(true);
    setNotice(null);
    setResult(null);
    setIsShowingTranslation(false);

    const timeout = window.setTimeout(() => controller.abort(), 30_000);
    try {
      const data = await requestTranslation({ text: text.trim(), image: imageUrl, mode: translationMode, quality, imageDetail: quality === "improve" ? "original" : "high" }, controller.signal);
      const nextResult: TranslationResult = {
        source: data.source_text,
        translation: data.translated_text,
        pronunciation: data.romanization || "No pronunciation needed.",
        context: data.context || "Translation complete.",
        language: data.detected_language || "Detected language",
        mode: translationMode,
        uncertainSegments: data.uncertain_segments ?? [],
        suggestedReply: data.suggested_reply || undefined,
        model: data.model,
      };
      setResult(nextResult);
      const historyItem: TranslationHistoryItem = { id: `translation-${Date.now()}`, createdAt: new Date().toISOString(), ...nextResult };
      setTranslationHistory((current) => [historyItem, ...current].slice(0, 20));
    } catch (error) {
      setNotice(error instanceof DOMException && error.name === "AbortError" ? "Translation cancelled or timed out. Try again." : error instanceof Error ? error.message : "The translator could not complete that request.");
    } finally {
      window.clearTimeout(timeout);
      if (translationAbortRef.current === controller) translationAbortRef.current = null;
      setIsTranslating(false);
    }
  }

  function cancelTranslation() {
    translationAbortRef.current?.abort();
  }

  function clearTranslationInput() {
    setText("");
    setImageUrl(null);
    setResult(null);
    setIsShowingTranslation(false);
    setNotice(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function saveResult() {
    if (!result) return;
    const phrase: SavedPhrase = { id: `saved-${Date.now()}`, source: result.source, translation: result.translation, pronunciation: result.pronunciation, category: "Saved today", isNew: true, isFavorite: false };
    setSavedPhrases((current) => [phrase, ...current]);
    setNotice("Saved to your phrasebook.");
  }

  function togglePhraseFavorite(id: string) {
    setSavedPhrases((phrases) => phrases.map((phrase) => phrase.id === id ? { ...phrase, isFavorite: !phrase.isFavorite } : phrase));
  }

  function deletePhrase(id: string) {
    setSavedPhrases((phrases) => phrases.filter((phrase) => phrase.id !== id));
  }

  function editPhrase(id: string, updates: Pick<SavedPhrase, "translation" | "category">) {
    setSavedPhrases((phrases) => phrases.map((phrase) => phrase.id === id ? { ...phrase, ...updates, isNew: false } : phrase));
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
    const utterance = new SpeechSynthesisUtterance(value);
    if (/[\u3400-\u9fff]/.test(value)) utterance.lang = "zh-TW";
    window.speechSynthesis.speak(utterance);
  }

  function toggleTripItem(id: string) {
    setTripItems((items) => items.map((item) => item.id === id ? { ...item, done: !item.done } : item));
  }

  function addTripItem(label: string) {
    setTripItems((items) => [...items, { id: `trip-${Date.now()}`, label, done: false }]);
  }

  function removeTripItem(id: string) {
    setTripItems((items) => items.filter((item) => item.id !== id));
  }

  async function enablePrivateLock(pin: string) {
    try {
      const vault = await encryptPrivateData({ profile, medicalInfo, emergencyDetails }, pin);
      localStorage.setItem("privateVault", JSON.stringify(vault));
      localStorage.removeItem("personalProfile"); localStorage.removeItem("medicalInfo"); localStorage.removeItem("emergencyDetails");
      setPrivatePin(pin); setPrivateLocked(true); setPrivateError(null);
    } catch (error) { setPrivateError(error instanceof Error ? error.message : "Could not enable private lock."); }
  }

  async function unlockPrivateData(pin: string) {
    try {
      const raw = localStorage.getItem("privateVault");
      if (!raw) throw new Error("No private vault found.");
      const data = await decryptPrivateData(JSON.parse(raw) as EncryptedVault, pin);
      setProfile(data.profile); setMedicalInfo(data.medicalInfo); setEmergencyDetails(data.emergencyDetails); setPrivatePin(pin); setPrivateError(null);
    } catch (error) { setPrivateError(error instanceof Error ? error.message : "Incorrect PIN or corrupted private data."); }
  }

  function lockPrivateData() {
    setPrivatePin(null); setProfile(emptyPersonalProfile); setMedicalInfo(emptyMedicalInfo); setEmergencyDetails(emptyEmergencyDetails); setPrivateError(null);
  }

  function exportPrivateVault() {
    const raw = localStorage.getItem("privateVault");
    if (!raw) { setPrivateError("Enable the private lock before exporting."); return; }
    const url = URL.createObjectURL(new Blob([raw], { type: "application/json" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "exchange-private-vault.json"; anchor.click(); URL.revokeObjectURL(url);
  }

  async function importPrivateVault(file: File) {
    try {
      const parsed = JSON.parse(await file.text()) as EncryptedVault;
      if (parsed.version !== 1 || !parsed.salt || !parsed.iv || !parsed.ciphertext) throw new Error("That backup is not a valid private vault.");
      localStorage.setItem("privateVault", JSON.stringify(parsed)); setPrivateLocked(true); lockPrivateData();
    } catch (error) { setPrivateError(error instanceof Error ? error.message : "Could not import that backup."); }
  }

  useEffect(() => {
    if (!privateLocked || !privatePin) return;
    const timeout = window.setTimeout(lockPrivateData, 5 * 60 * 1000);
    const onVisibility = () => { if (document.visibilityState === "hidden") lockPrivateData(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => { window.clearTimeout(timeout); document.removeEventListener("visibilitychange", onVisibility); };
  }, [privateLocked, privatePin]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-mark" aria-label="Exchange Companion home"><span>EC</span></div>
        <div className="topbar-actions">
          <span className="offline-pill"><span className="status-dot" /> Offline kit ready</span>
          <button className="avatar" type="button" onClick={() => selectTab("emergency")} aria-label="Open personal profile">Y</button>
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

        {activeTab === "translate" && <TranslateView imageUrl={imageUrl} fileInputRef={fileInputRef} text={text} setText={setText} translationMode={translationMode} setTranslationMode={setTranslationMode} handleImage={handleImage} runTranslation={runTranslation} cancelTranslation={cancelTranslation} clearTranslationInput={clearTranslationInput} openShowTranslation={() => setIsShowingTranslation(true)} isOnline={isOnline} isTranslating={isTranslating} result={result} saveResult={saveResult} copyText={copyText} speak={speak} notice={notice} setNotice={setNotice} />}
        {activeTab === "phrasebook" && <div className="content-stack"><PhrasebookView phrases={savedPhrases} copyText={copyText} speak={speak} toggleFavorite={togglePhraseFavorite} deletePhrase={deletePhrase} editPhrase={editPhrase} /><TranslationHistoryCard history={translationHistory} copyText={copyText} clearHistory={() => setTranslationHistory([])} /></div>}
        {activeTab === "trip" && <TripView items={tripItems} progress={tripProgress} toggleItem={toggleTripItem} addItem={addTripItem} removeItem={removeTripItem} notes={notes} setNotes={setNotes} links={usefulLinks} setLinks={setUsefulLinks} expenses={expenses} setExpenses={setExpenses} addresses={addresses} setAddresses={setAddresses} images={storedImages} setImages={setStoredImages} />}
        {activeTab === "emergency" && <EmergencyView profile={profile} setProfile={setProfile} medicalInfo={medicalInfo} setMedicalInfo={setMedicalInfo} emergencyDetails={emergencyDetails} setEmergencyDetails={setEmergencyDetails} privateLocked={privateLocked} privateUnlocked={!privateLocked || Boolean(privatePin)} privateError={privateError} enablePrivateLock={enablePrivateLock} unlockPrivateData={unlockPrivateData} lockPrivateData={lockPrivateData} exportPrivateVault={exportPrivateVault} importPrivateVault={importPrivateVault} />}
      </main>

      {isShowingTranslation && result && <ShowTranslationModal result={result} speak={speak} onClose={() => setIsShowingTranslation(false)} />}
      {activeTab === "translate" && <p className="translation-privacy">Photos and text are sent to OpenAI only when you tap Translate. Text results may be saved locally; source photos are discarded after processing.</p>}

      <nav className="bottom-nav" aria-label="Main navigation">
        <NavButton active={activeTab === "translate"} icon="translate" label="Translate" onClick={() => selectTab("translate")} />
        <NavButton active={activeTab === "phrasebook"} icon="book" label="Phrasebook" onClick={() => selectTab("phrasebook")} />
        <NavButton active={activeTab === "trip"} icon="trip" label="Trip" onClick={() => selectTab("trip")} />
        <NavButton active={activeTab === "emergency"} icon="emergency" label="Emergency" onClick={() => selectTab("emergency")} />
      </nav>
    </div>
  );
}

function TranslateView({ imageUrl, fileInputRef, text, setText, translationMode, setTranslationMode, handleImage, runTranslation, cancelTranslation, clearTranslationInput, openShowTranslation, isOnline, isTranslating, result, saveResult, copyText, speak, notice, setNotice }: { imageUrl: string | null; fileInputRef: React.RefObject<HTMLInputElement | null>; text: string; setText: (value: string) => void; translationMode: TranslationMode; setTranslationMode: (mode: TranslationMode) => void; handleImage: (event: React.ChangeEvent<HTMLInputElement>) => void; runTranslation: (quality?: TranslationQuality) => void; cancelTranslation: () => void; clearTranslationInput: () => void; openShowTranslation: () => void; isOnline: boolean; isTranslating: boolean; result: TranslationResult | null; saveResult: () => void; copyText: (value: string) => void; speak: (value: string) => void; notice: string | null; setNotice: (value: string | null) => void }) {
  return <div className="translate-layout">
    <section className="hero-card">
      <div className="hero-card-copy"><span className="hero-kicker"><Icon name="spark" /> PHOTO TRANSLATOR <span className="demo-badge">LOCAL TEST</span></span><h2>Point, pause, understand.</h2><p>Take a photo of a menu, sign, or letter. We’ll turn the important bits into something you can use.</p></div>
      <div className="camera-orb"><Icon name="camera" /><span>Camera<br />ready</span></div>
    </section>

    <section className="translator-card">
      <div className="section-row"><div><p className="section-label">START WITH A PHOTO</p><h3>What are you looking at?</h3></div><span className="step-label">01 / 02</span></div>
      <input ref={fileInputRef} onChange={handleImage} className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" capture="environment" />
      <button className={`upload-zone ${imageUrl ? "has-image" : ""}`} onClick={() => fileInputRef.current?.click()} type="button">
        {imageUrl ? <img src={imageUrl} alt="Selected translation source" /> : <><span className="upload-icon"><Icon name="camera" /></span><strong>Tap to take a photo</strong><span>or choose one from your camera roll</span></>}
        {imageUrl && <span className="image-overlay"><Icon name="camera" /> Change photo</span>}
      </button>
      <div className="direction-switch" aria-label="Translation direction"><button className={`direction-option ${translationMode === "readChinese" ? "active" : ""}`} type="button" onClick={() => setTranslationMode("readChinese")}><span>READ CHINESE</span><strong>中文 → English</strong><small>Understand signs, messages, and menus</small></button><button className={`direction-option ${translationMode === "speakChinese" ? "active" : ""}`} type="button" onClick={() => setTranslationMode("speakChinese")}><span>SPEAK CHINESE</span><strong>English → 中文</strong><small>Natural Chinese + pinyin</small></button></div>
      <div className="text-input-wrap"><textarea value={text} onChange={(event) => setText(event.target.value)} placeholder={translationMode === "speakChinese" ? "Type what you want to say in English..." : "Or type a phrase to translate..."} rows={2} /><span>{text.length}/500</span></div>
      <div className="action-row"><button className="secondary-button" type="button" onClick={clearTranslationInput} disabled={isTranslating || (!text && !imageUrl)}>Clear</button>{isTranslating ? <button className="secondary-button" type="button" onClick={cancelTranslation}>Cancel</button> : <button className="primary-button" type="button" onClick={() => runTranslation()}>{isOnline ? <>Translate <Icon name="arrow" /></> : <>Offline <Icon name="lock" /></>}</button>}</div>
      <div className="translator-status"><span className={isOnline ? "online-label" : "offline-label"}><span className="status-dot" /> {isOnline ? "AI ready" : "Offline — AI paused"}</span>{notice && <p className="inline-notice" role="status">{notice}</p>}</div>
    </section>

    {result && <section className="result-card"><div className="result-top"><div><p className="section-label">TRANSLATION RESULT</p><span className="result-language"><span className="language-dot" /> {result.language}{result.model ? ` · ${result.model}` : ""}</span></div><button className="icon-button" type="button" aria-label="Save phrase" onClick={saveResult}><Icon name="plus" /></button></div><div className="result-block"><span>ORIGINAL</span><p className="source-text">{result.source}</p><div className="result-actions"><button onClick={() => copyText(result.source)} type="button"><Icon name="copy" /> Copy</button><button onClick={() => speak(result.source)} type="button"><Icon name="volume" /> Listen</button></div></div><div className="result-divider" /><div className="result-block"><span>{result.mode === "speakChinese" ? "TRADITIONAL CHINESE" : "TRANSLATION"}</span><p className="translation-text">{result.translation}</p>{result.pronunciation !== "No pronunciation needed." && <p className="pronunciation">{result.mode === "speakChinese" ? `Pinyin: ${result.pronunciation}` : result.pronunciation}</p>}<div className="result-actions"><button onClick={openShowTranslation} type="button"><Icon name="arrow" /> Show this</button><button onClick={() => runTranslation("improve")} type="button" disabled={isTranslating || !isOnline}><Icon name="spark" /> Improve</button><button onClick={() => copyText(result.translation)} type="button"><Icon name="copy" /> Copy translation</button><button onClick={() => speak(result.translation)} type="button"><Icon name="volume" /> Hear it</button></div></div><div className="context-note"><Icon name="spark" /><p><strong>Context note</strong>{result.context}</p></div>{result.uncertainSegments && result.uncertainSegments.length > 0 && <div className="uncertainty-note"><strong>Check these words</strong><span>{result.uncertainSegments.join(" · ")}</span></div>}{result.suggestedReply && <div className="suggested-reply"><span>SUGGESTED REPLY</span><strong>{result.suggestedReply}</strong><button type="button" onClick={() => copyText(result.suggestedReply ?? "")}><Icon name="copy" /> Copy reply</button></div>}</section>}
    {!result && <section className="tip-strip"><div className="tip-icon"><Icon name="spark" /></div><div><strong>Small tip for better translations</strong><p>Fill the frame, keep the text flat, and include a little surrounding context.</p></div><Icon name="arrow" /></section>}
  </div>;
}

function ShowTranslationModal({ result, speak, onClose }: { result: TranslationResult; speak: (value: string) => void; onClose: () => void }) {
  return <div className="show-translation-backdrop" role="presentation"><section className="show-translation-modal" role="dialog" aria-modal="true" aria-label="Large translation display"><button className="show-translation-close" type="button" onClick={onClose}>Close <span aria-hidden="true">×</span></button><p className="section-label">SHOW THIS</p><p className="show-translation-source">{result.source}</p><h2>{result.translation}</h2>{result.pronunciation !== "No pronunciation needed." && <p className="show-translation-pronunciation">{result.mode === "speakChinese" ? `Pinyin: ${result.pronunciation}` : result.pronunciation}</p>}<button className="show-translation-speak" type="button" onClick={() => speak(result.translation)}><Icon name="volume" /> Play aloud</button><p className="show-translation-hint">Turn your screen toward the person you are speaking with.</p></section></div>;
}

function PhrasebookView({ phrases, copyText, speak, toggleFavorite, deletePhrase, editPhrase }: { phrases: SavedPhrase[]; copyText: (value: string) => void; speak: (value: string) => void; toggleFavorite: (id: string) => void; deletePhrase: (id: string) => void; editPhrase: (id: string, updates: Pick<SavedPhrase, "translation" | "category">) => void }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All phrases");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTranslation, setEditTranslation] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const categories = ["All phrases", "Favorites", "Food & health", "Getting around", "Essentials", "Saved today"];
  const filteredPhrases = phrases.filter((phrase) => {
    const searchMatch = `${phrase.source} ${phrase.translation} ${phrase.pronunciation}`.toLowerCase().includes(query.toLowerCase());
    const categoryMatch = category === "All phrases" || category === "Favorites" && phrase.isFavorite || phrase.category === category;
    return searchMatch && categoryMatch;
  });

  function startEditing(phrase: SavedPhrase) {
    setEditingId(phrase.id);
    setEditTranslation(phrase.translation);
    setEditCategory(phrase.category);
  }

  function saveEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingId || !editTranslation.trim()) return;
    editPhrase(editingId, { translation: editTranslation.trim(), category: editCategory.trim() || "Saved" });
    setEditingId(null);
  }

  return <div className="content-stack"><div className="search-bar"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your phrases" /></div><div className="chip-row">{categories.map((item) => <button key={item} className={`filter-chip ${category === item ? "active" : ""}`} type="button" onClick={() => setCategory(item)}>{item}</button>)}</div>{filteredPhrases.length === 0 && <div className="links-empty"><span className="links-empty-icon"><Icon name="book" /></span><div><strong>No matching phrases.</strong><p>Try another search or category.</p></div></div>}<div className="phrase-list">{filteredPhrases.map((phrase) => <article className="phrase-card" key={phrase.id}><div className="phrase-heading"><span className="phrase-category">{phrase.category}</span><div className="phrase-card-actions"><button className="favorite-button" type="button" onClick={() => toggleFavorite(phrase.id)} aria-label={`${phrase.isFavorite ? "Remove" : "Add"} favorite`}>{phrase.isFavorite ? "★" : "☆"}</button>{phrase.isNew && <span className="new-label">NEW</span>}</div></div><p className="phrase-source">{phrase.source}</p>{editingId === phrase.id ? <form className="phrase-edit-form" onSubmit={saveEdit}><textarea value={editTranslation} onChange={(event) => setEditTranslation(event.target.value)} rows={2} /><input value={editCategory} onChange={(event) => setEditCategory(event.target.value)} placeholder="Category" /><div><button className="primary-button" type="submit">Save</button><button className="secondary-button" type="button" onClick={() => setEditingId(null)}>Cancel</button></div></form> : <><p className="phrase-translation">{phrase.translation}</p><p className="phrase-pronunciation">{phrase.pronunciation}</p><div className="phrase-actions"><button type="button" onClick={() => copyText(phrase.translation)}><Icon name="copy" /> Copy</button><button type="button" onClick={() => speak(phrase.source)}><Icon name="volume" /> Listen</button><button type="button" onClick={() => startEditing(phrase)}>Edit</button><button type="button" onClick={() => deletePhrase(phrase.id)}>Delete</button></div></>}</article>)}</div></div>;
}

function TranslationHistoryCard({ history, copyText, clearHistory }: { history: TranslationHistoryItem[]; copyText: (value: string) => void; clearHistory: () => void }) {
  return <section className="translation-history-card"><div className="section-row"><div><p className="section-label">LOCAL HISTORY</p><h3>Recent translations</h3></div>{history.length > 0 && <button className="plain-add" type="button" onClick={clearHistory}>Clear</button>}</div><p className="history-intro">Text results are kept on this device for quick reference. Source photos are never saved here.</p>{history.length === 0 ? <div className="links-empty"><span className="links-empty-icon"><Icon name="translate" /></span><div><strong>No translation history yet.</strong><p>Your next text translation will appear here.</p></div></div> : <div className="translation-history-list">{history.slice(0, 8).map((item) => <article className="history-row" key={item.id}><div><span>{new Date(item.createdAt).toLocaleString()}</span><strong>{item.source}</strong><p>{item.translation}</p></div><button type="button" onClick={() => copyText(item.translation)}><Icon name="copy" /> Copy</button></article>)}</div>}</section>;
}

function TripView({ items, progress, toggleItem, addItem, removeItem, notes, setNotes, links, setLinks, expenses, setExpenses, addresses, setAddresses, images, setImages }: { items: TripItem[]; progress: number; toggleItem: (id: string) => void; addItem: (label: string) => void; removeItem: (id: string) => void; notes: string; setNotes: (value: string) => void; links: UsefulLink[]; setLinks: React.Dispatch<React.SetStateAction<UsefulLink[]>>; expenses: Expense[]; setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>; addresses: SavedAddress[]; setAddresses: React.Dispatch<React.SetStateAction<SavedAddress[]>>; images: StoredImage[]; setImages: React.Dispatch<React.SetStateAction<StoredImage[]>> }) {
  return <><TripViewLegacy items={items} progress={progress} toggleItem={toggleItem} addItem={addItem} removeItem={removeItem} notes={notes} setNotes={setNotes} links={links} setLinks={setLinks} expenses={expenses} setExpenses={setExpenses} addresses={addresses} setAddresses={setAddresses} images={images} setImages={setImages} /><LocalBackupCard /></>;
}

function LocalBackupCard() {
  const keys = ["savedPhrases", "tripItems", "usefulLinks", "expenses", "savedAddresses", "exchangeNotes", "translationHistory"];
  function exportBackup() { const records = Object.fromEntries(keys.map((key) => [key, localStorage.getItem(key)])); const url = URL.createObjectURL(new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), records })], { type: "application/json" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "exchange-companion-backup.json"; anchor.click(); URL.revokeObjectURL(url); }
  async function importBackup(file: File) { const parsed = JSON.parse(await file.text()) as { version?: number; records?: Record<string, string | null> }; if (parsed.version !== 1 || !parsed.records) return; keys.forEach((key) => { const value = parsed.records?.[key]; if (typeof value === "string") localStorage.setItem(key, value); }); window.location.reload(); }
  return <section className="backup-card"><div className="section-row"><div><p className="section-label">LOCAL RECOVERY</p><h3>Back up your travel kit</h3></div><Icon name="lock" /></div><p className="history-intro">Export phrases, checklists, links, expenses, addresses, notes, and translation history to a file kept by you.</p><div className="backup-actions"><button className="secondary-button" type="button" onClick={exportBackup}>Export backup</button><label className="backup-import"><span>Import backup</span><input type="file" accept="application/json" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importBackup(file); event.currentTarget.value = ""; }} /></label></div></section>;
}

function TripViewLegacy({ items, progress, toggleItem, addItem, removeItem, notes, setNotes, links, setLinks, expenses, setExpenses, addresses, setAddresses, images, setImages }: { items: TripItem[]; progress: number; toggleItem: (id: string) => void; addItem: (label: string) => void; removeItem: (id: string) => void; notes: string; setNotes: (value: string) => void; links: UsefulLink[]; setLinks: React.Dispatch<React.SetStateAction<UsefulLink[]>>; expenses: Expense[]; setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>; addresses: SavedAddress[]; setAddresses: React.Dispatch<React.SetStateAction<SavedAddress[]>>; images: StoredImage[]; setImages: React.Dispatch<React.SetStateAction<StoredImage[]>> }) {
  const [newItem, setNewItem] = useState("");
  const [isAddingItem, setIsAddingItem] = useState(false);

  function submitItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newItem.trim()) return;
    addItem(newItem.trim());
    setNewItem("");
    setIsAddingItem(false);
  }
  return <div className="content-stack"><section className="progress-card"><div><p className="section-label">ARRIVAL CHECKLIST</p><h3>{progress === 100 ? "You’re all set." : "One thoughtful step at a time."}</h3><p>{items.filter((item) => item.done).length} of {items.length} essentials ready</p></div><div className="progress-ring" style={{ "--progress": `${progress * 3.6}deg` } as React.CSSProperties}><strong>{progress}%</strong><span>ready</span></div></section><section className="checklist-card"><div className="section-row"><div><p className="section-label">BEFORE YOU GO</p><h3>Your essentials</h3></div><button className="plain-add" type="button" onClick={() => setIsAddingItem((value) => !value)}><Icon name="plus" /> {isAddingItem ? "Close" : "Add"}</button></div>{isAddingItem && <form className="checklist-add-form" onSubmit={submitItem}><input value={newItem} onChange={(event) => setNewItem(event.target.value)} placeholder="Add an arrival task" autoFocus /><button className="primary-button" type="submit">Add task <Icon name="arrow" /></button></form>}<div className="checklist">{items.map((item) => <div className="check-item-row" key={item.id}><button className={`check-item ${item.done ? "done" : ""}`} type="button" onClick={() => toggleItem(item.id)}><span className="check-box">{item.done && <Icon name="check" />}</span><span>{item.label}</span></button><button className="delete-link" type="button" onClick={() => removeItem(item.id)} aria-label={`Remove ${item.label}`}>×</button></div>)}</div></section><ExpenseTracker expenses={expenses} setExpenses={setExpenses} /><AddressBook addresses={addresses} setAddresses={setAddresses} /><ImageLibrary images={images} setImages={setImages} /><section className="notes-card"><div className="section-row"><div><p className="section-label">A NOTE TO YOUR FUTURE SELF</p><h3>Keep it somewhere easy.</h3></div><span className="offline-label"><Icon name="lock" /> Private</span></div><textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Your first address, a reminder, or something you don’t want to forget..." rows={4} /></section><UsefulLinksCard links={links} setLinks={setLinks} /></div>;
}

function ExpenseTracker({ expenses, setExpenses }: { expenses: Expense[]; setExpenses: React.Dispatch<React.SetStateAction<Expense[]>> }) {
  const blank = { amount: "", currency: "TWD", category: "Food", note: "", date: new Date().toISOString().slice(0, 10) };
  const [draft, setDraft] = useState(blank);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const totals = expenses.reduce<Record<string, number>>((summary, expense) => ({ ...summary, [expense.currency]: (summary[expense.currency] ?? 0) + expense.amount }), {});

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(draft.amount);
    if (!Number.isFinite(amount) || amount <= 0) { setError("Enter an amount greater than zero."); return; }
    if (editingId) setExpenses((current) => current.map((item) => item.id === editingId ? { ...item, amount, currency: draft.currency, category: draft.category, note: draft.note.trim(), date: draft.date } : item));
    else setExpenses((current) => [{ id: `expense-${Date.now()}`, amount, currency: draft.currency, category: draft.category, note: draft.note.trim(), date: draft.date }, ...current]);
    setDraft(blank); setEditingId(null); setIsAdding(false); setError(null);
  }

  function edit(expense: Expense) { setDraft({ amount: String(expense.amount), currency: expense.currency, category: expense.category, note: expense.note, date: expense.date }); setEditingId(expense.id); setIsAdding(true); }
  function exportCsv() {
    const rows = [["Date", "Category", "Note", "Currency", "Amount"], ...expenses.map((item) => [item.date, item.category, item.note, item.currency, String(item.amount)])];
    const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "exchange-expenses.csv"; anchor.click(); URL.revokeObjectURL(url);
  }
  return <section className="expense-card"><div className="section-row"><div><p className="section-label">TRIP SPENDING</p><h3>Keep an easy eye on it.</h3></div><div className="section-actions"><button className="plain-add" type="button" onClick={() => { setIsAdding((value) => !value); setEditingId(null); setDraft(blank); setError(null); }}><Icon name="plus" /> {isAdding ? "Close" : "Add expense"}</button>{expenses.length > 0 && <button className="plain-add" type="button" onClick={exportCsv}>CSV</button>}</div></div><div className="expense-summary"><div><span>Totals by currency</span><strong>{Object.entries(totals).length ? Object.entries(totals).map(([code, amount]) => `${code} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`).join(" · ") : "No expenses yet"}</strong></div><span className="expense-count">{expenses.length} {expenses.length === 1 ? "entry" : "entries"}</span></div>{isAdding && <form className="expense-form" onSubmit={submit}><label><span>Amount</span><input value={draft.amount} onChange={(event) => setDraft((current) => ({ ...current, amount: event.target.value }))} type="number" inputMode="decimal" min="0" step="0.01" placeholder="0.00" /></label><label><span>Currency</span><select value={draft.currency} onChange={(event) => setDraft((current) => ({ ...current, currency: event.target.value }))}><option>TWD</option><option>USD</option><option>EUR</option><option>GBP</option><option>SGD</option><option>JPY</option></select></label><label><span>Category</span><select value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}><option>Food</option><option>Transport</option><option>Accommodation</option><option>Shopping</option><option>Study</option><option>Other</option></select></label><label><span>Date</span><input value={draft.date} onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))} type="date" /></label><label className="expense-note-field"><span>Note (optional)</span><input value={draft.note} onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))} placeholder="Night market snacks" /></label><button className="primary-button" type="submit">{editingId ? "Update expense" : "Save expense"} <Icon name="arrow" /></button>{error && <p className="form-error" role="alert">{error}</p>}</form>}{expenses.length > 0 && <div className="expense-list">{expenses.slice(0, 20).map((expense) => <article className="expense-row" key={expense.id}><div className="expense-category-dot">{expense.category.slice(0, 1)}</div><div className="expense-copy"><strong>{expense.note || expense.category}</strong><span>{expense.category} · {expense.date}</span></div><b>{expense.currency} {expense.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b><button type="button" onClick={() => edit(expense)}>Edit</button><button className="delete-link" type="button" onClick={() => setExpenses((current) => current.filter((item) => item.id !== expense.id))} aria-label={`Delete ${expense.note || expense.category} expense`}>×</button></article>)}</div>}</section>;
}

function ExpenseTrackerLegacy({ expenses, setExpenses }: { expenses: Expense[]; setExpenses: React.Dispatch<React.SetStateAction<Expense[]>> }) {
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("TWD");
  const [category, setCategory] = useState("Food");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const totals = expenses.reduce<Record<string, number>>((summary, expense) => ({ ...summary, [expense.currency]: (summary[expense.currency] ?? 0) + expense.amount }), {});
  const total = totals[currency] ?? 0;

  function downloadCsv() {
    const rows = [["Date", "Category", "Note", "Currency", "Amount"], ...expenses.map((expense) => [expense.date, expense.category, expense.note, expense.currency, String(expense.amount)])];
    const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "exchange-expenses.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function addExpense(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    setExpenses((current) => [{ id: `expense-${Date.now()}`, amount: parsedAmount, currency, category, note: note.trim(), date }, ...current]);
    setAmount("");
    setNote("");
    setError(null);
    setIsAdding(false);
  }

  return <section className="expense-card"><div className="section-row"><div><p className="section-label">TRIP SPENDING</p><h3>Keep an easy eye on it.</h3></div><button className="plain-add" type="button" onClick={() => { setIsAdding((value) => !value); setError(null); }}><Icon name="plus" /> {isAdding ? "Close" : "Add expense"}</button></div><div className="expense-summary"><div><span>Total recorded</span><strong>{currency} {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div><span className="expense-count">{expenses.length} {expenses.length === 1 ? "entry" : "entries"}</span></div>{isAdding && <form className="expense-form" onSubmit={addExpense}><label><span>Amount</span><input value={amount} onChange={(event) => setAmount(event.target.value)} type="number" inputMode="decimal" min="0" step="0.01" placeholder="0.00" /></label><label><span>Currency</span><select value={currency} onChange={(event) => setCurrency(event.target.value)}><option>TWD</option><option>USD</option><option>EUR</option><option>GBP</option><option>SGD</option><option>JPY</option></select></label><label><span>Category</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option>Food</option><option>Transport</option><option>Accommodation</option><option>Shopping</option><option>Study</option><option>Other</option></select></label><label><span>Date</span><input value={date} onChange={(event) => setDate(event.target.value)} type="date" /></label><label className="expense-note-field"><span>Note (optional)</span><input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Night market snacks" /></label><button className="primary-button" type="submit">Save expense <Icon name="arrow" /></button>{error && <p className="form-error" role="alert">{error}</p>}</form>}{expenses.length > 0 && <div className="expense-list">{expenses.slice(0, 6).map((expense) => <article className="expense-row" key={expense.id}><div className="expense-category-dot">{expense.category.slice(0, 1)}</div><div className="expense-copy"><strong>{expense.note || expense.category}</strong><span>{expense.category} · {expense.date}</span></div><b>{expense.currency} {expense.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b><button className="delete-link" type="button" onClick={() => setExpenses((current) => current.filter((item) => item.id !== expense.id))} aria-label={`Delete ${expense.note || expense.category} expense`}>×</button></article>)}</div>}</section>;
}

function AddressBook({ addresses, setAddresses }: { addresses: SavedAddress[]; setAddresses: React.Dispatch<React.SetStateAction<SavedAddress[]>> }) {
  const [label, setLabel] = useState(""); const [category, setCategory] = useState("Dorm"); const [englishAddress, setEnglishAddress] = useState(""); const [localAddress, setLocalAddress] = useState(""); const [mapUrl, setMapUrl] = useState(""); const [isAdding, setIsAdding] = useState(false); const [error, setError] = useState<string | null>(null); const [shown, setShown] = useState<SavedAddress | null>(null);
  function addAddress(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); if (!label.trim() || !englishAddress.trim()) { setError("Add a location name and its English address first."); return; } let safeMapUrl: string | undefined; if (mapUrl.trim()) { try { const parsed = new URL(mapUrl.trim()); if (!["http:", "https:"].includes(parsed.protocol)) throw new Error(); safeMapUrl = parsed.toString(); } catch { setError("Use a valid http(s) map link."); return; } } setAddresses((current) => [{ id: `address-${Date.now()}`, label: label.trim(), category: category.trim() || "Address", englishAddress: englishAddress.trim(), localAddress: localAddress.trim(), mapUrl: safeMapUrl }, ...current]); setLabel(""); setCategory("Dorm"); setEnglishAddress(""); setLocalAddress(""); setMapUrl(""); setError(null); setIsAdding(false); }
  function copyAddress(address: SavedAddress) { navigator.clipboard?.writeText(address.localAddress || address.englishAddress).then(() => setError("Address copied."), () => setError("Select and copy the address manually.")); }
  return <section className="address-book"><div className="section-row"><div><p className="section-label">PLACE CARDS</p><h3>Addresses you can show</h3></div><button className="plain-add" type="button" onClick={() => { setIsAdding((value) => !value); setError(null); }}><Icon name="plus" /> {isAdding ? "Close" : "Add address"}</button></div><p className="address-intro">Save your dorm, university, hospital, or airport in English and the local language for quick sharing.</p>{isAdding && <form className="address-form" onSubmit={addAddress}><label><span>Place name</span><input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Main campus" /></label><label><span>Category</span><input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Dorm" /></label><label className="address-wide"><span>English address</span><input value={englishAddress} onChange={(event) => setEnglishAddress(event.target.value)} placeholder="Street, district, city" /></label><label className="address-wide"><span>Chinese / local address (optional)</span><input value={localAddress} onChange={(event) => setLocalAddress(event.target.value)} placeholder="Paste the local-language address" /></label><label className="address-wide"><span>Map link (optional)</span><input value={mapUrl} onChange={(event) => setMapUrl(event.target.value)} placeholder="https://maps.google.com/..." inputMode="url" /></label><button className="primary-button" type="submit">Save address <Icon name="arrow" /></button>{error && <p className="form-error" role="alert">{error}</p>}</form>}{!isAdding && error && <p className="inline-notice" role="status">{error}</p>}{addresses.length === 0 && !isAdding && <div className="links-empty"><span className="links-empty-icon"><Icon name="trip" /></span><div><strong>Your important places will appear here.</strong><p>Add your dorm or university address before you travel.</p></div></div>}{addresses.length > 0 && <div className="address-list">{addresses.map((address) => <article className="saved-address" key={address.id}><div className="address-marker">{address.category.slice(0, 1).toUpperCase()}</div><div className="saved-address-copy"><span>{address.category}</span><strong>{address.label}</strong><p>{address.englishAddress}</p>{address.localAddress && <p className="local-address">{address.localAddress}</p>}</div><div className="address-actions"><button type="button" onClick={() => setShown(address)}>Show</button><button type="button" onClick={() => copyAddress(address)}>Copy</button>{address.mapUrl && <a className="address-map-link" href={address.mapUrl} target="_blank" rel="noreferrer">Map</a>}<button className="delete-link" type="button" onClick={() => setAddresses((current) => current.filter((item) => item.id !== address.id))} aria-label={`Delete ${address.label}`}>×</button></div></article>)}</div>}{shown && <div className="show-translation-backdrop" role="presentation" onClick={() => setShown(null)}><section className="show-translation-modal address-show-modal" role="dialog" aria-modal="true" aria-label={`${shown.label} address`} onClick={(event) => event.stopPropagation()}><button className="show-translation-close" type="button" onClick={() => setShown(null)}>Close <span aria-hidden="true">×</span></button><p className="section-label">{shown.category}</p><h2>{shown.label}</h2><p className="show-translation-source">{shown.englishAddress}</p>{shown.localAddress && <p className="show-translation-pronunciation">{shown.localAddress}</p>}{shown.mapUrl && <a className="primary-button address-modal-map" href={shown.mapUrl} target="_blank" rel="noreferrer">Open map <Icon name="arrow" /></a>}<p className="show-translation-hint">Turn your screen toward the person helping you.</p></section></div>}</section>;
}

function AddressBookLegacy({ addresses, setAddresses }: { addresses: SavedAddress[]; setAddresses: React.Dispatch<React.SetStateAction<SavedAddress[]>> }) {
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState("Dorm");
  const [englishAddress, setEnglishAddress] = useState("");
  const [localAddress, setLocalAddress] = useState("");
  const [mapUrl, setMapUrl] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addAddress(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!label.trim() || !englishAddress.trim()) {
      setError("Add a location name and its English address first.");
      return;
    }
    let safeMapUrl: string | undefined;
    if (mapUrl.trim()) {
      try {
        const parsed = new URL(mapUrl.trim());
        if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Unsupported map link");
        safeMapUrl = parsed.toString();
      } catch {
        setError("Use a valid http(s) map link.");
        return;
      }
    }
    setAddresses((current) => [{ id: `address-${Date.now()}`, label: label.trim(), category: category.trim() || "Address", englishAddress: englishAddress.trim(), localAddress: localAddress.trim(), mapUrl: safeMapUrl }, ...current]);
    setLabel("");
    setCategory("Dorm");
    setEnglishAddress("");
    setLocalAddress("");
    setMapUrl("");
    setError(null);
    setIsAdding(false);
  }

  return <section className="address-book"><div className="section-row"><div><p className="section-label">PLACE CARDS</p><h3>Addresses you can show</h3></div><button className="plain-add" type="button" onClick={() => { setIsAdding((value) => !value); setError(null); }}><Icon name="plus" /> {isAdding ? "Close" : "Add address"}</button></div><p className="address-intro">Save your dorm, university, hospital, or airport in English and the local language for quick sharing.</p>{isAdding && <form className="address-form" onSubmit={addAddress}><label><span>Place name</span><input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Main campus" /></label><label><span>Category</span><input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Dorm" /></label><label className="address-wide"><span>English address</span><input value={englishAddress} onChange={(event) => setEnglishAddress(event.target.value)} placeholder="Street, district, city" /></label><label className="address-wide"><span>Chinese / local address (optional)</span><input value={localAddress} onChange={(event) => setLocalAddress(event.target.value)} placeholder="Paste the local-language address" /></label><label className="address-wide"><span>Map link (optional)</span><input value={mapUrl} onChange={(event) => setMapUrl(event.target.value)} placeholder="https://maps.google.com/..." inputMode="url" /></label><button className="primary-button" type="submit">Save address <Icon name="arrow" /></button>{error && <p className="form-error" role="alert">{error}</p>}</form>}{addresses.length === 0 && !isAdding && <div className="links-empty"><span className="links-empty-icon"><Icon name="trip" /></span><div><strong>Your important places will appear here.</strong><p>Add your dorm or university address before you travel.</p></div></div>}{addresses.length > 0 && <div className="address-list">{addresses.map((address) => <article className="saved-address" key={address.id}><div className="address-marker">{address.category.slice(0, 1).toUpperCase()}</div><div className="saved-address-copy"><span>{address.category}</span><strong>{address.label}</strong><p>{address.englishAddress}</p>{address.localAddress && <p className="local-address">{address.localAddress}</p>}</div><div className="address-actions"><button type="button" onClick={() => navigator.clipboard?.writeText(address.localAddress || address.englishAddress)}>Copy</button>{address.mapUrl && <a className="address-map-link" href={address.mapUrl} target="_blank" rel="noreferrer">Map</a>}<button className="delete-link" type="button" onClick={() => setAddresses((current) => current.filter((item) => item.id !== address.id))} aria-label={`Delete ${address.label}`}>×</button></div></article>)}</div>}</section>;
}

function ImageLibrary({ images, setImages }: { images: StoredImage[]; setImages: React.Dispatch<React.SetStateAction<StoredImage[]>> }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Maps");
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file such as JPG, PNG, or WEBP.");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setError("That image is larger than 12 MB. Choose a smaller copy for offline storage.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setDataUrl(typeof reader.result === "string" ? reader.result : null);
      setError(null);
    };
    reader.onerror = () => setError("This image could not be read. Try another file.");
    reader.readAsDataURL(file);
  }

  async function saveImage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !dataUrl) {
      setError("Add a title and choose an image first.");
      return;
    }
    const image: StoredImage = { id: `image-${Date.now()}`, title: title.trim(), category: category.trim() || "Maps", dataUrl, createdAt: new Date().toISOString() };
    try {
      await putStoredImage(image);
      setImages((current) => [image, ...current]);
      setTitle("");
      setCategory("Maps");
      setDataUrl(null);
      setError(null);
      setIsAdding(false);
    } catch {
      setError("This browser could not save the image offline.");
    }
  }

  async function deleteImage(id: string) {
    try { await removeStoredImage(id); } catch { /* The UI still removes the local item. */ }
    setImages((current) => current.filter((image) => image.id !== id));
  }

  return <section className="image-library"><div className="section-row"><div><p className="section-label">OFFLINE REFERENCES</p><h3>Image library</h3></div><button className="plain-add" type="button" onClick={() => { setIsAdding((value) => !value); setError(null); }}><Icon name="plus" /> {isAdding ? "Close" : "Add image"}</button></div><p className="image-library-intro">Save campus maps, bus diagrams, room directions, or screenshots you’ll want even without a signal.</p>{isAdding && <form className="image-form" onSubmit={saveImage}><label className="image-picker"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFile} /><span className="image-picker-icon"><Icon name="camera" /></span><strong>{dataUrl ? "Image selected" : "Choose an image"}</strong><small>Up to 12 MB · stored on this device</small></label><label><span>Title</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Main campus map" /></label><label><span>Category</span><input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Maps" /></label><button className="primary-button" type="submit">Save image <Icon name="arrow" /></button>{error && <p className="form-error" role="alert">{error}</p>}</form>}{images.length === 0 && !isAdding && <div className="links-empty"><span className="links-empty-icon"><Icon name="camera" /></span><div><strong>Your offline images will appear here.</strong><p>Add your first campus map or travel reference.</p></div></div>}{images.length > 0 && <div className="image-grid">{images.map((image) => <article className="saved-image" key={image.id}><a href={image.dataUrl} target="_blank" rel="noreferrer"><img src={image.dataUrl} alt={image.title} /></a><div className="saved-image-footer"><div><span>{image.category}</span><strong>{image.title}</strong></div><button className="delete-link" type="button" onClick={() => deleteImage(image.id)} aria-label={`Delete ${image.title}`}>×</button></div></article>)}</div>}</section>;
}

function UsefulLinksCard({ links, setLinks }: { links: UsefulLink[]; setLinks: React.Dispatch<React.SetStateAction<UsefulLink[]>> }) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState("Travel");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanTitle = title.trim();
    const cleanUrl = url.trim();
    if (!cleanTitle || !cleanUrl) {
      setError("Add a name and a website address first.");
      return;
    }
    const normalizedUrl = /^https?:\/\//i.test(cleanUrl) ? cleanUrl : `https://${cleanUrl}`;
    try {
      const parsed = new URL(normalizedUrl);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error("Unsupported protocol");
      setLinks((current) => [{ id: `link-${Date.now()}`, title: cleanTitle, url: parsed.toString(), category: category.trim() || "Travel" }, ...current]);
      setTitle("");
      setUrl("");
      setCategory("Travel");
      setError(null);
      setIsAdding(false);
    } catch {
      setError("Use a valid website address, such as https://example.com.");
    }
  }

  return <section className="links-card"><div className="section-row"><div><p className="section-label">YOUR SHORTCUTS</p><h3>Useful websites</h3></div><button className="plain-add" type="button" onClick={() => { setIsAdding((value) => !value); setError(null); }}><Icon name="plus" /> {isAdding ? "Close" : "Add website"}</button></div><p className="links-intro">Keep your university portal, transport pages, booking sites, and anything else you need one tap away.</p>{isAdding && <form className="link-form" onSubmit={addLink}><label><span>Website name</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="University portal" /></label><label><span>Website address</span><input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="portal.example.edu" inputMode="url" /></label><label><span>Category</span><input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Travel" /></label><button className="primary-button" type="submit">Save website <Icon name="arrow" /></button>{error && <p className="form-error" role="alert">{error}</p>}</form>}{links.length === 0 && !isAdding && <div className="links-empty"><span className="links-empty-icon"><Icon name="arrow" /></span><div><strong>Your shortcuts will appear here.</strong><p>Add the pages you reach for most during your exchange.</p></div></div>}{links.length > 0 && <div className="links-list">{links.map((link) => <article className="saved-link" key={link.id}><div className="link-favicon">{link.title.slice(0, 1).toUpperCase()}</div><div className="saved-link-copy"><span>{link.category}</span><strong>{link.title}</strong><small>{link.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}</small></div><a className="open-link" href={link.url} target="_blank" rel="noreferrer">Open <Icon name="arrow" /></a><button className="delete-link" type="button" onClick={() => setLinks((current) => current.filter((item) => item.id !== link.id))} aria-label={`Delete ${link.title}`}>×</button></article>)}</div>}</section>;
}

function PrivateLockCard({ locked, unlocked, error, enable, unlock, lock, exportVault = () => { const raw = localStorage.getItem("privateVault"); if (!raw) return; const url = URL.createObjectURL(new Blob([raw], { type: "application/json" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "exchange-private-vault.json"; anchor.click(); URL.revokeObjectURL(url); }, importVault = async (file: File) => { const parsed = JSON.parse(await file.text()) as EncryptedVault; if (parsed.version !== 1 || !parsed.salt || !parsed.iv || !parsed.ciphertext) throw new Error("That backup is not a valid private vault."); localStorage.setItem("privateVault", JSON.stringify(parsed)); window.location.reload(); } }: { locked: boolean; unlocked: boolean; error: string | null; enable: (pin: string) => Promise<void>; unlock: (pin: string) => Promise<void>; lock: () => void; exportVault?: () => void; importVault?: (file: File) => Promise<void> }) {
  const [pin, setPin] = useState(""); const [confirm, setConfirm] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); if (pin.length < 6) return; if (!locked && pin !== confirm) return; await (locked ? unlock(pin) : enable(pin)); setPin(""); setConfirm(""); }
  return <section className="private-lock-card"><div className="section-row"><div><p className="section-label">OPTIONAL PRIVACY LOCK</p><h3>{unlocked ? "Private details unlocked" : "Private details are locked"}</h3></div><Icon name="lock" /></div><p className="medical-intro">Protect your passport, medical, and emergency details with Web Crypto. The PIN is never stored.</p>{unlocked ? <div className="private-lock-actions"><button className="secondary-button" type="button" onClick={lock}>Lock now</button><button className="secondary-button" type="button" onClick={exportVault}>Export encrypted backup</button></div> : <><form className="private-lock-form" onSubmit={submit}><label><span>{locked ? "PIN" : "New PIN (6+ characters)"}</span><input value={pin} onChange={(event) => setPin(event.target.value)} type="password" inputMode="numeric" autoComplete="off" /></label>{!locked && <label><span>Confirm PIN</span><input value={confirm} onChange={(event) => setConfirm(event.target.value)} type="password" inputMode="numeric" autoComplete="off" /></label>}<button className="primary-button" type="submit">{locked ? "Unlock details" : "Enable lock"}</button></form><label className="private-import"><span>Restore encrypted backup</span><input type="file" accept="application/json" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importVault(file); event.currentTarget.value = ""; }} /></label></>}{error && <p className="form-error" role="alert">{error}</p>}</section>;
}

function EmergencyView({ profile, setProfile, medicalInfo, setMedicalInfo, emergencyDetails, setEmergencyDetails, privateLocked, privateUnlocked, privateError, enablePrivateLock, unlockPrivateData, lockPrivateData, exportPrivateVault, importPrivateVault }: { profile: PersonalProfile; setProfile: React.Dispatch<React.SetStateAction<PersonalProfile>>; medicalInfo: MedicalInfo; setMedicalInfo: React.Dispatch<React.SetStateAction<MedicalInfo>>; emergencyDetails: EmergencyDetails; setEmergencyDetails: React.Dispatch<React.SetStateAction<EmergencyDetails>>; privateLocked: boolean; privateUnlocked: boolean; privateError: string | null; enablePrivateLock: (pin: string) => Promise<void>; unlockPrivateData: (pin: string) => Promise<void>; lockPrivateData: () => void; exportPrivateVault?: () => void; importPrivateVault?: (file: File) => Promise<void> }) {
  return <div className="content-stack"><section className="emergency-banner"><div className="emergency-symbol"><Icon name="emergency" /></div><div><p className="section-label">ALWAYS AVAILABLE</p><h2>Your essentials, even offline.</h2><p>These details are saved on this device and do not need a signal.</p></div></section><PrivateLockCard locked={privateLocked} unlocked={privateUnlocked} error={privateError} enable={enablePrivateLock} unlock={unlockPrivateData} lock={lockPrivateData} />{privateUnlocked && <><PersonalProfileCard profile={profile} setProfile={setProfile} /><MedicalCard medicalInfo={medicalInfo} setMedicalInfo={setMedicalInfo} /><EmergencyDetailsCard details={emergencyDetails} setDetails={setEmergencyDetails} /><section className="contact-grid"><EmergencyCard label="Local emergency" value={emergencyDetails.localEmergency || "112"} detail="Police, fire, ambulance" /><EmergencyCard label="Embassy / consulate" value={emergencyDetails.embassy || "Not added yet"} detail="Your nearest diplomatic contact" /><EmergencyCard label="Where I am staying" value={emergencyDetails.accommodation || "Not added yet"} detail="Your accommodation" /><EmergencyCard label="My medical note" value={medicalInfo.allergies || medicalInfo.medications ? "Details saved" : "Not added yet"} detail={medicalInfo.allergies ? `Allergies: ${medicalInfo.allergies}` : "Allergies and important details"} /></section><section className="emergency-privacy"><Icon name="lock" /><div><strong>Your details stay yours.</strong><p>Personal emergency information stays on this device by default. Cloud sync will always be opt-in.</p></div></section></>}</div>;
}

function EmergencyViewLegacy({ profile, setProfile, medicalInfo, setMedicalInfo, emergencyDetails, setEmergencyDetails }: { profile: PersonalProfile; setProfile: React.Dispatch<React.SetStateAction<PersonalProfile>>; medicalInfo: MedicalInfo; setMedicalInfo: React.Dispatch<React.SetStateAction<MedicalInfo>>; emergencyDetails: EmergencyDetails; setEmergencyDetails: React.Dispatch<React.SetStateAction<EmergencyDetails>> }) {
  return <div className="content-stack"><section className="emergency-banner"><div className="emergency-symbol"><Icon name="emergency" /></div><div><p className="section-label">ALWAYS AVAILABLE</p><h2>Your essentials, even offline.</h2><p>These details are saved on this device and don’t need a signal.</p></div></section><PersonalProfileCard profile={profile} setProfile={setProfile} /><MedicalCard medicalInfo={medicalInfo} setMedicalInfo={setMedicalInfo} /><section className="contact-grid"><EmergencyCard label="Local emergency" value="112" detail="Police · fire · ambulance" /><EmergencyCard label="Embassy / consulate" value="Add number" detail="Tap to add your nearest contact" /><EmergencyCard label="Where I’m staying" value="Not added yet" detail="Your accommodation address" /><EmergencyCard label="My medical note" value={medicalInfo.allergies || medicalInfo.medications ? "Details saved" : "Not added yet"} detail={medicalInfo.allergies ? `Allergies: ${medicalInfo.allergies}` : "Allergies and important details"} /></section><section className="emergency-privacy"><Icon name="lock" /><div><strong>Your details stay yours.</strong><p>We’ll keep personal emergency information on this device by default. Cloud sync will always be opt-in.</p></div></section></div>;
}

function EmergencyDetailsCard({ details, setDetails }: { details: EmergencyDetails; setDetails: React.Dispatch<React.SetStateAction<EmergencyDetails>> }) {
  return <section className="emergency-details-card"><div className="section-row"><div><p className="section-label">EMERGENCY CONTACTS</p><h3>Who and where to call</h3></div><span className="offline-label"><Icon name="lock" /> Private</span></div><p className="medical-intro">These fields are editable and remain available in airplane mode.</p><div className="emergency-details-grid"><label><span>Local emergency number</span><input value={details.localEmergency} onChange={(event) => setDetails((current) => ({ ...current, localEmergency: event.target.value }))} inputMode="tel" placeholder="112" /></label><label><span>Accommodation</span><textarea value={details.accommodation} onChange={(event) => setDetails((current) => ({ ...current, accommodation: event.target.value }))} rows={2} placeholder="Dorm name, address, phone" /></label><label><span>University</span><textarea value={details.university} onChange={(event) => setDetails((current) => ({ ...current, university: event.target.value }))} rows={2} placeholder="Campus office and address" /></label><label><span>Embassy / consulate</span><textarea value={details.embassy} onChange={(event) => setDetails((current) => ({ ...current, embassy: event.target.value }))} rows={2} placeholder="Name and phone number" /></label><label><span>Insurance</span><textarea value={details.insurance} onChange={(event) => setDetails((current) => ({ ...current, insurance: event.target.value }))} rows={2} placeholder="Provider, policy, assistance line" /></label></div></section>;
}

function MedicalCard({ medicalInfo, setMedicalInfo }: { medicalInfo: MedicalInfo; setMedicalInfo: React.Dispatch<React.SetStateAction<MedicalInfo>> }) {
  return <section className="medical-card">
    <div className="section-row">
      <div><p className="section-label">MEDICAL & ALLERGY CARD</p><h3>Important details at a glance</h3></div>
      <span className="offline-label"><Icon name="lock" /> Private</span>
    </div>
    <p className="medical-intro">Add only the information you would want to find quickly in an emergency. It stays on this device.</p>
    <div className="medical-grid">
      <label><span>Allergies</span><input value={medicalInfo.allergies} onChange={(event) => setMedicalInfo((current) => ({ ...current, allergies: event.target.value }))} placeholder="e.g. Peanuts" /></label>
      <label><span>Medication</span><input value={medicalInfo.medications} onChange={(event) => setMedicalInfo((current) => ({ ...current, medications: event.target.value }))} placeholder="e.g. Inhaler" /></label>
      <label><span>Blood type</span><input value={medicalInfo.bloodType} onChange={(event) => setMedicalInfo((current) => ({ ...current, bloodType: event.target.value.toUpperCase() }))} placeholder="e.g. O+" autoComplete="off" /></label>
      <label><span>Emergency contact</span><input value={medicalInfo.emergencyContact} onChange={(event) => setMedicalInfo((current) => ({ ...current, emergencyContact: event.target.value }))} placeholder="Name and phone number" autoComplete="tel" /></label>
    </div>
  </section>;
}

function PersonalProfileCard({ profile, setProfile }: { profile: PersonalProfile; setProfile: React.Dispatch<React.SetStateAction<PersonalProfile>> }) {
  return <section className="profile-card">
    <div className="section-row">
      <div><p className="section-label">PERSONAL PROFILE</p><h3>Your key details</h3></div>
      <span className="offline-label"><Icon name="lock" /> This device only</span>
    </div>
    <p className="profile-intro">Keep your exchange identifiers where you can find them. Changes save automatically in this browser.</p>
    <div className="profile-grid">
      <label><span>Full name</span><input value={profile.name} onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))} autoComplete="name" /></label>
      <label><span>Student ID</span><input value={profile.studentId} onChange={(event) => setProfile((current) => ({ ...current, studentId: event.target.value }))} inputMode="numeric" autoComplete="off" /></label>
      <label><span>Passport ID</span><input value={profile.passportId} onChange={(event) => setProfile((current) => ({ ...current, passportId: event.target.value.toUpperCase() }))} autoComplete="off" /></label>
    </div>
    <p className="profile-private"><Icon name="lock" /> This profile is stored locally and is not sent with translation requests.</p>
  </section>;
}

function EmergencyCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  const [currentValue, setCurrentValue] = useState(value);
  function edit() {
    const next = window.prompt(`Update ${label}`, currentValue === "Not added yet" || currentValue === "Add number" ? "" : currentValue);
    if (next === null) return;
    const clean = next.trim();
    setCurrentValue(clean || "Not added yet");
    localStorage.setItem(`emergencyCard:${label}`, clean);
  }
  return <article className="emergency-card"><span className="card-label">{label}</span><strong>{currentValue}</strong><p>{detail}</p><button type="button" onClick={edit}>Edit <Icon name="arrow" /></button></article>;
}
function NavButton({ active, icon, label, onClick }: { active: boolean; icon: "translate" | "book" | "trip" | "emergency"; label: string; onClick: () => void }) { return <button className={`nav-button ${active ? "active" : ""}`} onClick={onClick} type="button"><Icon name={icon} /><span>{label}</span></button>; }
function isPersonalProfile(value: unknown): value is PersonalProfile {
  return typeof value === "object" && value !== null
    && "name" in value && typeof value.name === "string"
    && "studentId" in value && typeof value.studentId === "string"
    && "passportId" in value && typeof value.passportId === "string";
}

export default App;
