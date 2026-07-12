import axios from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_URL = BASE_URL.endsWith("/api") ? BASE_URL : `${BASE_URL}/api`;

export const tasksApi = {
  list: async () => (await axios.get(`${API_URL}/tasks/`)).data,
  create: async (data: { title: string; description: string; reward_ada: number }) => (await axios.post(`${API_URL}/tasks/`, data)).data,
  get: async (id: string) => (await axios.get(`${API_URL}/tasks/${id}`)).data,
  bids: async (id: string) => (await axios.get(`${API_URL}/tasks/${id}/bids`)).data,
  execute: async (id: string) => (await axios.post(`${API_URL}/tasks/${id}/execute`)).data,
  complete: async (id: string) => (await axios.post(`${API_URL}/tasks/${id}/complete`)).data,
  refund: async (id: string) => (await axios.post(`${API_URL}/tasks/${id}/refund`)).data,
  lockStatus: async (id: string) => (await axios.get(`${API_URL}/tasks/${id}/lock_status`)).data,
  balance: async () => (await axios.get(`${API_URL}/balance`)).data,
  proveZk: async (agent_id: string) => (await axios.post(`${API_URL}/midnight/prove`, { agent_id })).data,
};
