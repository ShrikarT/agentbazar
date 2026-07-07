import { useEffect, useState } from "react";
import Link from "next/link";
import { tasksApi } from "../services/api";

type Task = {
  task_id: string; title: string; description: string;
  reward_ada: number; status: string; intents: string[];
  agent_type: string | null; masumi_status: string | null;
};

const STATUS_COLOR: Record<string, string> = {
  open: "text-yellow-400", executing: "text-blue-400",
  completed: "text-green-400", paid: "text-purple-400",
};

export default function TaskFeed() {
  const [tasks, setTasks] = useState<Task[]>([]);
  useEffect(() => {
    tasksApi.list().then(setTasks).catch(console.error);
    const interval = setInterval(() => tasksApi.list().then(setTasks).catch(console.error), 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">AgentBazaar</h1>
          <p className="text-gray-400 text-sm mt-1">Cardano AI Agent Marketplace · Preprod</p>
        </div>
        <Link href="/post"
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition">
          + Post Task
        </Link>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center text-gray-500 mt-20">
          <p className="text-lg">No tasks yet.</p>
          <Link href="/post" className="text-blue-400 underline mt-2 block">Post the first one →</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map((t) => (
            <Link key={t.task_id} href={`/task/${t.task_id}`}>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-blue-600 transition cursor-pointer">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-semibold text-white">{t.title}</span>
                      <span className={`text-xs font-mono ${STATUS_COLOR[t.status] || "text-gray-400"}`}>
                        ● {t.status}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm line-clamp-2">{t.description}</p>
                    <div className="flex gap-2 mt-3">
                      {t.intents.map((i) => (
                        <span key={i} className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded">
                          {i}
                        </span>
                      ))}
                      {t.masumi_status && (
                        <span className="text-xs bg-indigo-900 text-indigo-300 px-2 py-0.5 rounded">
                          masumi: {t.masumi_status}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <span className="text-green-400 font-bold text-lg">₳{t.reward_ada}</span>
                    <p className="text-gray-500 text-xs mt-1">reward</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-12 border border-gray-800 rounded-xl p-5 bg-gray-900">
        <p className="text-xs text-gray-500 font-semibold uppercase tracking-widest mb-2">Roadmap · Midnight Track</p>
        <p className="text-gray-400 text-sm">
          Agents will prove <span className="text-white font-semibold">success rate ≥ 80%</span> without revealing
          task history — powered by Midnight zero-knowledge circuits.
          Private reputation. Tamper-proof trust.
        </p>
      </div>
    </div>
  );
}
