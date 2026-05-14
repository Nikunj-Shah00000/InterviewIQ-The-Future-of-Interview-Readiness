"import { useState, useRef, useEffect } from \"react\";
import { motion, AnimatePresence } from \"framer-motion\";
import { Microphone, Stop, Pause, ArrowRight, Brain, Waveform, Eye, Lightning } from \"@phosphor-icons/react\";
import { api } from \"../lib/api\";
import { useT } from \"../lib/i18n\";

const PERSONAS = [
  { id: \"friendly\", color: \"#10B981\" },
  { id: \"skeptical\", color: \"#F59E0B\" },
  { id: \"stoic\", color: \"#A1A1AA\" },
  { id: \"curveball\", color: \"#FF3B30\" },
];

const FLUFF_WORDS = [\"um\", \"uh\", \"like\", \"basically\", \"literally\", \"actually\", \"you know\", \"kind of\", \"sort of\", \"synergy\", \"leverage\", \"obviously\"];

function highlightFluff(text) {
  if (!text) return null;
  const lower = text.toLowerCase();
  const segments = [];
  let i = 0;
  while (i < text.length) {
    let matched = null;
    for (const w of FLUFF_WORDS) {
      if (lower.startsWith(w, i) && (i === 0 || !/\w/.test(text[i - 1])) && (i + w.length === text.length || !/\w/.test(text[i + w.length]))) {
        matched = w;
        break;
      }
    }
    if (matched) {
      segments.push(<mark key={i} className=\"bg-[#FF3B30]/30 text-[#FF3B30] rounded px-0.5\">{text.substr(i, matched.length)}</mark>);
      i += matched.length;
    } else {
      const next = i + 1;
      segments.push(text[i]);
      i = next;
    }
  }
  return segments;
}

export default function LiveInterview() {
  const { t, lang } = useT();
  const [config, setConfig] = useState({ role: \"Software Engineer\", company: \"Stripe\", persona: \"friendly\", jd_text: \"\" });
  const [session, setSession] = useState(null);
  const [qIndex, setQIndex] = useState(0);
  const [answer, setAnswer] = useState(\"\");
  const [recording, setRecording] = useState(false);
  const [score, setScore] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scoreLoading, setScoreLoading] = useState(false);
  const [hr, setHr] = useState(72);
  const [pace, setPace] = useState(0);
  const [pauseMs, setPauseMs] = useState(0);
  const [wobble, setWobble] = useState([]);
  const [livePersona, setLivePersona] = useState(\"friendly\");
  const [showPersonaSwitch, setShowPersonaSwitch] = useState(false);
  const startTimeRef = useRef(0);
  const lastWordTimeRef = useRef(0);
  const recRef = useRef(null);
  const wpmRef = useRef(0);
  const videoRef = useRef(null);

  // Heart rate biometric simulator
  useEffect(() => {
    const id = setInterval(() => {
      const stress = wobble.length * 4 + (recording ? 6 : 0);
      setHr(70 + Math.round(Math.sin(Date.now() / 800) * 4) + stress);
    }, 700);
    return () => clearInterval(id);
  }, [wobble, recording]);

  // Curveball persona switch trigger
  useEffect(() => {
    if (config.persona === \"curveball\" && recording && answer.split(\" \").length > 25 && livePersona === \"friendly\") {
      setLivePersona(\"skeptical\");
      setShowPersonaSwitch(true);
      setTimeout(() => setShowPersonaSwitch(false), 3500);
    }
  }, [answer, config.persona, recording, livePersona]);

  // Camera (for micro-expression placeholder)
  useEffect(() => {
    if (!session) return;
    let stream;
    navigator.mediaDevices?.getUserMedia({ video: true, audio: false }).then(s => {
      stream = s;
      if (videoRef.current) videoRef.current.srcObject = s;
    }).catch(() => {});
    return () => { if (stream) stream.getTracks().forEach(t => t.stop()); };
  }, [session]);

  const startSession = async () => {
    setLoading(true);
    try {
      const data = await api.startInterview({ ...config, language: lang });
      setSession(data);
      setQIndex(0);
      setAnswer(\"\");
      setScore(null);
      setLivePersona(config.persona === \"curveball\" ? \"friendly\" : config.persona);
    } catch (e) {
      console.error(e);
      alert(\"Failed to start interview: \" + e.message);
    }
    setLoading(false);
  };

  const startRec = () => {
    setAnswer(\"\");
    setWobble([]);
    setScore(null);
    startTimeRef.current = Date.now();
    lastWordTimeRef.current = Date.now();
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setRecording(true);
      return;
    }
    const r = new SR();
    r.continuous = true; r.interimResults = true; r.lang = { en: \"en-US\", es: \"es-ES\", fr: \"fr-FR\", hi: \"hi-IN\", de: \"de-DE\" }[lang] || \"en-US\";
    let finalText = \"\";
    r.onresult = (e) => {
      let interim = \"\";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript + \" \";
        else interim += e.results[i][0].transcript;
      }
      const full = (finalText + interim).trim();
      setAnswer(full);
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const wpm = (full.split(/\s+/).length / Math.max(elapsed, 1)) * 60;
      wpmRef.current = wpm;
      setPace(Math.round(wpm));
      const now = Date.now();
      setPauseMs(now - lastWordTimeRef.current);
      lastWordTimeRef.current = now;
      const w = [];
      if (wpm > 180) w.push(\"speaking_too_fast\");
      if (wpm < 70 && elapsed > 5) w.push(\"speaking_too_slow\");
      const fillerCount = (full.toLowerCase().match(/\b(um|uh|like|basically)\b/g) || []).length;
      if (fillerCount >= 3) w.push(\"excessive_fillers\");
      setWobble(w);
    };
    r.onerror = () => {};
    r.onend = () => {};
    r.start();
    recRef.current = r;
    setRecording(true);
  };

  const stopRec = async () => {
    setRecording(false);
    try { recRef.current?.stop(); } catch {}
    if (!answer.trim()) return;
    setScoreLoading(true);
    const duration = (Date.now() - startTimeRef.current) / 1000;
    try {
      const s = await api.scoreAnswer({
        session_id: session.session_id,
        question: session.questions[qIndex].text,
        answer,
        duration_sec: duration,
        pause_ms: pauseMs,
        language: lang,
      });
      setScore(s);
      // notify parent dashboard via custom event
      window.dispatchEvent(new CustomEvent(\"cognihire:score\", { detail: { score: s, question: session.questions[qIndex] } }));
    } catch (e) {
      console.error(e);
    }
    setScoreLoading(false);
  };

  const submitTyped = async () => {
    if (!answer.trim()) return;
    setScoreLoading(true);
    try {
      const s = await api.scoreAnswer({
        session_id: session.session_id,
        question: session.questions[qIndex].text,
        answer,
        duration_sec: Math.max(10, answer.split(\" \").length / 2.5),
        pause_ms: 1500,
        language: lang,
      });
      setScore(s);
      window.dispatchEvent(new CustomEvent(\"cognihire:score\", { detail: { score: s, question: session.questions[qIndex] } }));
    } catch (e) {
      console.error(e);
    }
    setScoreLoading(false);
  };

  const nextQ = () => {
    if (qIndex + 1 < (session?.questions.length || 0)) {
      setQIndex(qIndex + 1);
      setAnswer(\"\");
      setScore(null);
      setWobble([]);
    }
  };

  if (!session) {
    return (
      <div className=\"max-w-3xl mx-auto px-6 py-12\">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className=\"tile p-8\">
          <div className=\"label-tiny\">Configure session</div>
          <h2 className=\"font-display text-3xl font-bold mt-1 mb-6\">{t(\"start_session\")}</h2>
          <div className=\"grid grid-cols-1 sm:grid-cols-2 gap-4\">
            <div>
              <label className=\"label-tiny block mb-1.5\">{t(\"role\")}</label>
              <input data-testid=\"config-role\" className=\"input-dark\" value={config.role} onChange={e => setConfig({ ...config, role: e.target.value })} />
            </div>
            <div>
              <label className=\"label-tiny block mb-1.5\">{t(\"company\")}</label>
              <input data-testid=\"config-company\" className=\"input-dark\" value={config.company} onChange={e => setConfig({ ...config, company: e.target.value })} />
            </div>
          </div>
          <div className=\"mt-4\">
            <label className=\"label-tiny block mb-2\">{t(\"persona\")}</label>
            <div className=\"grid grid-cols-2 sm:grid-cols-4 gap-2\">
              {PERSONAS.map(p => (
                <button
                  key={p.id}
                  data-testid={`persona-${p.id}`}
                  onClick={() => setConfig({ ...config, persona: p.id })}
                  className={`tile p-3 text-left ${config.persona === p.id ? \"border-[#007AFF]\" : \"\"}`}
                  style={config.persona === p.id ? { borderColor: p.color } : {}}
                >
                  <div className=\"w-2 h-2 rounded-full mb-2\" style={{ background: p.color }} />
                  <div className=\"text-sm font-medium\">{t(`persona_${p.id}`)}</div>
                </button>
              ))}
            </div>
          </div>
          <div className=\"mt-4\">
            <label className=\"label-tiny block mb-1.5\">Job description (optional)</label>
            <textarea data-testid=\"config-jd\" rows={4} className=\"input-dark resize-none\" placeholder=\"Paste JD or leave blank for generic questions\" value={config.jd_text} onChange={e => setConfig({ ...config, jd_text: e.target.value })} />
          </div>
          <button data-testid=\"start-btn\" onClick={startSession} disabled={loading} className=\"btn-primary mt-6 flex items-center gap-2\">
            {loading ? \"Booting…\" : t(\"start_session\")} <ArrowRight size={18} weight=\"bold\" />
          </button>
        </motion.div>
      </div>
    );
  }

  const q = session.questions[qIndex];
  return (
    <div className=\"max-w-7xl mx-auto px-6 py-8\">
      <AnimatePresence>
        {showPersonaSwitch && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className=\"fixed top-20 left-1/2 -translate-x-1/2 z-50 glass px-4 py-2 rounded-md border border-[#FF3B30]/50\">
            <div className=\"flex items-center gap-2 text-sm\">
              <span className=\"w-2 h-2 rounded-full bg-[#FF3B30] pulse-dot\" />
              <span className=\"font-mono-data text-[#FF3B30]\">CURVEBALL · persona switched to SKEPTICAL</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className=\"grid lg:grid-cols-12 gap-4\">
        {/* LEFT: Camera + biometrics */}
        <div className=\"lg:col-span-4 space-y-4\">
          <div className=\"tile overflow-hidden relative\">
            <video ref={videoRef} autoPlay muted playsInline className=\"w-full aspect-video object-cover bg-black\" data-testid=\"webcam-feed\" />
            <div className=\"absolute top-2 left-2 glass px-2 py-1 rounded\">
              <span className=\"label-tiny flex items-center gap-1.5\">
                <span className=\"w-1.5 h-1.5 rounded-full bg-[#FF3B30] pulse-dot\" />MICRO-EXP
              </span>
            </div>
            <div className=\"absolute bottom-2 left-2 right-2 grid grid-cols-3 gap-1\">
              {[
                { l: \"EYE-C\", v: recording ? \"84%\" : \"—\" },
                { l: \"BLINK\", v: recording ? \"12/m\" : \"—\" },
                { l: \"LIPS\", v: recording ? \"ok\" : \"—\" },
              ].map(m => (
                <div key={m.l} className=\"glass rounded p-1 text-center\">
                  <div className=\"label-tiny\">{m.l}</div>
                  <div className=\"font-mono-data text-xs text-white\">{m.v}</div>
                </div>
              ))}
            </div>
          </div>

          <div className=\"tile p-4\">
            <div className=\"label-tiny mb-2\">Biometric stress</div>
            <div className=\"flex items-baseline justify-between\">
              <div className=\"font-mono-data text-3xl font-bold\">{hr}<span className=\"text-zinc-500 text-sm ml-1\">bpm</span></div>
              <div className={`text-xs font-mono-data ${hr > 85 ? \"text-[#FF3B30]\" : \"text-[#10B981]\"}`}>
                {hr > 85 ? \"ELEVATED\" : \"CALM\"}
              </div>
            </div>
            <div className=\"relative h-10 mt-2 bg-[#0A0A0A] rounded overflow-hidden\">
              <div className=\"absolute inset-0 ekg-sweep\">
                <svg viewBox=\"0 0 200 40\" className=\"h-10 w-full\">
                  <polyline fill=\"none\" stroke={hr > 85 ? \"#FF3B30\" : \"#10B981\"} strokeWidth=\"1.5\"
                    points=\"0,20 30,20 35,8 40,32 45,20 80,20 85,14 90,26 95,20 200,20\" />
                </svg>
              </div>
            </div>
          </div>

          <div className=\"tile p-4\">
            <div className=\"label-tiny mb-2\">Wobble alerts</div>
            {wobble.length === 0 ? (
              <div className=\"text-zinc-500 text-sm\">All clear · on-pace</div>
            ) : (
              <div className=\"space-y-1.5\">
                {wobble.map(w => (
                  <div key={w} className=\"flex items-center gap-2 text-xs font-mono-data text-[#F59E0B]\">
                    <Lightning size={14} weight=\"fill\" /> {w.replace(/_/g, \" \").toUpperCase()}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* CENTER: Question + answer */}
        <div className=\"lg:col-span-5 space-y-4\">
          <div className=\"tile p-6\">
            <div className=\"flex items-center justify-between mb-3\">
              <div className=\"label-tiny flex items-center gap-2\">
                <span className=\"w-1.5 h-1.5 rounded-full pulse-dot\" style={{ background: PERSONAS.find(p => p.id === livePersona)?.color || \"#10B981\" }} />
                {t(`persona_${livePersona}`)} · Q {qIndex + 1}/{session.questions.length}
              </div>
              <div className=\"label-tiny\">{q.category} · DIFF {q.difficulty}/5</div>
            </div>
            <h3 className=\"font-display text-2xl font-semibold leading-snug\" data-testid=\"current-question\">
              {q.text}
            </h3>
          </div>

          <div className=\"tile p-4\">
            <div className=\"flex items-center justify-between mb-3\">
              <div className=\"label-tiny\">Your answer</div>
              <div className=\"flex items-center gap-3 font-mono-data text-xs\">
                <span>{t(\"pace\")} <span className=\"text-white\">{pace}</span> {t(\"wpm\")}</span>
                <span>{t(\"pause\")} <span className=\"text-white\">{Math.round(pauseMs / 1000)}s</span></span>
              </div>
            </div>
            <textarea
              data-testid=\"answer-input\"
              rows={6}
              className=\"input-dark resize-none\"
              placeholder={t(\"type_or_speak\")}
              value={answer}
              onChange={e => setAnswer(e.target.value)}
            />
            {answer && (
              <div className=\"mt-3 p-3 bg-[#0A0A0A] rounded text-sm leading-relaxed font-mono-data text-zinc-300\" data-testid=\"fluff-highlight\">
                {highlightFluff(answer)}
              </div>
            )}
            <div className=\"mt-3 flex flex-wrap gap-2\">
              {!recording ? (
                <button data-testid=\"rec-btn\" onClick={startRec} className=\"btn-primary flex items-center gap-2\">
                  <Microphone size={18} weight=\"fill\" /> {t(\"recording\")}
                </button>
              ) : (
                <button data-testid=\"stop-btn\" onClick={stopRec} className=\"btn-ghost flex items-center gap-2 border-[#FF3B30] text-[#FF3B30]\">
                  <Stop size={18} weight=\"fill\" /> {t(\"stop\")}
                </button>
              )}
              <button data-testid=\"submit-btn\" onClick={submitTyped} disabled={!answer.trim() || scoreLoading} className=\"btn-ghost\">
                {scoreLoading ? \"Scoring…\" : t(\"submit\")}
              </button>
              {score && (
                <button data-testid=\"next-btn\" onClick={nextQ} className=\"btn-primary flex items-center gap-2 ml-auto\">
                  {t(\"next\")} <ArrowRight size={18} weight=\"bold\" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Score */}
        <div className=\"lg:col-span-3 space-y-4\">
          <AnimatePresence mode=\"wait\">
            {!score ? (
              <motion.div key=\"empty\" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className=\"tile p-5\">
                <div className=\"label-tiny\">Awaiting answer</div>
                <div className=\"text-zinc-500 text-sm mt-2 leading-relaxed\">STAR breakdown, confidence, and rewrites will appear here once you submit.</div>
              </motion.div>
            ) : (
              <motion.div key=\"score\" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className=\"space-y-4\" data-testid=\"score-panel\">
                <div className=\"tile p-5\">
                  <div className=\"label-tiny\">{t(\"overall\")}</div>
                  <div className=\"font-mono-data text-5xl font-bold mt-1\">{score.overall}</div>
                  <div className=\"flex items-center gap-2 text-xs text-zinc-500 mt-1\">
                    <Brain size={12} /> {t(\"confidence\")} {score.confidence}%
                  </div>
                  <div className=\"mt-4 grid grid-cols-4 gap-1.5\">
                    {[\"situation\", \"task\", \"action\", \"result\"].map(k => (
                      <div key={k} className=\"bg-[#0A0A0A] rounded p-2 text-center\">
                        <div className=\"label-tiny\">{k[0].toUpperCase()}</div>
                        <div className=\"font-mono-data text-base\">{score.star?.[k] ?? 0}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className=\"tile p-4\">
                  <div className=\"label-tiny mb-2\">Strengths</div>
                  {(score.strengths || []).map((s, i) => (
                    <div key={i} className=\"text-xs text-[#10B981] mb-1\">+ {s}</div>
                  ))}
                  <div className=\"label-tiny mt-3 mb-2\">Improve</div>
                  {(score.weaknesses || []).map((s, i) => (
                    <div key={i} className=\"text-xs text-[#F59E0B] mb-1\">− {s}</div>
                  ))}
                </div>
                {score.rewrite && (
                  <div className=\"tile p-4\">
                    <div className=\"label-tiny mb-2\">AI Rewrite</div>
                    <div className=\"text-xs text-zinc-300 leading-relaxed\">{score.rewrite}</div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
"