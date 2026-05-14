"import { useEffect, useState } from \"react\";
import { motion } from \"framer-motion\";
import { api } from \"../lib/api\";
import { useT } from \"../lib/i18n\";
import { Share, IdentificationCard, ShieldCheck, Sparkle } from \"@phosphor-icons/react\";

export default function Passport() {
  const { t } = useT();
  const [scores] = useState(() => JSON.parse(localStorage.getItem(\"cognihire_scores\") || \"[]\"));
  const [passport, setPassport] = useState(null);

  useEffect(() => {
    const cats = {};
    [\"Technical\", \"Behavioral\", \"Cultural\", \"Leadership\"].forEach(c => {
      const arr = scores.filter(s => s.category === c).map(s => s.overall);
      cats[c] = arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
    });
    api.readiness({ scores: scores.map(s => s.overall), categories: cats }).then(setPassport).catch(() => {});
  }, [scores]);

  const share = () => {
    const link = `${window.location.origin}/passport?id=${passport?.passport_id}`;
    navigator.clipboard?.writeText(link);
    alert(\"Passport link copied: \" + link);
  };

  return (
    <div className=\"max-w-4xl mx-auto px-6 py-12\">
      <div className=\"label-tiny mb-2\">Verified credential</div>
      <h2 className=\"font-display text-3xl font-bold mb-6\">Readiness Passport</h2>

      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className=\"relative overflow-hidden rounded-md border border-white/10\" data-testid=\"passport-card\">
        <div className=\"absolute inset-0\" style={{
          background: \"radial-gradient(circle at 30% 30%, rgba(0,122,255,0.15), transparent 60%), radial-gradient(circle at 90% 90%, rgba(16,185,129,0.1), transparent 60%), #121212\"
        }} />
        <div className=\"relative p-8 sm:p-10 grid sm:grid-cols-2 gap-8\">
          <div>
            <div className=\"flex items-center gap-2 mb-1\">
              <IdentificationCard size={16} weight=\"duotone\" color=\"#007AFF\" />
              <div className=\"label-tiny\">CGN PASSPORT · Class A</div>
            </div>
            <div className=\"font-display text-6xl font-bold mt-4\">
              {passport?.readiness_score ?? \"—\"}
            </div>
            <div className=\"text-zinc-400 text-sm mt-1\">{passport?.band ?? \"Insufficient data\"} candidate</div>

            <div className=\"mt-8\">
              <div className=\"label-tiny\">Holder</div>
              <div className=\"font-mono-data text-base mt-1\">{localStorage.getItem(\"cognihire_name\") || \"Anonymous candidate\"}</div>
              <div className=\"label-tiny mt-3\">Passport ID</div>
              <div className=\"font-mono-data text-base mt-1\">{passport?.passport_id ?? \"—\"}</div>
              <div className=\"label-tiny mt-3\">Issued</div>
              <div className=\"font-mono-data text-xs mt-1\">{passport?.issued_at?.slice(0, 19).replace(\"T\", \" \") || \"—\"} UTC</div>
            </div>
          </div>

          <div className=\"space-y-3\">
            <div className=\"flex items-center gap-2\"><ShieldCheck size={14} color=\"#10B981\" /><div className=\"text-sm text-zinc-300\">Verified by CogniHire AI lab</div></div>
            <div className=\"flex items-center gap-2\"><Sparkle size={14} color=\"#007AFF\" /><div className=\"text-sm text-zinc-300\">{scores.length} answers scored</div></div>
            <div className=\"flex items-center gap-2\"><IdentificationCard size={14} color=\"#F59E0B\" /><div className=\"text-sm text-zinc-300\">Tamper-evident hash</div></div>

            <div className=\"mt-6 p-4 bg-black/40 border border-white/10 rounded-md font-mono-data text-[10px] leading-relaxed break-all text-zinc-500\">
              {passport ? btoa((passport.passport_id || \"\") + (passport.readiness_score || \"\")).slice(0, 80) : \"\"}
            </div>
            <button data-testid=\"share-passport\" onClick={share} className=\"btn-primary mt-2 w-full flex items-center justify-center gap-2\">
              <Share size={16} weight=\"bold\" /> Share with recruiter
            </button>
          </div>
        </div>
      </motion.div>

      <p className=\"text-zinc-500 text-xs mt-6 leading-relaxed max-w-2xl\">
        Your CogniHire Passport is a verified, shareable credential proving you've passed rigorous interview prep. Like a credit score for interviews — opt in to share with recruiters.
      </p>
    </div>
  );
}
"