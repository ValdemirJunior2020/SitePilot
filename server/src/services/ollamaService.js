import axios from 'axios';

export async function analyzeWithOllama({ site, current, previous, changeResult }) {
  if (String(process.env.OLLAMA_ENABLED).toLowerCase() !== 'true') return null;
  const url = (process.env.OLLAMA_URL || 'http://localhost:11434').replace(/\/$/, '');
  const model = process.env.OLLAMA_MODEL || 'llama3.2';

  const compact = changeResult.changes.slice(0, 12).map((c) => ({ type: c.type, before: c.before, after: c.after, detail: c.detail }));
  const prompt = `You are a website competitive-intelligence analyst. Give a concise plain-text analysis under 180 words.\n\nWebsite: ${site.name} (${site.url})\nChange score: ${changeResult.changeScore}/100 (${changeResult.severity})\nDetected changes: ${JSON.stringify(compact)}\nPrevious title: ${previous?.title || 'none'}\nCurrent title: ${current.title || 'none'}\n\nAnswer: What changed? Why might it matter? Classify as Pricing, Product, Marketing, SEO, Technical, or Mixed. State importance as Low, Medium, High, or Critical.`;

  try {
    const { data } = await axios.post(`${url}/api/generate`, { model, prompt, stream: false }, { timeout: 12000 });
    return data?.response?.trim() || null;
  } catch (error) {
    console.warn('Ollama unavailable:', error.message);
    return null;
  }
}
