import os
from tavily import TavilyClient

_client = None

def get_client():
    global _client
    if _client is None:
        _client = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))
    return _client

def web_search(query: str, max_results: int = 5) -> dict:
    client = get_client()
    response = client.search(query=query, max_results=max_results, include_answer=True)
    results = []
    for r in response.get("results", []):
        results.append({
            "title": r.get("title"),
            "url": r.get("url"),
            "snippet": r.get("content", "")[:300],
        })
    return {
        "answer": response.get("answer", ""),
        "results": results,
        "query": query,
    }
