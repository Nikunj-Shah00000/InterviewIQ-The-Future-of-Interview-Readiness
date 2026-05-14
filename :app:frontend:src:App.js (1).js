"import \"./App.css\";
import { BrowserRouter, Routes, Route } from \"react-router-dom\";
import { I18nProvider } from \"./lib/i18n\";
import Nav from \"./components/Nav\";
import Landing from \"./pages/Landing\";
import Dashboard from \"./pages/Dashboard\";
import LiveInterview from \"./pages/LiveInterview\";
import Passport from \"./pages/Passport\";
import Modules from \"./pages/Modules\";
import { Toaster } from \"./components/ui/sonner\";

function App() {
  return (
    <I18nProvider>
      <BrowserRouter>
        <div className=\"App grain min-h-screen\">
          <Nav />
          <Routes>
            <Route path=\"/\" element={<Landing />} />
            <Route path=\"/dashboard\" element={<Dashboard />} />
            <Route path=\"/interview\" element={<LiveInterview />} />
            <Route path=\"/passport\" element={<Passport />} />
            <Route path=\"/modules\" element={<Modules />} />
          </Routes>
          <Toaster />
        </div>
      </BrowserRouter>
    </I18nProvider>
  );
}

export default App;
"