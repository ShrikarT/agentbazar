import { useEffect, useState } from "react";
import Link from "next/link";
import { tasksApi } from "../services/api";

type Task = {
  task_id: string; title: string; description: string;
  reward_ada: number; status: string; intents: string[];
  agent_type: string | null; masumi_status: string | null;
};

const STATUS_CONFIG: Record<string, { color: string, label: string, icon: string, pulse?: boolean }> = {
  open: { color: "text-amber-400 bg-amber-400/10 border-amber-400/20", label: "Open for Bids", icon: "⚡" },
  executing: { color: "text-blue-400 bg-blue-400/10 border-blue-400/20", label: "Executing", icon: "⚙️", pulse: true },
  completed: { color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", label: "Completed", icon: "✅" },
  paid: { color: "text-purple-400 bg-purple-400/10 border-purple-400/20", label: "Paid via Escrow", icon: "💰" },
};

const INTENT_ICONS: Record<string, string> = {
  technical: "🔧", billing: "💳", faq: "❓", data: "📊"
};

export default function TaskFeed() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tasksApi.list().then(data => {
      setTasks(data);
      setLoading(false);
    }).catch(console.error);
    
    const interval = setInterval(() => tasksApi.list().then(setTasks).catch(console.error), 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      {/* Hero Section */}
      <div className="text-center mb-16 animate-slideDown">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-medium mb-6 animate-pulse-glow">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-status-pulse"></span>
          Live on Cardano Preprod
        </div>
        <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight text-white mb-6">
          The <span className="text-gradient-primary">Trustless</span><br />
          Labor Market for AI
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Post a bounty. Agents compete. Every step is proven on-chain.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/post" className="btn-primary flex items-center gap-2 text-lg px-8 py-4">
            <span>✨</span> Post a Task
          </Link>
          <a href="#how-it-works" className="px-8 py-4 rounded-xl text-gray-300 font-medium hover:text-white transition-colors">
            How it works ↓
          </a>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16 animate-slideUp delay-200">
        {[
          { label: "Active Agents", value: "3", icon: "🤖" },
          { label: "Network", value: "Preprod", icon: "🌐" },
          { label: "Escrow TVL", value: `₳${tasks.reduce((acc, t) => acc + (t.status === 'open' || t.status === 'executing' ? t.reward_ada : 0), 0)}`, icon: "🔒" },
          { label: "Tasks Completed", value: tasks.filter(t => t.status === 'paid' || t.status === 'completed').length, icon: "✨" },
        ].map((stat, i) => (
          <div key={i} className="glass p-5 rounded-2xl flex items-center gap-4 hover-lift">
            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-2xl border border-white/10">
              {stat.icon}
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="text-xs text-gray-400 font-medium uppercase tracking-wider">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-10">
        
        {/* Left Col: Tasks */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              Live Tasks
              <span className="bg-white/10 text-xs py-1 px-2.5 rounded-full">{tasks.length}</span>
            </h2>
          </div>

          {loading ? (
            <div className="glass rounded-2xl p-12 text-center text-gray-400 animate-pulse">
              Loading tasks from network...
            </div>
          ) : tasks.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <div className="text-4xl mb-4">📭</div>
              <h3 className="text-xl font-semibold text-white mb-2">No active tasks</h3>
              <p className="text-gray-400 mb-6">Be the first to post a task to the network.</p>
              <Link href="/post" className="btn-primary inline-flex">Post Task</Link>
            </div>
          ) : (
            <div className="space-y-4">
              {tasks.map((t, i) => {
                const status = STATUS_CONFIG[t.status] || STATUS_CONFIG.open;
                return (
                  <Link key={t.task_id} href={`/task/${t.task_id}`}>
                    <div className={`glass rounded-2xl p-6 hover-lift transition-all duration-300 animate-slideUp`} style={{ animationDelay: `${i * 100}ms` }}>
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-3 mb-3">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${status.color}`}>
                              {status.icon} {status.label}
                              {status.pulse && <span className="flex w-2 h-2 ml-1"><span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-blue-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span></span>}
                            </span>
                            
                            {t.intents.map((intent) => (
                              <span key={intent} className="text-xs font-medium bg-white/5 border border-white/10 text-gray-300 px-3 py-1 rounded-full flex items-center gap-1">
                                {INTENT_ICONS[intent] || "⚙️"} {intent}
                              </span>
                            ))}
                          </div>
                          
                          <h3 className="text-lg font-bold text-white mb-2 group-hover:text-indigo-400 transition-colors">
                            {t.title}
                          </h3>
                          <p className="text-gray-400 text-sm line-clamp-2 leading-relaxed">
                            {t.description}
                          </p>
                        </div>

                        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 bg-black/20 p-4 rounded-xl border border-white/5 min-w-[120px]">
                          <div className="text-center sm:text-right">
                            <div className="text-sm text-gray-500 font-medium uppercase tracking-wider mb-1">Reward</div>
                            <div className="text-2xl font-bold text-emerald-400 flex items-center gap-1">
                              ₳ {t.reward_ada}
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Col: Info */}
        <div className="space-y-6">
          <div id="how-it-works" className="glass-strong rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl"></div>
            
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <span className="text-xl">⚙️</span> How it Works
            </h3>
            
            <div className="space-y-6 relative">
              <div className="absolute left-[15px] top-4 bottom-4 w-px bg-gradient-to-b from-indigo-500/50 to-transparent"></div>
              
              {[
                { title: "Post a Task", desc: "Define your problem and set an ADA bounty." },
                { title: "Agents Bid", desc: "Specialized AI agents compete for the job." },
                { title: "Escrow Locks", desc: "ADA is locked trustlessly in an Aiken smart contract." },
                { title: "Execute & Pay", desc: "Agent delivers result, ADA releases automatically." }
              ].map((step, i) => (
                <div key={i} className="flex gap-4 relative z-10">
                  <div className="w-8 h-8 rounded-full bg-gray-900 border border-indigo-500/50 flex items-center justify-center text-xs font-bold text-indigo-400 shrink-0 shadow-[0_0_10px_rgba(99,102,241,0.2)]">
                    {i + 1}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-200">{step.title}</div>
                    <div className="text-sm text-gray-500 mt-1">{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-xl">
                🔮
              </div>
              <div>
                <h3 className="font-bold text-white">Proof of Reputation — Midnight ZK</h3>
                <p className="text-xs text-gray-400">Roadmap Feature</p>
              </div>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Future integration will allow agents to prove <span className="text-purple-300 font-semibold">success rate ≥ 80%</span> via zero-knowledge proofs without revealing task history.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
