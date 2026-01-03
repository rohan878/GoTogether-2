import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export default function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left: cute marketing card */}
          <div className="relative overflow-hidden rounded-3xl border bg-white/70 p-8 shadow-sm backdrop-blur">
            <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-pink-200/50 blur-2xl" />
            <div className="absolute -left-24 -bottom-24 h-64 w-64 rounded-full bg-purple-200/50 blur-2xl" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-2xl border bg-white px-3 py-1 text-sm">
                <span>🚗</span> <span className="font-semibold">GoTogether</span>
                <span className="text-gray-500">• safer ride sharing</span>
              </div>

              <h1 className="mt-5 text-4xl font-extrabold tracking-tight">
                {title} ✨
              </h1>
              <p className="mt-3 text-gray-600">{subtitle}</p>

              <div className="mt-6 grid gap-3 text-sm text-gray-700">
                <div className="rounded-2xl border bg-white/60 p-4">
                  ✅ OTP verified phone <br />
                  ✅ Admin approved ID <br />
                  ✅ Temporary group chat
                </div>
                <div className="rounded-2xl border bg-white/60 p-4">
                  🔒 No name/photo in notifications (only gender + distance)
                </div>
              </div>

              <div className="mt-6 flex gap-3 text-sm">
                <Link className="rounded-2xl border bg-white px-4 py-2" to="/login">
                  Login
                </Link>
                <Link className="rounded-2xl bg-black px-4 py-2 text-white" to="/register">
                  Register
                </Link>
              </div>
            </div>
          </div>

          {/* Right: form */}
          <div className="rounded-3xl border bg-white p-8 shadow-sm">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
