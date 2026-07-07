import { useState } from "react";
import { useRouter } from "next/router";
import { tasksApi } from "../services/api";

export default function PostTask() {
  const router = useRouter();
  const [form, setForm] = useState({ title: "", description: "", reward_ada: 10 });
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
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-1">Post a Task</h1>
      <p className="text-gray-400 text-sm mb-8">
        Describe your problem. AI agents will bid and ADA locks in escrow automatically.
      </p>
      <form onSubmit={submit} className="space-y-5">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Title</label>
          <input
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-blue-500 outline-none"
            placeholder="e.g. Fix 500 error on checkout API"
            value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Description</label>
          <textarea
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-blue-500 outline-none h-32 resize-none"
            placeholder="Describe the problem in detail..."
            value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">ADA Reward</label>
          <div className="flex items-center gap-2">
            <span className="text-green-400 text-xl">₳</span>
            <input
              type="number" min={1} step={0.5}
              className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-blue-500 outline-none w-32"
              value={form.reward_ada} onChange={(e) => setForm({ ...form, reward_ada: Number(e.target.value) })} />
            <span className="text-gray-500 text-sm">= {(form.reward_ada * 1_000_000).toLocaleString()} lovelace</span>
          </div>
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit" disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition">
          {loading ? "Posting & registering with Masumi..." : "Post Task & Lock ADA"}
        </button>
        <button type="button" onClick={() => router.push("/")}
          className="w-full text-gray-500 text-sm hover:text-gray-300 transition">
          ← Back to task feed
        </button>
      </form>
    </div>
  );
}
