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

const formatTime = () => new Date().toISOString().split('T')[1].substring(0, 12);

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
    setExecStep(1); 
    
    setTimeout(async () => {
      setExecStep(2); 
      try {
        const proofRes = await tasksApi.proveZk(bids[0]?.agent_id || "agent");
        setZkProof(proofRes.proof_json);
      } catch (e) {
        console.error(e);
      }
      
      setExecStep(3); 
      setTimeout(() => setExecStep(4), 1500); 
      
      try {
        const updated = await tasksApi.execute(id as string);
        setExecStep(5); 
        setTimeout(() => {
          setTask(updated);
          setExecStep(6); 
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
    <div className="min-h-screen flex items-center justify-center font-mono text-[#A855F7] text-sm animate-flicker">
      > system.booting...
    </div>
  );

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-12 animate-fadeInMono">
      
      <div className="mb-8">
        <Link href="/market" className="text-[10px] uppercase tracking-widest text-gray-500 hover:text-white transition-colors">
          &lt; RETURN TO MARKET
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* ── Left Col: Main Task Info & Result ── */}
        <div className="lg:col-span-2 space-y-8">
          
          <div className="terminal-panel p-8 md:p-10">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8 border-b border-[#1F1F28] pb-6">
              <div className="flex gap-4">
                {task.intents.map((i) => (
                  <span key={i} className="text-[10px] font-bold tracking-widest uppercase text-gray-400 prompt-prefix">
                    {i}
                  </span>
                ))}
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${
                task.status === 'open' ? 'text-[#A855F7]' :
                task.status === 'executing' ? 'text-[#60a5fa] animate-pulse' :
                task.status === 'paid' ? 'text-white' :
                task.status === 'refunded' ? 'text-red-500' :
                'text-[#4ade80]'
              }`}>
                STATUS: {task.status}
              </span>
            </div>

            <h1 className="text-3xl font-sans font-bold text-white mb-6 uppercase leading-tight">{task.title}</h1>
            <div className="text-sm font-mono text-gray-400 leading-loose whitespace-pre-wrap">
              {task.description}
            </div>
          </div>

          {/* ── Execution Terminal Log ── */}
          {execStep > 0 && execStep < 6 && (
            <div className="terminal-panel p-6 bg-[#050508] border-[#A855F7] shadow-[0_0_15px_rgba(168,85,247,0.1)]">
              <div className="text-[10px] text-[#A855F7] uppercase tracking-widest mb-4 pb-2 border-b border-[#1F1F28] flex justify-between">
                <span>execution.log</span>
                <span className="animate-flicker">_</span>
              </div>
              <div className="font-mono text-xs leading-loose space-y-1">
                {execStep >= 1 && <div className="text-gray-400">[{formatTime()}] <span className="text-[#A855F7]">sys</span> Detecting intent and routing to specialist agent...</div>}
                
                {execStep >= 2 && (
                  <div className="text-gray-400">
                    [{formatTime()}] <span className="text-[#A855F7]">zkp</span> Generating & Verifying Midnight ZK Reputation Proof...
                    {zkProof && (
                      <div className="mt-2 ml-16 mb-2">
                        <button onClick={() => setShowZkProof(!showZkProof)} className="text-[10px] text-gray-500 hover:text-white uppercase tracking-widest border border-[#1F1F28] px-2 py-1">
                          > {showZkProof ? 'clear' : 'cat proof.json'}
                        </button>
                        {showZkProof && (
                          <pre className="mt-2 text-[10px] text-emerald-500/70 p-4 border border-[#1F1F28] bg-[#0A0A0F] max-w-xl overflow-x-auto">
                            {JSON.stringify(zkProof, null, 2)}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                {execStep >= 3 && <div className="text-gray-400">[{formatTime()}] <span className="text-[#A855F7]">escrow</span> Locking ADA in Aiken smart contract on Preprod...</div>}
                {execStep >= 4 && <div className="text-gray-400">[{formatTime()}] <span className="text-emerald-500">agent</span> Executing task and computing result...</div>}
                {execStep >= 5 && <div className="text-gray-400">[{formatTime()}] <span className="text-emerald-500">agent</span> Finalizing response payload...</div>}
              </div>
            </div>
          )}

          {/* ── Result Panel ── */}
          {task.result && (
            <div className="terminal-panel p-8 md:p-10 border-emerald-500/50 shadow-[0_0_20px_rgba(52,211,153,0.1)] relative">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-8 border-b border-[#1F1F28] pb-6">
                <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-500 font-bold prompt-prefix !text-emerald-500">
                  AGENT.RESPONSE
                </div>
                {task.agents_used.length > 0 && (
                  <div className="text-[10px] text-gray-500 uppercase tracking-widest">
                    AUTHOR: {task.agents_used.join(", ")}
                  </div>
                )}
              </div>
              
              <div className="font-mono text-sm text-gray-300 leading-loose whitespace-pre-wrap">
                {task.result}
              </div>

              {task.status === "completed" && (
                <div className="mt-12 pt-8 border-t border-[#1F1F28] space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <button onClick={complete} disabled={loading || refunding}
                      className="flex-1 btn-terminal-primary !bg-emerald-500 !text-[#050508] !border-emerald-500 hover:!bg-white disabled:!opacity-50 flex justify-center py-4">
                      {loading ? "[ RELEASING... ]" : !isLockConfirmed ? "[ AWAITING TX... CLICK TO FORCE ]" : "[ APPROVE & PAY ]"}
                    </button>
                    <button onClick={refund} disabled={loading || refunding}
                      className="flex-1 btn-terminal-outline !text-red-500 !border-red-500/50 hover:!bg-red-500 hover:!text-white disabled:!opacity-50 flex justify-center py-4">
                      {refunding ? "[ REFUNDING... ]" : "[ REJECT & REFUND ]"}
                    </button>
                  </div>
                  <p className="text-center text-[10px] text-gray-500 font-mono tracking-widest uppercase">
                    {!isLockConfirmed ? "Lock tx usually takes ~30s. If stuck, force attempt." : "Validator requires signature to release or refund."}
                  </p>
                </div>
              )}
              {task.status === "refunded" && (
                <div className="mt-8 border border-red-500/30 p-4 text-center bg-red-500/5">
                  <p className="text-red-500 font-bold text-xs uppercase tracking-widest">REFUND PROCESSED</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right Col: Metadata & Actions ── */}
        <div className="space-y-8">
          
          <div className="terminal-panel p-8">
            <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-4">BOUNTY.LOCKED</div>
            <div className="text-4xl font-sans font-bold text-white mb-2">₳ {task.reward_ada}</div>
            <div className="text-[10px] text-gray-500 font-mono tracking-widest uppercase">
              {(task.reward_ada * 1_000_000).toLocaleString()} lovelace
            </div>
          </div>

          {/* Action Button */}
          {task.status === "open" && bids.length > 0 && (
            <button onClick={execute} disabled={loading} className="w-full btn-terminal-primary py-4">
              {loading ? "[ CONNECTING... ]" : "[ ACCEPT BEST BID ]"}
            </button>
          )}

          {/* Agent Bids */}
          {bids.length > 0 && (
            <div className="terminal-panel p-6">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6 flex justify-between items-center">
                <span>MARKETPLACE BIDS</span>
                <span className="text-[#A855F7]">[{bids.length}]</span>
              </div>
              <div className="space-y-4">
                {bids.map((b) => (
                  <div key={b.agent_id} className={`p-4 border ${task.status !== 'open' ? 'border-[#A855F7]/30 bg-[#A855F7]/5' : 'border-[#1F1F28] bg-[#0A0A0F]'}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-sans font-bold text-white text-sm tracking-wide uppercase flex items-center gap-2">
                          {b.agent_name}
                          {task.status !== 'open' && <span className="text-[8px] bg-[#A855F7] text-[#050508] px-1.5 py-0.5">SELECTED</span>}
                        </div>
                        <div className="text-[10px] text-gray-500 font-mono mt-1 uppercase">ID: {b.agent_id.substring(0,12)}...</div>
                      </div>
                      <span className="text-white font-mono font-bold text-sm">₳{b.reward_ada}</span>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mt-4">
                      <span className="text-[8px] uppercase tracking-widest font-bold border border-[#1F1F28] px-2 py-1 text-gray-300">
                        {(b.success_rate * 100).toFixed(0)}% SUCCESS
                      </span>
                      {b.masumi_verified && (
                        <span className="text-[8px] uppercase tracking-widest font-bold border border-blue-500/30 text-blue-400 px-2 py-1">
                          MIP-003
                        </span>
                      )}
                      {b.zk_verified && (
                        <span className="text-[8px] uppercase tracking-widest font-bold border border-[#A855F7]/50 text-[#A855F7] px-2 py-1">
                          ZK PROOF
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chain Status */}
          <div className="terminal-panel p-6">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6">
              ON-CHAIN STATUS
            </div>
            
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest">Escrow Lock</span>
                  {task.escrow_tx_hash ? (
                    <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">CONFIRMED</span>
                  ) : <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">PENDING</span>}
                </div>
                {task.escrow_tx_hash ? (
                  <a href={`${EXPLORER}/${task.escrow_tx_hash}`} target="_blank" rel="noreferrer"
                    className="block text-[10px] text-[#A855F7] border border-[#1F1F28] p-2 hover:border-[#A855F7] hover:bg-[#A855F7]/10 transition-colors truncate">
                    tx: {task.escrow_tx_hash.substring(0,16)}... ↗
                  </a>
                ) : (
                  <div className="text-[10px] text-gray-600 border border-[#1F1F28] p-2 uppercase tracking-widest">AWAITING EXECUTION</div>
                )}
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest">Escrow Release</span>
                  {task.release_tx_hash ? (
                    <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">CONFIRMED</span>
                  ) : <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">PENDING</span>}
                </div>
                {task.release_tx_hash ? (
                  <a href={`${EXPLORER}/${task.release_tx_hash}`} target="_blank" rel="noreferrer"
                    className="block text-[10px] text-[#A855F7] border border-[#1F1F28] p-2 hover:border-[#A855F7] hover:bg-[#A855F7]/10 transition-colors truncate">
                    tx: {task.release_tx_hash.substring(0,16)}... ↗
                  </a>
                ) : (
                  <div className="text-[10px] text-gray-600 border border-[#1F1F28] p-2 uppercase tracking-widest">AWAITING APPROVAL</div>
                )}
              </div>

              <div className="pt-6 border-t border-[#1F1F28]">
                <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Masumi Job Tracker</div>
                <div className="border border-blue-500/20 p-3 bg-blue-500/5">
                  {task.masumi_job_id ? (
                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] text-gray-400 font-mono">ID: {task.masumi_job_id.substring(0,12)}...</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400 flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 bg-blue-400 ${task.masumi_status !== 'completed' ? 'animate-pulse' : ''}`}></span>
                        {task.masumi_status}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-gray-600 uppercase tracking-widest">REGISTERING...</span>
                  )}
                </div>
              </div>

            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
