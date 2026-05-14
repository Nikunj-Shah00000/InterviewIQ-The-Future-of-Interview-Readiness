"import { useEffect, useState } from \"react\";
import { Link } from \"react-router-dom\";
import { motion } from \"framer-motion\";
import { useT } from \"../lib/i18n\";
import { ArrowRight, PlayCircle, Brain, Waveform, ChartBar, Eye, ShieldCheck, Lightning } from \"@phosphor-icons/react\";

const HERO_IMG = \"https://images.unsplash.com/photo-1686771416317-b964cc4e0002?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400\";

const FEATURES = [
  { key: \"persona\", icon: Brain },
  { key: \"fluff\", icon: Waveform },
  { key: \"star\", icon: ChartBar },
  { key: \"pause\", icon: Lightning },
  { key: \"micro\", icon: Eye },
  { key: \"bio\", icon: ShieldCheck },
];

export default function Landing() {
  const { t } = useT();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(x => x + 1), 1200);
    return () => clearInterval(id);
  }, []);

  return (
    <div className=\"relative\">
      <section className=\"max-w-7xl mx-auto px-6 pt-16 pb-20 grid lg:grid-cols-12 gap-10\">
        <div className=\"lg:col-span-7\">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className=\"label-tiny mb-4 flex items-center gap-2\">
              <span className=\"w-1.5 h-1.5 rounded-full bg-[#10B981] pulse-dot\" /> Live · Claude Sonnet 4.5 online
            </div>
            <h1 className=\"font-display font-bold text-4xl sm:text-5xl lg:text-6xl tracking-tight leading-[1.05]\">
              {t(\"tagline\").split(\".\")[0]}.<br />
              <span className=\"text-[#007AFF]\">{t(\"tagline\").split(\".\")[1]?.trim() || \"Pass the interview\"}.</span>
            </h1>
            <p className=\"mt-6 text-zinc-400 text-base sm:text-lg max-w-2xl leading-relaxed\">
              {t(\"hero_sub\")}
            </p>
            <div className=\"mt-8 flex flex-wrap gap-3\">
              <Link to=\"/interview\" className=\"btn-primary flex items-center gap-2\" data-testid=\"cta-launch\">
                {t(\"cta_launch\")} <ArrowRight size={18} weight=\"bold\" />
              </Link>
              <Link to=\"/dashboard\" className=\"btn-ghost flex items-center gap-2\" data-testid=\"cta-demo\">
                <PlayCircle size={18} weight=\"duotone\" /> {t(\"cta_demo\")}
              </Link>
            </div>

            <div className=\"mt-10 grid grid-cols-3 gap-4 max-w-xl\">
              {[
                { l: \"Modules\", v: \"20\" },
                { l: \"Languages\", v: \"5\" },
                { l: \"Persona modes\", v: \"4\" },
              ].map((s, i) => (
                <motion.div key={s.l} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 * i, duration: 0.5 }} className=\"tile p-4\">
                  <div className=\"label-tiny\">{s.l}</div>
                  <div className=\"font-mono-data text-3xl font-bold mt-1\">{s.v}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        <div className=\"lg:col-span-5\">
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7 }} className=\"relative tile overflow-hidden\">
            <img src={HERO_IMG} alt=\"Mock interview\" className=\"w-full h-72 object-cover opacity-80\" />
            <div className=\"absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent\" />
            <div className=\"absolute top-3 left-3 right-3 flex items-center justify-between\">
              <div className=\"glass px-3 py-1.5 rounded-md flex items-center gap-2\">
                <span className=\"w-2 h-2 rounded-full bg-[#FF3B30] pulse-dot\" />
                <span className=\"label-tiny text-white\">LIVE · 04:21</span>
              </div>
              <div className=\"glass px-3 py-1.5 rounded-md font-mono-data text-sm\">
                HRV <span className=\"text-[#10B981]\">{62 + (tick % 5)}ms</span>
              </div>
            </div>

            <div className=\"p-5 border-t border-white/10\">
              <div className=\"label-tiny mb-2\">Real-time score</div>
              <div className=\"flex items-baseline gap-3\">
                <div className=\"font-mono-data text-5xl font-bold text-white\">{72 + (tick % 11)}</div>
                <div className=\"text-zinc-500 text-sm\">/ 100 confidence</div>
              </div>
              <div className=\"mt-4 grid grid-cols-4 gap-1\">
                {[\"S\", \"T\", \"A\", \"R\"].map((k, i) => (
                  <div key={k} className=\"bg-[#0A0A0A] rounded p-2 text-center\">
                    <div className=\"label-tiny\">{k}</div>
                    <div className=\"font-mono-data text-lg\">{[18, 20, 22, 19][i] + (tick % 3)}</div>
                  </div>
                ))}
              </div>
              <div className=\"mt-4 relative h-6 bg-[#0A0A0A] rounded overflow-hidden\">
                <div className=\"absolute inset-0 ekg-sweep\">
                  <svg viewBox=\"0 0 200 24\" className=\"h-6 w-full\">
                    <polyline fill=\"none\" stroke=\"#007AFF\" strokeWidth=\"1.5\"
                      points=\"0,12 20,12 25,4 30,20 35,12 60,12 65,8 70,16 75,12 200,12\" />
                  </svg>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className=\"max-w-7xl mx-auto px-6 pb-20\">
        <div className=\"label-tiny mb-3\">The Stack</div>
        <h2 className=\"font-display text-3xl sm:text-4xl font-bold mb-8 max-w-3xl\">
          Six lenses. One interview. Zero blind spots.
        </h2>
        <div className=\"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4\">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.key}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
                className=\"tile p-6\"
                data-testid={`landing-feature-${f.key}`}
              >
                <Icon size={28} weight=\"duotone\" color=\"#007AFF\" />
                <div className=\"font-display font-semibold mt-4 text-lg\">{t(`feature_${f.key}`)}</div>
                <div className=\"text-zinc-400 text-sm mt-2 leading-relaxed\">{t(`feature_${f.key}_d`)}</div>
              </motion.div>
            );
          })}
        </div>
      </section>

      <footer className=\"border-t border-white/5\">
        <div className=\"max-w-7xl mx-auto px-6 py-8 text-zinc-500 text-xs flex flex-wrap items-center justify-between gap-2\">
          <div>© 2026 CogniHire — interview lab</div>
          <div className=\"font-mono-data\">{t(\"powered_by\")}</div>
        </div>
      </footer>
    </div>
  );
}
"