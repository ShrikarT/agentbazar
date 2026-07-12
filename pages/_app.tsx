import type { AppProps } from "next/app";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { tasksApi } from "../services/api";
import "../styles/globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
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
    { href: "/market", label: "AGENTS" },
    { href: "/market", label: "TASKS" },
    { href: "/", label: "CONTRACTS" },
  ];

  return (
    <div className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} min-h-screen relative font-mono text-gray-300`}>
      
      {/* Ambient Thermal Glows */}
      <div className="thermal-blob thermal-1" />
      <div className="thermal-blob thermal-2" />
      <div className="thermal-blob thermal-3" />
      <div className="animate-scanline" />

      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-[#1F1F28] bg-[#050508]/90 backdrop-blur-md animate-slideUpMono">
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
          
          {/* Left: Logo */}
          <Link href="/" className="flex items-center gap-4 group">
            <div className="w-8 h-8 border border-white bg-white text-[#050508] flex items-center justify-center font-bold text-xs group-hover:bg-[#050508] group-hover:text-white transition-colors">
              PW
            </div>
            <span className="font-bold text-white text-sm tracking-wider uppercase">
              ProofWork
            </span>
          </Link>

          {/* Center Nav */}
          <div className="hidden md:flex items-center gap-10">
            {navLinks.map((link, i) => (
              <Link
                key={i}
                href={link.href}
                className={`text-[11px] font-bold tracking-[0.2em] transition-colors ${
                  router.pathname === link.href ? "text-[#A855F7]" : "text-gray-400 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right: Network badge & Balance */}
          <div className="flex items-center gap-6">
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-gray-500 text-[10px] uppercase tracking-widest">Treasury</span>
              <span className="text-white text-sm font-bold">₳ {balanceAda}</span>
            </div>
            
            <Link href="/market" className="btn-terminal-primary">
              LAUNCH APP →
            </Link>
          </div>
        </div>
      </nav>

      {/* Page content */}
      <main className="relative z-10 min-h-[calc(100vh-64px)]">
        <Component {...pageProps} />
      </main>

    </div>
  );
}
