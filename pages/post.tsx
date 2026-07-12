import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { tasksApi } from "../services/api";

const DEMO_TASKS = [
  {
    icon: "💳", title: "Billing Issue",
    form: { title: "Duplicate charge on my account", description: "I was charged twice, my email is alice@example.com", reward_ada: 5 }
  },
  {
    icon: "❓", title: "Technical FAQ",
    form: { title: "How does Cardano consensus work?", description: "Explain the Ouroboros consensus mechanism used by Cardano", reward_ada: 3 }
  },
  {
    icon: "📊", title: "Data Analysis",
    form: { title: "Analyze this dataset", description: "data, analyze, what are the trends in AI adoption", reward_ada: 8 }
  }
];

export default function PostTask() {
  const router = useRouter();
  const [form, setForm] = useState({ title: "", description: "", reward_ada: 5 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const task = await tasksApi.create(form);
      router.push(`/task/${task.task_id}`);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to post task");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-12 animate-fadeInMono">
      
      {/* Header */}
      <div className="mb-12 border-b border-[#1F1F28] pb-6">
        <div className="text-[10px] uppercase tracking-[0.2em] text-[#A855F7] mb-2 prompt-prefix">
          Task Request
        </div>
        <h1 className="text-4xl md:text-5xl font-sans font-bold text-white uppercase">
          Post a Bounty
        </h1>
      </div>

      <div className="grid md:grid-cols-5 gap-12">
        
        {/* Left Col: Demo Quick-fills */}
        <div className="md:col-span-2 space-y-4 animate-slideUpMono">
          <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-4 prompt-prefix">
            Templates
          </div>
          {DEMO_TASKS.map((demo, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setForm(demo.form)}
              className="w-full text-left terminal-panel terminal-panel-hover p-5 transition-all duration-300"
            >
              <div className="flex items-center gap-3 mb-2 text-white">
                <span className="text-xl">{demo.icon}</span>
                <span className="font-sans font-bold text-sm tracking-wide uppercase">{demo.title}</span>
              </div>
              <p className="text-[10px] text-gray-500 font-mono tracking-widest line-clamp-1">
                {demo.form.title}
              </p>
            </button>
          ))}
          
          <div className="mt-8 terminal-panel p-5 border-[#1F1F28]">
            <div className="text-xs text-gray-400 font-mono leading-relaxed">
              <span className="text-[#A855F7]">></span> Tasks are broadcast via Masumi MIP-003.<br/>
              <span className="text-[#A855F7]">></span> Bids require Midnight ZK proofs.<br/>
              <span className="text-[#A855F7]">></span> ADA locks in Aiken Escrow upon execution.
            </div>
          </div>
        </div>

        {/* Right Col: Form */}
        <div className="md:col-span-3">
          <form onSubmit={submit} className="terminal-panel p-8 md:p-10 animate-slideUpMono delay-100">
            
            <div className="space-y-8">
              <div>
                <label className="block text-[10px] font-bold tracking-widest uppercase text-[#A855F7] mb-2 prompt-prefix">
                  task.title
                </label>
                <input
                  className="terminal-input"
                  placeholder="e.g. Fix 500 error on checkout API"
                  value={form.title} 
                  onChange={(e) => setForm({ ...form, title: e.target.value })} 
                  required 
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-bold tracking-widest uppercase text-[#A855F7] mb-2 prompt-prefix">
                  task.description
                </label>
                <textarea
                  className="terminal-input h-32 resize-none leading-relaxed"
                  placeholder="Describe the problem, share logs, or provide data..."
                  value={form.description} 
                  onChange={(e) => setForm({ ...form, description: e.target.value })} 
                  required 
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-bold tracking-widest uppercase text-[#A855F7] mb-2 prompt-prefix">
                  bounty.ada
                </label>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white font-bold">₳</span>
                    <input
                      type="number" min={1} step={0.5}
                      className="terminal-input w-32 pl-10 text-white"
                      value={form.reward_ada} 
                      onChange={(e) => setForm({ ...form, reward_ada: Number(e.target.value) })} 
                    />
                  </div>
                  <span className="text-gray-500 text-[10px] uppercase tracking-widest">
                    {(form.reward_ada * 1_000_000).toLocaleString()} lovelace
                  </span>
                </div>
              </div>
              
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono px-4 py-3 rounded-[2px] flex items-center gap-2">
                  <span className="font-bold">ERROR:</span> {error}
                </div>
              )}
              
              <div className="pt-8 border-t border-[#1F1F28] flex items-center gap-4">
                <button
                  type="submit" disabled={loading}
                  className="btn-terminal-primary flex-1 py-4"
                >
                  {loading ? (
                    "EXECUTING..."
                  ) : (
                    "POST BOUNTY →"
                  )}
                </button>
                
                <Link href="/market" className="btn-terminal-outline px-6 py-4">
                  [CANCEL]
                </Link>
              </div>
            </div>
          </form>
        </div>
        
      </div>
    </div>
  );
}
