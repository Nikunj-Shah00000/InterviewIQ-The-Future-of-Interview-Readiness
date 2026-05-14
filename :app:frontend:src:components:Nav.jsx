"import { Link, useLocation } from \"react-router-dom\";
import { useT, LANGS } from \"../lib/i18n\";
import { Brain, ChartLineUp, IdentificationCard, Microphone, SquaresFour } from \"@phosphor-icons/react\";

export default function Nav() {
  const { t, lang, setLang } = useT();
  const loc = useLocation();
  const links = [
    { to: \"/dashboard\", label: t(\"nav_dashboard\"), icon: SquaresFour, testid: \"nav-dashboard\" },
    { to: \"/interview\", label: t(\"nav_interview\"), icon: Microphone, testid: \"nav-interview\" },
    { to: \"/passport\", label: t(\"nav_passport\"), icon: IdentificationCard, testid: \"nav-passport\" },
    { to: \"/modules\", label: t(\"nav_modules\"), icon: ChartLineUp, testid: \"nav-modules\" },
  ];
  return (
    <nav className=\"sticky top-0 z-50 glass\" data-testid=\"main-nav\">
      <div className=\"max-w-7xl mx-auto px-6 py-3 flex items-center gap-6\">
        <Link to=\"/\" className=\"flex items-center gap-2 group\" data-testid=\"nav-brand\">
          <div className=\"w-9 h-9 rounded-md bg-[#007AFF] flex items-center justify-center group-hover:bg-[#3395FF] transition\">
            <Brain weight=\"duotone\" size={22} color=\"#fff\" />
          </div>
          <div>
            <div className=\"font-display font-bold text-lg leading-none\">{t(\"brand\")}</div>
            <div className=\"label-tiny mt-0.5\">Cognitive interview lab</div>
          </div>
        </Link>
        <div className=\"hidden md:flex items-center gap-1 ml-4\">
          {links.map(l => {
            const Icon = l.icon;
            const active = loc.pathname.startsWith(l.to);
            return (
              <Link
                key={l.to}
                to={l.to}
                data-testid={l.testid}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition ${active ? \"bg-white/10 text-white\" : \"text-zinc-400 hover:text-white hover:bg-white/5\"}`}
              >
                <Icon size={16} weight=\"duotone\" /> {l.label}
              </Link>
            );
          })}
        </div>
        <div className=\"flex-1\" />
        <div className=\"flex items-center gap-1 bg-[#0F0F0F] border border-white/10 rounded-md p-1\" data-testid=\"language-switcher\">
          {LANGS.map(L => (
            <button
              key={L.code}
              data-testid={`lang-btn-${L.code}`}
              onClick={() => setLang(L.code)}
              className={`px-2.5 py-1 rounded text-xs font-mono-data transition ${lang === L.code ? \"bg-[#007AFF] text-white\" : \"text-zinc-400 hover:text-white\"}`}
              title={L.name}
            >
              {L.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
"