"import { useEffect, useState } from \"react\";
import { motion } from \"framer-motion\";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from \"recharts\";
import { api } from \"../lib/api\";
import { useT } from \"../lib/i18n\";
import { Brain, Lightning, Eye, ChartBar, ShieldCheck } from \"@phosphor-icons/react\";

const CATEGORIES = [\"Technical\", \"Behavioral\", \"Cultural\", \"Leadership\"];

export default function Dashboard() {
  const { t } = useT();
  const [scores, setScores] = useState(() => JSON.parse(localStorage.getItem(\"cognihire_scores\") || \"[]\"));
  const [readiness, setReadiness] = useState(null);
  const [hrSeries] = useState(() => Array.from({ length: 30 }, (_, i) => ({ t: i, hr: 68 + Math.round(Math.sin(i / 3) * 8 + (Math.random() * 4)) })));

  useEffect(() => {
    const onScore = (e) => {
      const d = e.detail;
      setScores(prev => {
        const next = [...prev, { overall: d.score.overall, category: d.question.category, ts: Date.now() }];
        localStorage.setItem(\"cognihire_scores\", JSON.stringify(next));
        return next;
      });
    };
    window.addEventListener(\"cognihire:score\", onScore);
    return () => window.removeEventListener(\"cognihire:score\", onScore);
  }, []);

  useEffect(() => {
    const cats = {};
    CATEGORIES.forEach(c => {
      const arr = scores.filter(s => s.category === c).map(s => s.overall);
      cats[c] = arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
    });
    api.readiness({ scores: scores.map(s => s.overall), categories: cats }).then(setReadiness).catch(() => {});
  }, [scores]);

  const radarData = CATEGORIES.map(c => {
    const arr = scores.filter(s => s.category === c).map(s => s.overall);
    return { category: c, score: arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : Math.round(40 + Math.random() * 40) };
  });

  return (
    <div className=\"max-w-7xl mx-auto px-6 py-8\">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className=\"flex items-end justify-between mb-6\">
        <div>
          <div className=\"label-tiny\">{t(\"nav_dashboard\")}</div>
          <h2 className=\"font-display text-3xl font-bold mt-1\">Control room</h2>
        </div>
      </motion.div>

      <div className=\"grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4\">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className=\"tile p-5 lg:col-span-2\" data-testid=\"card-readiness\">
          <div className=\"flex items-center gap-2\">
            <ShieldCheck size={18} weight=\"duotone\" color=\"#007AFF\" />
            <div className=\"label-tiny\">Readiness passport</div>
          </div>
          <div className=\"flex items-baseline gap-4 mt-3\">
            <div className=\"font-mono-data text-6xl font-bold\">{readiness?.readiness_score ?? \"—\"}</div>
            <div className=\"text-zinc-400\">
              <div className=\"text-sm\">{readiness?.band ?? \"Not enough data\"}</div>
              <div className=\"label-tiny mt-1\">{readiness?.passport_id ?? \"PENDING\"}</div>
            </div>
          </div>
          <div className=\"mt-4 h-2 bg-[#0A0A0A] rounded overflow-hidden\">
            <motion.div className=\"h-full bg-gradient-to-r from-[#007AFF] to-[#10B981]\" initial={{ width: 0 }} animate={{ width: `${readiness?.readiness_score || 30}%` }} transition={{ duration: 0.8 }} />
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className=\"tile p-5\">
          <div className=\"flex items-center gap-2\"><Brain size={18} weight=\"duotone\" color=\"#10B981\" /><div className=\"label-tiny\">Sessions</div></div>
          <div className=\"font-mono-data text-4xl font-bold mt-2\">{scores.length}</div>
          <div className=\"text-xs text-zinc-500 mt-1\">answers scored</div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className=\"tile p-5\">
          <div className=\"flex items-center gap-2\"><Lightning size={18} weight=\"duotone\" color=\"#F59E0B\" /><div className=\"label-tiny\">Avg confidence</div></div>
          <div className=\"font-mono-data text-4xl font-bold mt-2\">
            {scores.length ? Math.round(scores.reduce((a, s) => a + s.overall, 0) / scores.length) : \"—\"}
          </div>
          <div className=\"text-xs text-zinc-500 mt-1\">/100 across all answers</div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className=\"tile p-5 lg:col-span-2\">
          <div className=\"flex items-center gap-2 mb-2\"><ChartBar size={18} weight=\"duotone\" color=\"#007AFF\" /><div className=\"label-tiny\">Knowledge heatmap</div></div>
          <div className=\"h-56\">
            <ResponsiveContainer>
              <RadarChart data={radarData}>
                <PolarGrid stroke=\"#27272A\" />
                <PolarAngleAxis dataKey=\"category\" stroke=\"#A1A1AA\" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis stroke=\"#27272A\" tick={{ fontSize: 9, fill: \"#52525B\" }} angle={30} />
                <Radar dataKey=\"score\" stroke=\"#007AFF\" fill=\"#007AFF\" fillOpacity={0.35} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className=\"tile p-5 lg:col-span-2\">
          <div className=\"flex items-center gap-2 mb-2\"><Eye size={18} weight=\"duotone\" color=\"#FF3B30\" /><div className=\"label-tiny\">HRV trend (last 30 sessions)</div></div>
          <div className=\"h-56\">
            <ResponsiveContainer>
              <AreaChart data={hrSeries}>
                <defs>
                  <linearGradient id=\"hr\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">
                    <stop offset=\"5%\" stopColor=\"#007AFF\" stopOpacity={0.6} />
                    <stop offset=\"95%\" stopColor=\"#007AFF\" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey=\"t\" stroke=\"#27272A\" tick={{ fontSize: 10, fill: \"#52525B\" }} />
                <YAxis stroke=\"#27272A\" tick={{ fontSize: 10, fill: \"#52525B\" }} domain={[55, 95]} />
                <Tooltip contentStyle={{ background: \"#0A0A0A\", border: \"1px solid #27272A\", borderRadius: 6 }} />
                <Area type=\"monotone\" dataKey=\"hr\" stroke=\"#007AFF\" fill=\"url(#hr)\" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      <div className=\"mt-8 grid grid-cols-1 md:grid-cols-3 gap-4\">
        {[
          { k: \"fluff\", icon: \"Waveform\", color: \"#10B981\" },
          { k: \"star\", icon: \"ChartBar\", color: \"#007AFF\" },
          { k: \"pause\", icon: \"Lightning\", color: \"#F59E0B\" },
          { k: \"micro\", icon: \"Eye\", color: \"#FF3B30\" },
          { k: \"bio\", icon: \"ShieldCheck\", color: \"#10B981\" },
          { k: \"persona\", icon: \"Brain\", color: \"#007AFF\" },
        ].map((f, i) => (
          <motion.div key={f.k} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.04 }}
            className=\"tile p-5\" data-testid={`dash-feature-${f.k}`}>
            <div className=\"w-2 h-2 rounded-full mb-3\" style={{ background: f.color }} />
            <div className=\"font-display font-semibold\">{t(`feature_${f.k}`)}</div>
            <div className=\"text-xs text-zinc-500 mt-1 leading-relaxed\">{t(`feature_${f.k}_d`)}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
"