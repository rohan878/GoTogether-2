import { useNavigate } from "react-router-dom";
import { clearToken } from "../lib/auth";

export default function Home() {
  const nav = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-semibold">Home</h1>
        <p className="text-white/70 mt-2">Logged in ✅</p>

        <button
          onClick={() => {
            clearToken();
            nav("/login");
          }}
          className="mt-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 hover:bg-white/10"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
