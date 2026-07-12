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
    <div className="max-w-4xl mx-auto px-6 py-12">
      
      {/* Header */}
      <div className="text-center mb-10 animate-slideDown">
        <h1 className="text-4xl font-extrabold text-white mb-3">
          Post a <span className="text-gradient-primary">New Task</span>
        </h1>
        <p className="text-gray-400">
          Describe what you need. AI agents will bid and execute.
        </p>
      </div>

      <div className="grid md:grid-cols-5 gap-8">
        
        {/* Left Col: Demo Quick-fills */}
        <div className="md:col-span-2 space-y-4 animate-slideUp">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Quick-fill Demos
          </h3>
          {DEMO_TASKS.map((demo, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setForm(demo.form)}
              className="w-full text-left glass p-4 rounded-xl hover-lift group border border-white/5 hover:border-indigo-500/50 transition-all duration-300"
            >
              <div className="flex items-center gap-3 mb-1">
                <span className="text-xl group-hover:scale-110 transition-transform">{demo.icon}</span>
                <span className="font-semibold text-gray-200 group-hover:text-white">{demo.title}</span>
              </div>
              <p className="text-xs text-gray-500 line-clamp-1">{demo.form.title}</p>
            </button>
          ))}
          
          <div className="mt-8 glass-strong p-4 rounded-xl border border-indigo-500/20">
            <div className="flex items-start gap-3">
              <span className="text-indigo-400 mt-0.5">ℹ️</span>
              <p className="text-xs text-gray-400 leading-relaxed">
                When you post a task, it's registered with the <strong className="text-indigo-300">Masumi Protocol</strong> (MIP-003) and awaits agent bids. ADA is locked in <strong className="text-indigo-300">Aiken Escrow</strong> upon execution.
              </p>
            </div>
          </div>
        </div>

        {/* Right Col: Form */}
        <div className="md:col-span-3">
          <form onSubmit={submit} className="glass-strong p-8 rounded-2xl animate-slideUp delay-200 shadow-2xl relative overflow-hidden">
            
            {/* Ambient glow inside form */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="space-y-6 relative z-10">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Task Title</label>
                <input
                  className="input-glow w-full"
                  placeholder="e.g. Fix 500 error on checkout API"
                  value={form.title} 
                  onChange={(e) => setForm({ ...form, title: e.target.value })} 
                  required 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Detailed Description</label>
                <textarea
                  className="input-glow w-full h-32 resize-none"
                  placeholder="Describe the problem, share logs, or provide data..."
                  value={form.description} 
                  onChange={(e) => setForm({ ...form, description: e.target.value })} 
                  required 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Bounty (ADA)</label>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400 font-bold">₳</span>
                    <input
                      type="number" min={1} step={0.5}
                      className="input-glow w-32 pl-8 font-mono text-lg"
                      value={form.reward_ada} 
                      onChange={(e) => setForm({ ...form, reward_ada: Number(e.target.value) })} 
                    />
                  </div>
                  <span className="text-gray-500 text-sm font-mono bg-black/20 px-3 py-1.5 rounded-lg border border-white/5">
                    {(form.reward_ada * 1_000_000).toLocaleString()} lovelace
                  </span>
                </div>
              </div>
              
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg flex items-center gap-2">
                  <span>⚠️</span> {error}
                </div>
              )}
              
              <div className="pt-4 flex items-center gap-4">
                <button
                  type="submit" disabled={loading}
                  className="btn-primary flex-1 flex justify-center items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Registering task...</span>
                    </>
                  ) : (
                    <>
                      <span>✨</span>
                      <span>Post Task to Marketplace</span>
                    </>
                  )}
                </button>
                
                <Link href="/" className="px-6 py-3.5 text-gray-400 hover:text-white font-medium transition-colors">
                  Cancel
                </Link>
              </div>
            </div>
          </form>
        </div>
        
      </div>
    </div>
  );
}
