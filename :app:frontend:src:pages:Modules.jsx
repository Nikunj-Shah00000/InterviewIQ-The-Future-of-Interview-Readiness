"import { useState, useEffect } from \"react\";
import { motion } from \"framer-motion\";
import { api } from \"../lib/api\";
import { useT } from \"../lib/i18n\";
import {
  Link as LinkIcon, FileText, ChatCircleDots, Timer, MaskHappy, UsersThree,
  Code, Crown, ChatTeardropDots, Brain, Buildings, Coffee, Users
} from \"@phosphor-icons/react\";

function ModuleCard({ icon: Icon, title, desc, children, testid }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.35 }} className=\"tile p-5\" data-testid={testid}>
      <div className=\"flex items-start gap-3 mb-3\">
        <div className=\"w-9 h-9 rounded-md bg-[#007AFF]/15 border border-[#007AFF]/30 flex items-center justify-center\">
          <Icon size={18} weight=\"duotone\" color=\"#007AFF\" />
        </div>
        <div>
          <div className=\"font-display font-semibold\">{title}</div>
          <div className=\"text-xs text-zinc-500 mt-0.5\">{desc}</div>
        </div>
      </div>
      <div>{children}</div>
    </motion.div>
  );
}

function JDScraper() {
  const [url, setUrl] = useState(\"\");
  const [text, setText] = useState(\"\");
  const [out, setOut] = useState(null);
  const [loading, setLoading] = useState(false);
  const run = async () => {
    setLoading(true);
    try { setOut(await api.scrapeJD({ url, jd_text: text })); } catch (e) { console.error(e); }
    setLoading(false);
  };
  return (
    <div>
      <input data-testid=\"jd-url\" className=\"input-dark mb-2\" placeholder=\"Job posting URL\" value={url} onChange={e => setUrl(e.target.value)} />
      <textarea data-testid=\"jd-text\" rows={3} className=\"input-dark resize-none\" placeholder=\"…or paste JD text\" value={text} onChange={e => setText(e.target.value)} />
      <button data-testid=\"jd-run\" onClick={run} disabled={loading} className=\"btn-primary mt-2 w-full\">{loading ? \"Analyzing…\" : \"Analyze JD\"}</button>
      {out && (
        <div className=\"mt-3 space-y-2 text-xs\">
          <div><span className=\"label-tiny\">Role</span> <span className=\"text-white\">{out.role} · {out.company}</span></div>
          <div><span className=\"label-tiny\">Stack</span> <span className=\"text-zinc-300\">{(out.tech_stack || []).join(\", \")}</span></div>
          <div className=\"label-tiny\">Tailored questions</div>
          <ol className=\"list-decimal pl-5 space-y-1 text-zinc-300\">{(out.sample_questions || []).map((q, i) => <li key={i}>{q}</li>)}</ol>
        </div>
      )}
    </div>
  );
}

function ResumeCheck() {
  const [r, setR] = useState(\"\");
  const [t, setT] = useState(\"\");
  const [out, setOut] = useState(null);
  const run = async () => { setOut(await api.resumeCheck({ resume_text: r, transcript: t })); };
  return (
    <div>
      <textarea data-testid=\"resume-text\" rows={2} className=\"input-dark resize-none mb-2\" placeholder=\"Resume content\" value={r} onChange={e => setR(e.target.value)} />
      <textarea data-testid=\"transcript-text\" rows={2} className=\"input-dark resize-none\" placeholder=\"What you said in interview\" value={t} onChange={e => setT(e.target.value)} />
      <button data-testid=\"resume-run\" onClick={run} className=\"btn-primary mt-2 w-full\">Check consistency</button>
      {out && (
        <div className=\"mt-3\">
          <div className=\"flex items-baseline gap-2\"><div className=\"font-mono-data text-3xl\">{out.consistency_score}</div><div className=\"text-xs text-zinc-500\">/100</div></div>
          <div className=\"label-tiny mt-2\">Red flags</div>
          {(out.red_flags || []).map((f, i) => <div key={i} className=\"text-xs text-[#FF3B30]\">⚠ {f}</div>)}
          <div className=\"text-xs text-zinc-300 mt-2\">{out.recommendation}</div>
        </div>
      )}
    </div>
  );
}

function ReverseInterview() {
  const [qs, setQs] = useState([\"What does success look like in 90 days?\", \"How is the team structured?\"]);
  const [out, setOut] = useState(null);
  return (
    <div>
      {qs.map((q, i) => (
        <input key={i} data-testid={`reverse-q-${i}`} className=\"input-dark mb-2\" value={q} onChange={e => { const c = [...qs]; c[i] = e.target.value; setQs(c); }} />
      ))}
      <div className=\"flex gap-2\">
        <button onClick={() => setQs([...qs, \"\"])} className=\"btn-ghost text-xs\">+ Add</button>
        <button data-testid=\"reverse-run\" onClick={async () => setOut(await api.reverseScore({ questions: qs, role: \"Software Engineer\" }))} className=\"btn-primary flex-1\">Score</button>
      </div>
      {out && (
        <div className=\"mt-3\">
          <div className=\"flex items-baseline gap-2\"><div className=\"font-mono-data text-3xl\">{out.score}</div><div className=\"text-xs text-zinc-500\">depth: {out.depth}</div></div>
          <div className=\"label-tiny mt-2\">Top pick</div>
          <div className=\"text-xs text-zinc-300 italic\">\"{out.top_pick}\"</div>
        </div>
      )}
    </div>
  );
}

function PitchGauntlet() {
  const [concept, setConcept] = useState(\"Recursion to a 5-year-old\");
  const [pitch, setPitch] = useState(\"\");
  const [remaining, setRemaining] = useState(30);
  const [running, setRunning] = useState(false);
  const [out, setOut] = useState(null);
  useEffect(() => {
    if (!running) return;
    if (remaining <= 0) { setRunning(false); return; }
    const id = setTimeout(() => setRemaining(r => r - 1), 1000);
    return () => clearTimeout(id);
  }, [running, remaining]);
  const start = () => { setRemaining(30); setPitch(\"\"); setRunning(true); setOut(null); };
  const stop = async () => {
    setRunning(false);
    setOut(await api.pitchScore({ concept, pitch, duration_sec: 30 - remaining }));
  };
  return (
    <div>
      <input data-testid=\"pitch-concept\" className=\"input-dark mb-2\" value={concept} onChange={e => setConcept(e.target.value)} />
      <textarea data-testid=\"pitch-text\" rows={3} className=\"input-dark resize-none\" placeholder=\"Your 30s pitch…\" value={pitch} onChange={e => setPitch(e.target.value)} disabled={!running} />
      <div className=\"mt-2 flex items-center gap-3\">
        <div className=\"font-mono-data text-3xl flex-1\" style={{ color: remaining <= 5 ? \"#FF3B30\" : \"#fff\" }}>{remaining}s</div>
        {!running ? (
          <button data-testid=\"pitch-start\" onClick={start} className=\"btn-primary\">Start</button>
        ) : (
          <button data-testid=\"pitch-stop\" onClick={stop} className=\"btn-ghost\">Stop</button>
        )}
      </div>
      {out && (
        <div className=\"mt-3 grid grid-cols-4 gap-1.5\">
          {[\"clarity\", \"simplicity\", \"hook\", \"overall\"].map(k => (
            <div key={k} className=\"bg-[#0A0A0A] rounded p-2 text-center\">
              <div className=\"label-tiny\">{k}</div>
              <div className=\"font-mono-data text-base\">{out[k]}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ImposterMeter() {
  const CATS = [\"Technical\", \"Behavioral\", \"Cultural\", \"Leadership\"];
  const [perceived, setPerceived] = useState({ Technical: 50, Behavioral: 50, Cultural: 50, Leadership: 50 });
  const [out, setOut] = useState(null);
  const actual = { Technical: 78, Behavioral: 71, Cultural: 65, Leadership: 60 };
  const run = async () => setOut(await api.imposterScore({ perceived, actual }));
  return (
    <div>
      {CATS.map(c => (
        <div key={c} className=\"mb-2\">
          <div className=\"flex justify-between text-xs\"><span>{c}</span><span className=\"font-mono-data\">{perceived[c]}</span></div>
          <input data-testid={`imp-${c}`} type=\"range\" min=\"0\" max=\"100\" value={perceived[c]} onChange={e => setPerceived({ ...perceived, [c]: +e.target.value })} className=\"w-full accent-[#007AFF]\" />
        </div>
      ))}
      <button data-testid=\"imp-run\" onClick={run} className=\"btn-primary w-full\">Reveal calibration</button>
      {out && (
        <div className=\"mt-3\">
          <div className=\"font-mono-data text-2xl\">{out.label}</div>
          <div className=\"text-xs text-zinc-500\">avg gap {out.average_gap}</div>
          <div className=\"mt-2 space-y-1\">
            {Object.entries(out.gaps).map(([k, v]) => (
              <div key={k} className=\"flex justify-between text-xs\"><span>{k}</span><span className={v > 0 ? \"text-[#10B981]\" : v < 0 ? \"text-[#FF3B30]\" : \"\"}>{v > 0 ? \"+\" : \"\"}{v}</span></div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ShadowInterviewer() {
  const [q, setQ] = useState(\"Tell me about a challenging project.\");
  const [a, setA] = useState(\"\");
  const [out, setOut] = useState(null);
  return (
    <div>
      <input data-testid=\"shadow-q\" className=\"input-dark mb-2\" value={q} onChange={e => setQ(e.target.value)} />
      <textarea data-testid=\"shadow-a\" rows={3} className=\"input-dark resize-none\" placeholder=\"Your answer…\" value={a} onChange={e => setA(e.target.value)} />
      <button data-testid=\"shadow-run\" onClick={async () => setOut(await api.shadow({ question: q }))} className=\"btn-primary mt-2 w-full\">Show \"perfect\" answer</button>
      {out && (
        <div className=\"mt-3 grid sm:grid-cols-2 gap-3\">
          <div className=\"bg-[#0A0A0A] rounded p-3\"><div className=\"label-tiny mb-1\">You</div><div className=\"text-xs text-zinc-300\">{a || \"—\"}</div></div>
          <div className=\"bg-[#0A0A0A] rounded p-3 border border-[#10B981]/30\"><div className=\"label-tiny mb-1 text-[#10B981]\">Shadow</div><div className=\"text-xs text-zinc-200\">{out.perfect_answer}</div></div>
        </div>
      )}
    </div>
  );
}

function MockBattles() {
  const [room, setRoom] = useState(\"\");
  const create = () => setRoom(\"CGN-\" + Math.random().toString(36).slice(2, 7).toUpperCase());
  return (
    <div>
      <div className=\"text-xs text-zinc-400 mb-3\">Two candidates interview each other. AI referee scores both in real-time.</div>
      <button data-testid=\"battle-create\" onClick={create} className=\"btn-primary w-full\">Create battle room</button>
      {room && (
        <div className=\"mt-3 bg-[#0A0A0A] rounded p-3\">
          <div className=\"label-tiny\">Room code</div>
          <div className=\"font-mono-data text-2xl mt-1\">{room}</div>
          <div className=\"text-xs text-zinc-500 mt-2\">Share with opponent · 2/4 players</div>
          <div className=\"mt-3 grid grid-cols-2 gap-2 text-xs\">
            <div className=\"bg-[#121212] rounded p-2\"><div className=\"label-tiny\">P1</div><div className=\"font-mono-data\">62</div></div>
            <div className=\"bg-[#121212] rounded p-2\"><div className=\"label-tiny\">P2</div><div className=\"font-mono-data\">—</div></div>
          </div>
        </div>
      )}
    </div>
  );
}

function BlindTechnical() {
  const [code, setCode] = useState(\"# Reverse a linked list
\");
  const [thinking, setThinking] = useState(0);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setThinking(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [running]);
  const cognitive = Math.min(100, code.length / 4 + thinking / 2);
  return (
    <div>
      <textarea data-testid=\"blind-code\" rows={5} className=\"input-dark resize-none font-mono-data text-xs\" value={code} onChange={e => { setCode(e.target.value); if (!running) setRunning(true); }} />
      <div className=\"mt-2 grid grid-cols-3 gap-2 text-xs\">
        <div className=\"bg-[#0A0A0A] rounded p-2\"><div className=\"label-tiny\">Time</div><div className=\"font-mono-data\">{thinking}s</div></div>
        <div className=\"bg-[#0A0A0A] rounded p-2\"><div className=\"label-tiny\">Chars</div><div className=\"font-mono-data\">{code.length}</div></div>
        <div className=\"bg-[#0A0A0A] rounded p-2\"><div className=\"label-tiny\">Load</div><div className=\"font-mono-data\" style={{ color: cognitive > 80 ? \"#FF3B30\" : \"#10B981\" }}>{Math.round(cognitive)}%</div></div>
      </div>
    </div>
  );
}

function MentorMatch() {
  const [out, setOut] = useState(null);
  const [weak, setWeak] = useState(\"system design\");
  return (
    <div>
      <input data-testid=\"mentor-weak\" className=\"input-dark mb-2\" placeholder=\"Weak area\" value={weak} onChange={e => setWeak(e.target.value)} />
      <button data-testid=\"mentor-run\" onClick={async () => setOut(await api.mentorMatch({ weakness: weak }))} className=\"btn-primary w-full\">Find mentors</button>
      {out && (
        <div className=\"mt-3 space-y-2\">
          {out.mentors.map(m => (
            <div key={m.id} className=\"bg-[#0A0A0A] rounded p-3 flex items-center gap-3\">
              <div className=\"w-10 h-10 rounded-md bg-[#007AFF]/15 border border-[#007AFF]/30 flex items-center justify-center font-mono-data text-sm text-[#007AFF]\">{m.avatar}</div>
              <div className=\"flex-1\">
                <div className=\"text-sm font-medium\">{m.name}</div>
                <div className=\"text-xs text-zinc-500\">{m.specialty} · {m.company}</div>
              </div>
              <div className=\"font-mono-data text-sm\">{m.rating}★</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Glassdoor() {
  const [c, setC] = useState(\"Amazon\");
  const [out, setOut] = useState(null);
  return (
    <div>
      <input data-testid=\"gd-company\" className=\"input-dark mb-2\" value={c} onChange={e => setC(e.target.value)} />
      <button data-testid=\"gd-run\" onClick={async () => setOut(await api.glassdoor(c))} className=\"btn-primary w-full\">Pull tips</button>
      {out && (
        <div className=\"mt-3\">
          <div className=\"label-tiny mb-1\">Real-talk for {out.company}</div>
          {out.tips.map((tp, i) => <div key={i} className=\"text-xs text-zinc-300 mb-1\">• {tp}</div>)}
        </div>
      )}
    </div>
  );
}

function VRSelector() {
  const ENVS = [
    { id: \"board\", name: \"Glass Boardroom\", icon: Buildings, img: \"https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=900&auto=format&fit=crop\" },
    { id: \"cafe\", name: \"Noisy Cafe\", icon: Coffee, img: \"https://images.unsplash.com/photo-1453614512568-c4024d13c247?q=80&w=900&auto=format&fit=crop\" },
    { id: \"panel\", name: \"Panel of Five\", icon: Users, img: \"https://images.unsplash.com/photo-1551836022-d5d88e9218df?q=80&w=900&auto=format&fit=crop\" },
  ];
  const [sel, setSel] = useState(\"board\");
  return (
    <div className=\"grid grid-cols-3 gap-2\">
      {ENVS.map(e => (
        <button key={e.id} data-testid={`vr-${e.id}`} onClick={() => setSel(e.id)}
          className={`relative rounded-md overflow-hidden aspect-square border ${sel === e.id ? \"border-[#007AFF]\" : \"border-white/10\"}`}>
          <img src={e.img} alt={e.name} className=\"w-full h-full object-cover opacity-70\" />
          <div className=\"absolute inset-0 bg-gradient-to-t from-black/80 via-transparent\" />
          <div className=\"absolute bottom-2 left-2 right-2 text-left\">
            <e.icon size={14} weight=\"duotone\" color=\"#fff\" />
            <div className=\"text-xs font-medium text-white\">{e.name}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

export default function Modules() {
  const { t } = useT();
  return (
    <div className=\"max-w-7xl mx-auto px-6 py-8\">
      <div className=\"label-tiny mb-2\">All 20 modules · live</div>
      <h2 className=\"font-display text-3xl font-bold mb-6\">Tools</h2>
      <div className=\"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4\">
        <ModuleCard icon={LinkIcon} title={t(\"feature_jd\")} desc={t(\"feature_jd_d\")} testid=\"mod-jd\"><JDScraper /></ModuleCard>
        <ModuleCard icon={FileText} title={t(\"feature_resume\")} desc={t(\"feature_resume_d\")} testid=\"mod-resume\"><ResumeCheck /></ModuleCard>
        <ModuleCard icon={ChatCircleDots} title={t(\"feature_reverse\")} desc={t(\"feature_reverse_d\")} testid=\"mod-reverse\"><ReverseInterview /></ModuleCard>
        <ModuleCard icon={Timer} title={t(\"feature_pitch\")} desc={t(\"feature_pitch_d\")} testid=\"mod-pitch\"><PitchGauntlet /></ModuleCard>
        <ModuleCard icon={MaskHappy} title={t(\"feature_imposter\")} desc={t(\"feature_imposter_d\")} testid=\"mod-imposter\"><ImposterMeter /></ModuleCard>
        <ModuleCard icon={ChatTeardropDots} title={t(\"feature_shadow\")} desc={t(\"feature_shadow_d\")} testid=\"mod-shadow\"><ShadowInterviewer /></ModuleCard>
        <ModuleCard icon={UsersThree} title={t(\"feature_battle\")} desc={t(\"feature_battle_d\")} testid=\"mod-battle\"><MockBattles /></ModuleCard>
        <ModuleCard icon={Code} title={t(\"feature_blind\")} desc={t(\"feature_blind_d\")} testid=\"mod-blind\"><BlindTechnical /></ModuleCard>
        <ModuleCard icon={Crown} title={t(\"feature_mentor\")} desc={t(\"feature_mentor_d\")} testid=\"mod-mentor\"><MentorMatch /></ModuleCard>
        <ModuleCard icon={Brain} title={t(\"feature_glassdoor\")} desc={t(\"feature_glassdoor_d\")} testid=\"mod-glassdoor\"><Glassdoor /></ModuleCard>
        <ModuleCard icon={Buildings} title={t(\"feature_vr\")} desc={t(\"feature_vr_d\")} testid=\"mod-vr\"><VRSelector /></ModuleCard>
      </div>
    </div>
  );
}
"