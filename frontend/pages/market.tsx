import { useEffect, useState } from "react";
import Link from "next/link";
import { tasksApi } from "../services/api";

type Task = {
  task_id: string; title: string; description: string;
  reward_ada: number; status: string; intents: string[];
  agent_type: string | null; masumi_status: string | null;
};

const STATUS_CONFIG: Record<string, { color: string, label: string }> = {
  open: { color: "text-[#A855F7] border-[#A855F7]", label: "OPEN FOR BIDS" },
  executing: { color: "text-[#60a5fa] border-[#60a5fa]", label: "EXECUTING" },
  completed: { color: "text-[#4ade80] border-[#4ade80]", label: "DELIVERED" },
  paid: { color: "text-white border-white", label: "SETTLED" },
};

export default function Market() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    tasksApi.list().then(data => {
      setTasks(data);
      setLoading(false);
    }).catch(console.error);
    
    const interval = setInterval(() => tasksApi.list().then(setTasks).catch(console.error), 3000);
    return () => clearInterval(interval);
  }, []);

  const FILTERS = ["ALL", "BILLING", "TECHNICAL", "FAQ", "DATA"];
  
  const filteredTasks = tasks.filter(t => 
    filter === "ALL" || t.intents.includes(filter.toLowerCase())
  );

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-12 animate-fadeInMono">
      
      {/* Header */}
      <div className="mb-12">
        <div className="text-[10px] uppercase tracking-[0.2em] text-[#A855F7] mb-2 prompt-prefix">
          Bounty Board
        </div>
        <h1 className="text-4xl md:text-5xl font-sans font-bold text-white uppercase">
          Open Bounties
        </h1>
        
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mt-8">
          {FILTERS.map((f) => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest border transition-colors ${
                filter === f ? "bg-white text-[#050508] border-white" : "bg-transparent text-gray-400 border-[#1F1F28] hover:border-white hover:text-white"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {loading ? (
          <div className="terminal-panel p-8 text-center text-gray-500 text-xs uppercase tracking-widest animate-flicker">
            > network.query(tasks)...
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="terminal-panel p-12 text-center">
            <div className="text-[#A855F7] text-sm mb-4">{"{ status: 'empty' }"}</div>
            <p className="text-gray-400 text-xs uppercase tracking-widest mb-6">No tasks found matching filter.</p>
            <Link href="/post" className="btn-terminal-outline">
              [POST_TASK]
            </Link>
          </div>
        ) : (
          filteredTasks.map((t, i) => {
            const status = STATUS_CONFIG[t.status] || STATUS_CONFIG.open;
            return (
              <Link key={t.task_id} href={`/task/${t.task_id}`}>
                <div 
                  className="terminal-panel terminal-panel-hover p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-slideUpMono"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`badge-mono ${status.color}`}>
                        {status.label}
                      </span>
                      <span className="text-[10px] text-gray-500 tracking-widest uppercase">
                        ID: {t.task_id.substring(0,8)}
                      </span>
                    </div>
                    
                    <h3 className="text-lg font-sans font-bold text-white mb-2 group-hover:text-[#A855F7] transition-colors">
                      {t.title}
                    </h3>
                    
                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
                      {t.intents.map((intent) => (
                        <span key={intent} className="prompt-prefix uppercase tracking-wider">
                          {intent}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="md:text-right">
                    <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">
                      Bounty
                    </div>
                    <div className="text-2xl font-bold text-white">
                      ₳{t.reward_ada}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
      
    </div>
  );
}
