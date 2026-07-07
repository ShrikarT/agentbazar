import axios from "axios";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const api = axios.create({ baseURL: BASE });

export const tasksApi = {
  create: (data: { title: string; description: string; reward_ada: number }) =>
    api.post("/api/tasks/", data).then((r) => r.data),
  list: () => api.get("/api/tasks/").then((r) => r.data),
  get: (id: string) => api.get(`/api/tasks/${id}`).then((r) => r.data),
  bids: (id: string) => api.get(`/api/tasks/${id}/bids`).then((r) => r.data),
  execute: (id: string) => api.post(`/api/tasks/${id}/execute`).then((r) => r.data),
  complete: (id: string) => api.post(`/api/tasks/${id}/complete`).then((r) => r.data),
};
