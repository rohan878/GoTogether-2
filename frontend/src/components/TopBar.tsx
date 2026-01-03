import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function TopBar() {
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const token = localStorage.getItem("token");

  function logout() {
    localStorage.removeItem("token");
    nav("/login");
  }

  return (
    <div className="sticky top-0 z-50 flex items-center justify-between border-b border-purple-200 bg-white/70 px-4 py-3 backdrop-blur">
      <button
        onClick={() => nav(token ? "/dashboard" : "/login")}
        className="text-xl font-black text-purple-700"
      >
        GoTogether 💜
      </button>

      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-2xl border-2 border-purple-200 bg-white px-4 py-2 font-semibold text-purple-700 hover:bg-purple-50"
        >
          ☰ Menu
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-2xl border border-purple-200 bg-white shadow-lg">
            {!token && (
              <>
                <button
                  onClick={() => {
                    setOpen(false);
                    nav("/login");
                  }}
                  className="block w-full px-4 py-3 text-left text-sm hover:bg-purple-50"
                >
                  🔑 Login
                </button>
                <button
                  onClick={() => {
                    setOpen(false);
                    nav("/register");
                  }}
                  className="block w-full px-4 py-3 text-left text-sm hover:bg-purple-50"
                >
                  ✨ Register
                </button>
              </>
            )}

            {token && (
              <>
                <button
                  onClick={() => {
                    setOpen(false);
                    nav("/create-ride");
                  }}
                  className="block w-full px-4 py-3 text-left text-sm hover:bg-purple-50"
                >
                  🚗 Create Ride
                </button>

                <button
                  onClick={() => {
                    setOpen(false);
                    nav("/monitoring");
                  }}
                  className="block w-full px-4 py-3 text-left text-sm hover:bg-purple-50"
                >
                  🛡️ Ride Monitoring
                </button>

                <button
                  onClick={() => {
                    setOpen(false);
                    nav("/settings");
                  }}
                  className="block w-full px-4 py-3 text-left text-sm hover:bg-purple-50"
                >
                  ⚙️ Settings
                </button>

                <button
                  onClick={() => {
                    setOpen(false);
                    logout();
                  }}
                  className="block w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-purple-50"
                >
                  🚪 Logout
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
