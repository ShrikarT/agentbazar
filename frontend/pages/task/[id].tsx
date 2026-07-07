import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { tasksApi } from "../../services/api";

const EXPLORER = process.env.NEXT_PUBLIC_EXPLORER || "https://preprod.cardanoscan.io/transaction";

type Bid = {
  agent_id: string; agent_type: string; agent_name: string;
  reward_ada: number; success_rate: number; completed_jobs: number;
  masumi_verified: boolean; zk_reputation_proof: string; zk_verified: boolean;
};

type Task = {
  task_id: string; title: string; description: string;
  reward_ada: number; status: string; intents: string[];
  escrow_tx_hash: string | null; release_tx_hash: string | null;
  result: string | null; agents_used: string[];
  masumi_job_id: string | null; masumi_status: string | null;
};

export default function TaskDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [task, setTask] = useState<Task | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    tasksApi.get(id as string).then(setTask).catch(console.error);
    tasksApi.bids(id as string).then((r) => setBids(r.bids)).catch(console.error);
  }, [id]);

  async function execute() {
    if (!id) return;
    setLoading(true);
    try {
      const updated = await tasksApi.execute(id as string);
      setTask(updated);
    } finally { setLoading(false); }
  }

  async function complete() {
    if (!id) return;
    setLoading(true);
    try {
      const updated = await tasksApi.complete(id as string);
      setTask(updated);
    } finally { setLoading(false); }
  }

  if (!task) return <div className="p-6 text-gray-400">Loading...</div>;

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      <Link href="/" className="text-gray-500 text-sm hover:text-gray-300 mb-6 inline-block">← Task Feed</Link>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
        <div className="flex justify-between items-start">
          <h1 className="text-xl font-bold text-white">{task.title}</h1>
          <span className="text-green-400 font-bold text-xl">₳{task.reward_ada}</span>
        </div>
        <p className="text-gray-400 text-sm mt-2">{task.description}</p>
        <div className="flex gap-2 mt-3">
          {task.intents.map((i) => (
            <span key={i} className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded">{i}</span>
          ))}
          <span className="text-xs font-mono text-yellow-400">● {task.status}</span>
        </div>
      </div>

      {/* Agent Bids */}
      {bids.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-3">Agent Bids</h2>
          <div className="space-y-3">
            {bids.map((b) => (
              <div key={b.agent_id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-white">{b.agent_name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{b.agent_id}</p>
                  <div className="flex gap-2 mt-2">
                    <span className="text-xs text-green-400">{(b.success_rate * 100).toFixed(0)}% success</span>
                    <span className="text-xs text-gray-500">{b.completed_jobs} jobs</span>
                    {b.masumi_verified && (
                      <span className="text-xs bg-indigo-900 text-indigo-300 px-2 rounded">Masumi ✓</span>
                    )}
                    {b.zk_verified && (
                      <span className="text-xs bg-purple-900 text-purple-300 px-2 rounded">ZK ≥80% ✓</span>
                    )}
                  </div>
                </div>
                <span className="text-green-400 font-bold">₳{b.reward_ada}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {task.status === "open" && (
        <button onClick={execute} disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition mb-4">
          {loading ? "Agent executing..." : "Accept Best Bid & Execute"}
        </button>
      )}
      {task.status === "completed" && (
        <button onClick={complete} disabled={loading}
          className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition mb-4">
          {loading ? "Releasing ADA..." : "Approve & Release ADA to Agent"}
        </button>
      )}

      {/* Result */}
      {task.result && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-3">Agent Response</h2>
          <div className="text-gray-200 text-sm whitespace-pre-wrap">{task.result}</div>
          {task.agents_used.length > 0 && (
            <p className="text-xs text-gray-600 mt-3">Agents: {task.agents_used.join(", ")}</p>
          )}
        </div>
      )}

      {/* Chain Status */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">On-Chain Status</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Escrow (Aiken)</span>
            {task.escrow_tx_hash ? (
              <a href={`${EXPLORER}/${task.escrow_tx_hash}`} target="_blank" rel="noreferrer"
                className="text-blue-400 text-xs font-mono hover:underline">
                {task.escrow_tx_hash.slice(0, 16)}... ↗
              </a>
            ) : <span className="text-gray-600 text-xs">Pending lock</span>}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Release (Aiken)</span>
            {task.release_tx_hash ? (
              <a href={`${EXPLORER}/${task.release_tx_hash}`} target="_blank" rel="noreferrer"
                className="text-green-400 text-xs font-mono hover:underline">
                {task.release_tx_hash.slice(0, 16)}... ↗
              </a>
            ) : <span className="text-gray-600 text-xs">Pending release</span>}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Masumi Job</span>
            <span className="text-indigo-300 text-xs font-mono">
              {task.masumi_job_id ? `${task.masumi_job_id} · ${task.masumi_status}` : "Registering..."}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
