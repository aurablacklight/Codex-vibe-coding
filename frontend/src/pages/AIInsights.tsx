import React, { useEffect, useState } from 'react';
import api from '../api/client';

type AnalysisType = 'analyze' | 'forecast' | 'budget-advice' | 'ask';

interface AnalysisResult {
  analysis: string;
  model: string;
  data_summary: Record<string, any>;
}

interface AIStatus {
  enabled: boolean;
  status: string;
  base_url?: string;
  model?: string;
  available_models?: string[];
  error?: string;
}

function MarkdownRenderer({ content }: { content: string }) {
  // Simple markdown-to-html: headers, bold, bullets, code blocks
  const lines = content.split('\n');
  const html: string[] = [];
  let inCodeBlock = false;

  for (const line of lines) {
    if (line.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      html.push(inCodeBlock ? '<pre class="bg-gray-100 dark:bg-slate-700 p-3 rounded-lg overflow-x-auto text-sm my-2">' : '</pre>');
      continue;
    }
    if (inCodeBlock) {
      html.push(escapeHtml(line) + '\n');
      continue;
    }
    let processed = escapeHtml(line);
    // Headers
    if (processed.startsWith('### ')) {
      html.push(`<h4 class="text-base font-semibold mt-4 mb-1">${processed.slice(4)}</h4>`);
    } else if (processed.startsWith('## ')) {
      html.push(`<h3 class="text-lg font-semibold mt-5 mb-2">${processed.slice(3)}</h3>`);
    } else if (processed.startsWith('# ')) {
      html.push(`<h2 class="text-xl font-bold mt-6 mb-2">${processed.slice(2)}</h2>`);
    } else if (processed.match(/^[-*] /)) {
      processed = processed.replace(/^[-*] /, '');
      processed = applyInline(processed);
      html.push(`<li class="ml-4 list-disc text-sm leading-relaxed">${processed}</li>`);
    } else if (processed.match(/^\d+\. /)) {
      processed = processed.replace(/^\d+\. /, '');
      processed = applyInline(processed);
      html.push(`<li class="ml-4 list-decimal text-sm leading-relaxed">${processed}</li>`);
    } else if (processed.trim() === '') {
      html.push('<div class="h-2"></div>');
    } else {
      html.push(`<p class="text-sm leading-relaxed">${applyInline(processed)}</p>`);
    }
  }

  return <div dangerouslySetInnerHTML={{ __html: html.join('\n') }} />;
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function applyInline(s: string) {
  // Bold **text**
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>');
  // Inline code `text`
  s = s.replace(/`(.+?)`/g, '<code class="bg-gray-100 dark:bg-slate-700 px-1 rounded text-xs">$1</code>');
  // Italic *text*
  s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');
  return s;
}

const ANALYSIS_TABS: { key: AnalysisType; label: string; description: string; icon: string }[] = [
  { key: 'analyze', label: 'Full Analysis', description: 'Comprehensive spending patterns, anomalies, and recommendations', icon: '🔍' },
  { key: 'forecast', label: 'Forecast', description: 'Predict future spending and net worth trajectory', icon: '🔮' },
  { key: 'budget-advice', label: 'Budget Advice', description: 'AI-optimized budget with savings goals', icon: '💡' },
  { key: 'ask', label: 'Ask Anything', description: 'Ask a custom question about your finances', icon: '💬' },
];

export default function AIInsights() {
  const [status, setStatus] = useState<AIStatus | null>(null);
  const [activeTab, setActiveTab] = useState<AnalysisType>('analyze');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [months, setMonths] = useState(3);
  const [forecastMonths, setForecastMonths] = useState(3);
  const [question, setQuestion] = useState('');
  const [statusLoading, setStatusLoading] = useState(true);

  useEffect(() => {
    api.get('/ai/status')
      .then((res) => setStatus(res.data))
      .catch(() => setStatus({ enabled: false, status: 'error' }))
      .finally(() => setStatusLoading(false));
  }, []);

  const runAnalysis = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      let res;
      if (activeTab === 'analyze') {
        res = await api.post(`/ai/analyze?months=${months}`);
      } else if (activeTab === 'forecast') {
        res = await api.post(`/ai/forecast?months=${months}&forecast_months=${forecastMonths}`);
      } else if (activeTab === 'budget-advice') {
        res = await api.post(`/ai/budget-advice?months=${months}`);
      } else {
        res = await api.post('/ai/ask', { question, months });
      }
      setResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Analysis failed. Is Ollama running?');
    } finally {
      setLoading(false);
    }
  };

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Status Banner */}
      {status && status.status !== 'connected' && (
        <div className={`card p-4 border-l-4 ${status.status === 'disabled' ? 'border-gray-400' : 'border-yellow-500'}`}>
          <div className="flex items-start gap-3">
            <span className="text-2xl">{status.status === 'disabled' ? '⏸️' : '⚠️'}</span>
            <div>
              <h3 className="font-semibold">
                {status.status === 'disabled' ? 'AI Analysis Disabled' : 'Ollama Not Reachable'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {status.status === 'disabled'
                  ? 'Set AI_ENABLED=true in your environment to enable AI insights.'
                  : (
                    <>
                      Cannot connect to <code className="bg-gray-100 dark:bg-slate-700 px-1 rounded text-xs">{status.base_url}</code>.
                      Make sure Ollama is running:
                      <code className="block bg-gray-100 dark:bg-slate-700 p-2 rounded mt-2 text-xs">
                        ollama serve<br />
                        ollama pull {status.model}
                      </code>
                    </>
                  )}
              </p>
            </div>
          </div>
        </div>
      )}

      {status?.status === 'connected' && (
        <div className="card p-3 border-l-4 border-green-500">
          <div className="flex items-center gap-2 text-sm">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="font-medium">Ollama Connected</span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-500 dark:text-gray-400">Model: <strong>{status.model}</strong></span>
            {status.available_models && status.available_models.length > 0 && (
              <>
                <span className="text-gray-400">|</span>
                <span className="text-gray-500 dark:text-gray-400">{status.available_models.length} model{status.available_models.length !== 1 ? 's' : ''} available</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {ANALYSIS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setResult(null); setError(''); }}
            className={`card p-4 text-left transition-all hover:shadow-md ${
              activeTab === tab.key
                ? 'ring-2 ring-brand-500 border-brand-500'
                : ''
            }`}
          >
            <span className="text-2xl">{tab.icon}</span>
            <h3 className="font-semibold mt-2">{tab.label}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{tab.description}</p>
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="card p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Data Range</label>
            <select value={months} onChange={(e) => setMonths(parseInt(e.target.value))} className="input-field w-40">
              <option value={1}>Last 1 month</option>
              <option value={3}>Last 3 months</option>
              <option value={6}>Last 6 months</option>
              <option value={12}>Last 12 months</option>
            </select>
          </div>

          {activeTab === 'forecast' && (
            <div>
              <label className="block text-sm font-medium mb-1">Forecast Period</label>
              <select value={forecastMonths} onChange={(e) => setForecastMonths(parseInt(e.target.value))} className="input-field w-40">
                <option value={1}>Next 1 month</option>
                <option value={3}>Next 3 months</option>
                <option value={6}>Next 6 months</option>
              </select>
            </div>
          )}

          {activeTab === 'ask' && (
            <div className="flex-1 min-w-[300px]">
              <label className="block text-sm font-medium mb-1">Your Question</label>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && question.trim() && runAnalysis()}
                placeholder="e.g., Am I spending too much on restaurants? How can I save $500/month?"
                className="input-field"
              />
            </div>
          )}

          <button
            onClick={runAnalysis}
            disabled={loading || status?.status === 'disabled' || (activeTab === 'ask' && !question.trim())}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Analyzing...
              </>
            ) : (
              <>
                {activeTab === 'analyze' ? '🔍 Analyze' :
                 activeTab === 'forecast' ? '🔮 Forecast' :
                 activeTab === 'budget-advice' ? '💡 Get Advice' : '💬 Ask'}
              </>
            )}
          </button>
        </div>

        {/* Suggested questions */}
        {activeTab === 'ask' && !result && !loading && (
          <div className="mt-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Suggested questions:</p>
            <div className="flex flex-wrap gap-2">
              {[
                'What are my worst spending habits?',
                'How much could I save if I cut dining out in half?',
                'Am I on track for my budget goals?',
                'What subscriptions am I paying for?',
                'Where should I cut spending first?',
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => { setQuestion(q); }}
                  className="text-xs px-3 py-1.5 rounded-full bg-gray-100 dark:bg-slate-700 hover:bg-brand-50 dark:hover:bg-brand-900/30 text-gray-600 dark:text-gray-300 hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="card p-4 border-l-4 border-red-500">
          <div className="flex items-start gap-3">
            <span className="text-xl">❌</span>
            <div>
              <h3 className="font-semibold text-red-600 dark:text-red-400">Analysis Failed</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="card p-8">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-200 dark:border-brand-800 border-t-brand-600"></div>
            </div>
            <div className="text-center">
              <p className="font-medium">AI is analyzing your finances...</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                This may take 15-60 seconds depending on your model
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Result */}
      {result && !loading && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              {activeTab === 'analyze' ? '🔍 Financial Analysis' :
               activeTab === 'forecast' ? '🔮 Spending Forecast' :
               activeTab === 'budget-advice' ? '💡 Budget Recommendations' : '💬 Answer'}
            </h3>
            <span className="text-xs text-gray-400 bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded">
              via {result.model}
            </span>
          </div>
          <div className="prose dark:prose-invert max-w-none">
            <MarkdownRenderer content={result.analysis} />
          </div>

          {/* Data Context (collapsible) */}
          <details className="mt-6 border-t border-gray-200 dark:border-slate-700 pt-4">
            <summary className="text-sm text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200">
              View raw data sent to AI
            </summary>
            <pre className="mt-2 bg-gray-50 dark:bg-slate-900 p-4 rounded-lg text-xs overflow-x-auto max-h-64 overflow-y-auto">
              {JSON.stringify(result.data_summary, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
