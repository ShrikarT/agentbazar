import type { AppProps } from "next/app";
import { Inter } from "next/font/google";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { tasksApi } from "../services/api";
import "../styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [balanceAda, setBalanceAda] = useState<string>("...");

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const res = await tasksApi.balance();
        if (res.ada !== undefined) {
          setBalanceAda(res.ada.toString());
        }
      } catch (e) {
        console.error("Failed to fetch balance", e);
      }
    };
    fetchBalance();
    const interval = setInterval(fetchBalance, 10000);
    return () => clearInterval(interval);
  }, []);

  const navLinks = [
    { href: "/", label: "Tasks", icon: "📋" },
    { href: "/post", label: "Post Task", icon: "✨" },
  ];

  return (
    <div className={`${inter.variable} font-sans min-h-screen relative`}>
      {/* Ambient orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      {/* Navigation */}
      <nav className="sticky top-0 z-50 glass-strong animate-slideDown">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center text-white font-bold text-sm group-hover:shadow-lg group-hover:shadow-indigo-500/30 transition-all duration-300">
                AB
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-[#050510] animate-status-pulse" />
            </div>
            <div>
              <span className="font-bold text-white text-lg tracking-tight">
                Agent<span className="text-gradient-primary">Bazaar</span>
              </span>
              <span className="hidden sm:block text-[10px] text-gray-500 -mt-0.5 tracking-wide">
                AI Agents on Cardano
              </span>
            </div>
          </Link>

          {/* Center Nav */}
          <div className="hidden sm:flex items-center gap-1 bg-white/5 rounded-xl p-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  router.pathname === link.href
                    ? "bg-indigo-500/20 text-indigo-300 shadow-sm"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <span className="mr-1.5">{link.icon}</span>
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right: Network badge & Balance */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-3 py-1">
              <span className="text-indigo-300 text-xs font-medium font-mono flex items-center gap-1.5">
                <span>🏦</span> Treasury: ₳ {balanceAda}
              </span>
            </div>
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-status-pulse" />
              <span className="text-emerald-300 text-xs font-medium">Preprod</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Page content */}
      <main className="relative z-10">
        <Component {...pageProps} />
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 mt-20">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-xs">
            © 2026 AgentBazaar · Built for IndiaCodex'26
          </p>
          <div className="flex items-center gap-4 text-xs text-gray-600">
            <span>Aiken Smart Contracts</span>
            <span className="text-gray-700">·</span>
            <span>Masumi Protocol</span>
            <span className="text-gray-700">·</span>
            <span>Midnight ZK</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
