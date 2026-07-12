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

const INTENT_ICONS: Record<string, string> = {
  technical: "🔧", billing: "💳", faq: "❓", data: "📊"
};

export default function TaskDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [task, setTask] = useState<Task | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(false);
  const [execStep, setExecStep] = useState(0);
  const [isLockConfirmed, setIsLockConfirmed] = useState(false);
  const [refunding, setRefunding] = useState(false);
  const [zkProof, setZkProof] = useState<any>(null);
  const [showZkProof, setShowZkProof] = useState(false);

  useEffect(() => {
    if (!task?.escrow_tx_hash || task.status === 'paid' || task.status === 'refunded' || isLockConfirmed) return;
    const interval = setInterval(async () => {
      try {
        const res = await tasksApi.lockStatus(task.task_id);
        if (res.confirmed) setIsLockConfirmed(true);
      } catch (e) {
        console.error(e);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [task, isLockConfirmed]);

  useEffect(() => {
    if (!id) return;
    tasksApi.get(id as string).then(setTask).catch(console.error);
    tasksApi.bids(id as string).then((r) => setBids(r.bids)).catch(console.error);
  }, [id]);

  async function execute() {
    if (!id) return;
    setLoading(true);
    setExecStep(1); // 🔍 Detecting intent...
    
    setTimeout(async () => {
      setExecStep(2); // 🔐 ZK Proof
      try {
        const proofRes = await tasksApi.proveZk(bids[0]?.agent_id || "agent");
        setZkProof(proofRes.proof_json);
      } catch (e) {
        console.error(e);
      }
      
      setExecStep(3); // 🔒 Locking ADA...
      setTimeout(() => setExecStep(4), 1500); // 🤖 Agent executing...
      
      try {
        const updated = await tasksApi.execute(id as string);
        setExecStep(5); // 📋 Generating response...
        setTimeout(() => {
          setTask(updated);
          setExecStep(6); // Done
          setLoading(false);
        }, 1000);
      } catch (e) {
        console.error(e);
        setLoading(false);
        setExecStep(0);
      }
    }, 1500);
  }

  async function complete() {
    if (!id) return;
    setLoading(true);
    try {
      const updated = await tasksApi.complete(id as string);
      setTask(updated);
    } catch (e: any) {
      console.error(e);
      alert(e.response?.data?.detail || e.message || "Failed to release ADA");
    } finally {
      setLoading(false);
    }
  }

  async function refund() {
    if (!id) return;
    setRefunding(true);
    try {
      const updated = await tasksApi.refund(id as string);
      setTask(updated);
    } catch (e: any) {
      console.error(e);
      alert(e.response?.data?.detail || e.message || "Failed to refund ADA");
    } finally {
      setRefunding(false);
    }
  }

  if (!task) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-400 rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors mb-8 group font-medium">
        <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to Marketplace
      </Link>

      <div className="grid md:grid-cols-3 gap-8">
        
        {/* Left Col: Main Task Info & Result */}
        <div className="md:col-span-2 space-y-6">
          
          <div className="glass-strong rounded-2xl p-8 relative overflow-hidden animate-slideUp">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div className="flex gap-2">
                {task.intents.map((i) => (
                  <span key={i} className="text-xs font-semibold bg-white/5 border border-white/10 text-gray-300 px-3 py-1 rounded-full flex items-center gap-1">
                    {INTENT_ICONS[i] || "⚙️"} {i}
                  </span>
                ))}
              </div>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                task.status === 'open' ? 'text-amber-400 bg-amber-400/10 border border-amber-400/20' :
                task.status === 'executing' ? 'text-blue-400 bg-blue-400/10 border border-blue-400/20' :
                task.status === 'paid' ? 'text-purple-400 bg-purple-400/10 border border-purple-400/20' :
                task.status === 'refunded' ? 'text-red-400 bg-red-400/10 border border-red-400/20' :
                'text-emerald-400 bg-emerald-400/10 border border-emerald-400/20'
              }`}>
                {task.status === 'executing' && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>}
                {task.status}
              </span>
            </div>

            <h1 className="text-2xl font-bold text-white mb-4">{task.title}</h1>
            <p className="text-gray-400 text-sm leading-relaxed whitespace-pre-wrap bg-black/20 p-4 rounded-xl border border-white/5">
              {task.description}
            </p>
          </div>

          {/* Execution Timeline (Shown during execution) */}
          {execStep > 0 && execStep < 6 && (
            <div className="glass-strong rounded-2xl p-8 animate-fadeIn border-indigo-500/30">
              <h3 className="text-sm font-semibold text-indigo-400 uppercase tracking-widest mb-6">Live Execution</h3>
              
              <div className="space-y-4 relative">
                <div className="absolute left-[11px] top-3 bottom-3 w-0.5 bg-indigo-500/20"></div>
                
                {[
                  { step: 1, label: "🔍 Detecting intent and routing to specialist agent..." },
                  { step: 2, label: "🔐 Generating & Verifying Midnight ZK Reputation Proof..." },
                  { step: 3, label: "🔒 Locking ADA in Aiken smart contract escrow on Preprod..." },
                  { step: 4, label: "🤖 Agent executing task and computing result..." },
                  { step: 5, label: "📋 Finalizing response..." }
                ].map((s) => (
                  <div key={s.step} className={`flex items-start gap-4 relative z-10 transition-all duration-500 ${execStep >= s.step ? 'opacity-100' : 'opacity-30'}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5 ${
                      execStep > s.step ? 'bg-emerald-500 text-white animate-check-pop' :
                      execStep === s.step ? 'bg-indigo-500 text-white animate-pulse' :
                      'bg-gray-800 text-gray-500 border border-gray-700'
                    }`}>
                      {execStep > s.step ? '✓' : s.step}
                    </div>
                    <div className={`text-sm ${execStep === s.step ? 'text-white font-medium' : 'text-gray-400'}`}>
                      {s.label}
                      {s.step === 2 && execStep >= 2 && zkProof && (
                        <div className="mt-2">
                          <button onClick={() => setShowZkProof(!showZkProof)} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
                            {showZkProof ? '▼ Hide' : '▶ View'} proof.json
                          </button>
                          {showZkProof && (
                            <pre className="mt-2 text-[10px] text-gray-400 bg-black/40 p-3 rounded-lg overflow-x-auto border border-white/5 font-mono shadow-inner max-w-lg">
                              {JSON.stringify(zkProof, null, 2)}
                            </pre>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Result */}
          {task.result && (
            <div className="glass rounded-2xl p-8 animate-slideUp border-emerald-500/30 bg-emerald-900/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
              
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-xl">
                  ✨
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-emerald-400 uppercase tracking-widest">Agent Response</h2>
                  {task.agents_used.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">Generated by {task.agents_used.join(", ")}</p>
                  )}
                </div>
              </div>
              
              <div className="prose prose-invert prose-sm max-w-none text-gray-300 leading-relaxed bg-black/20 p-5 rounded-xl border border-white/5 whitespace-pre-wrap font-mono">
                {task.result}
              </div>

              {task.status === "completed" && (
                <div className="mt-8 space-y-3">
                  <div className="flex gap-4">
                      <button onClick={complete} disabled={loading || refunding || !isLockConfirmed}
                        className="flex-1 btn-success flex justify-center items-center gap-2">
                        {loading ? (
                          <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Releasing ADA...</>
                        ) : !isLockConfirmed ? (
                          <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Waiting for block...</>
                        ) : (
                          <><span>💰</span> Approve & Release ADA</>
                        )}
                      </button>
                      <button onClick={refund} disabled={loading || refunding || !isLockConfirmed}
                        className="flex-1 bg-red-600/80 hover:bg-red-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition flex justify-center items-center gap-2 border border-red-500/50 shadow-[0_0_20px_rgba(220,38,38,0.2)]">
                        {refunding ? (
                          <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Refunding...</>
                        ) : (
                          <><span>🛑</span> Reject & Refund ADA</>
                        )}
                      </button>
                  </div>
                  <p className="text-center text-xs text-gray-500 mt-3">
                    {!isLockConfirmed ? "Waiting for the lock transaction to confirm before actions can be taken." : "Choose whether to release the bounty to the agent or refund it to your wallet."}
                  </p>
                </div>
              )}
              {task.status === "refunded" && (
                <div className="mt-8 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
                    <p className="text-red-400 font-bold uppercase tracking-wider text-sm">Refunded</p>
                    <p className="text-xs text-gray-500 mt-1">The ADA was returned to the poster.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Col: Metadata & Actions */}
        <div className="space-y-6">
          
          <div className="glass-strong rounded-2xl p-6 text-center animate-slideUp">
            <div className="text-sm text-gray-500 font-medium uppercase tracking-wider mb-2">Bounty Locked</div>
            <div className="text-4xl font-black text-emerald-400 flex items-center justify-center gap-2 mb-1">
              ₳ {task.reward_ada}
            </div>
            <div className="text-xs text-gray-500 font-mono">
              {(task.reward_ada * 1_000_000).toLocaleString()} lovelace
            </div>
          </div>

          {/* Action Button */}
          {task.status === "open" && bids.length > 0 && (
            <button onClick={execute} disabled={loading}
              className="w-full btn-primary py-4 animate-slideUp delay-100 flex justify-center items-center gap-2 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
              {loading ? (
                <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Connecting...</>
              ) : (
                <><span>⚡</span> Accept Best Bid & Execute</>
              )}
            </button>
          )}

          {/* Agent Bids */}
          {bids.length > 0 && (
            <div className="glass rounded-2xl p-6 animate-slideUp delay-200">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center justify-between">
                Marketplace Bids
                <span className="bg-white/10 px-2 py-0.5 rounded-full">{bids.length}</span>
              </h2>
              <div className="space-y-3">
                {bids.map((b) => (
                  <div key={b.agent_id} className={`p-4 rounded-xl border transition-all ${
                    task.status !== 'open' ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-black/20 border-white/5 hover:border-indigo-500/30'
                  }`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-bold text-gray-200 text-sm flex items-center gap-2">
                          {INTENT_ICONS[b.agent_type] || "🤖"} {b.agent_name}
                          {task.status !== 'open' && <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full">SELECTED</span>}
                        </p>
                        <p className="text-[10px] text-gray-500 font-mono mt-1">{b.agent_id}</p>
                      </div>
                      <span className="text-emerald-400 font-bold text-sm">₳{b.reward_ada}</span>
                    </div>
                    
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      <span className="text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded">
                        {(b.success_rate * 100).toFixed(0)}% Success
                      </span>
                      {b.masumi_verified && (
                        <span className="text-[10px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-1 rounded">
                          Masumi MIP-003 ✓
                        </span>
                      )}
                      {b.zk_verified && (
                        <span className="text-[10px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-1 rounded">
                          Midnight ZK ✓
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chain Status */}
          <div className="glass rounded-2xl p-6 animate-slideUp delay-300">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span>⛓️</span> On-Chain Status
            </h2>
            <div className="space-y-4">
              
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-400 text-xs font-medium">Aiken Escrow Lock</span>
                  {task.escrow_tx_hash ? (
                    <span className="text-emerald-400 text-[10px] bg-emerald-400/10 px-2 py-0.5 rounded uppercase font-bold">Confirmed</span>
                  ) : <span className="text-gray-600 text-[10px] uppercase font-bold">Pending</span>}
                </div>
                {task.escrow_tx_hash ? (
                  <a href={`${EXPLORER}/${task.escrow_tx_hash}`} target="_blank" rel="noreferrer"
                    className="block text-indigo-400 text-xs font-mono hover:text-indigo-300 transition-colors bg-black/20 p-2 rounded-lg border border-white/5 truncate">
                    {task.escrow_tx_hash} ↗
                  </a>
                ) : (
                  <div className="text-gray-600 text-xs font-mono bg-black/20 p-2 rounded-lg border border-white/5">Waiting for execution...</div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-400 text-xs font-medium">Aiken Escrow Release</span>
                  {task.release_tx_hash ? (
                    <span className="text-emerald-400 text-[10px] bg-emerald-400/10 px-2 py-0.5 rounded uppercase font-bold">Confirmed</span>
                  ) : <span className="text-gray-600 text-[10px] uppercase font-bold">Pending</span>}
                </div>
                {task.release_tx_hash ? (
                  <a href={`${EXPLORER}/${task.release_tx_hash}`} target="_blank" rel="noreferrer"
                    className="block text-indigo-400 text-xs font-mono hover:text-indigo-300 transition-colors bg-black/20 p-2 rounded-lg border border-white/5 truncate">
                    {task.release_tx_hash} ↗
                  </a>
                ) : (
                  <div className="text-gray-600 text-xs font-mono bg-black/20 p-2 rounded-lg border border-white/5">Waiting for approval...</div>
                )}
              </div>

              <div className="pt-2 border-t border-white/5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-400 text-xs font-medium">Masumi Job Tracker</span>
                </div>
                <div className="text-indigo-300 text-xs font-mono bg-indigo-500/10 p-2 rounded-lg border border-indigo-500/20">
                  {task.masumi_job_id ? (
                    <div className="flex flex-col gap-1">
                      <span className="text-gray-400">ID: {task.masumi_job_id}</span>
                      <span className="font-bold flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${task.masumi_status === 'completed' ? 'bg-emerald-400' : 'bg-indigo-400 animate-pulse'}`}></span>
                        Status: {task.masumi_status}
                      </span>
                    </div>
                  ) : "Registering..."}
                </div>
              </div>

            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
