"use client";
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/Collapsible';

type TraceItem = { name: string; modified: string; size: number };

export default function ResearchTracesPage() {
  const [list, setList] = useState<TraceItem[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [trace, setTrace] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/research-assistant/traces');
        const data = await res.json();
        setList(Array.isArray(data) ? data : []);
      } catch (e) {
        setError('Falha ao carregar lista de traces');
      }
    })();
  }, []);

  const loadTrace = async (name: string) => {
    setSelected(name);
    setTrace(null);
    try {
      const res = await fetch(`/api/research-assistant/traces/${encodeURIComponent(name)}`);
      const data = await res.json();
      setTrace(data);
    } catch (e) {
      setError('Falha ao carregar trace');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Traces de Pesquisa</CardTitle>
        </CardHeader>
        <CardContent>
          {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1 border rounded p-3 space-y-2 bg-white">
              {list.length === 0 && <div className="text-sm text-gray-500">Nenhum trace encontrado</div>}
              {list.map(item => (
                <div key={item.name} className={`flex items-center justify-between text-sm ${selected === item.name ? 'font-semibold' : ''}`}>
                  <button className="text-left truncate" onClick={() => loadTrace(item.name)} title={item.name}>
                    {item.name}
                  </button>
                  <span className="text-xs text-gray-500">{new Date(item.modified).toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className="md:col-span-2 border rounded p-4 bg-white">
              {!trace && <div className="text-sm text-gray-500">Selecione um trace à esquerda.</div>}
              {trace && (
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-600">Query</div>
                    <div className="font-medium">{trace.query}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Modo / Perfil</div>
                    <div className="font-medium">{trace.mode || '-'} / {trace.preset || '-'}</div>
                  </div>
                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <Button variant="default" type="button">Plano</Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <ul className="list-disc ml-6 mt-2 text-sm">
                        {(trace.plan || []).map((s: any, idx: number) => (
                          <li key={idx}><span className="font-semibold">{s.source}</span>: {s.desc || s.query}</li>
                        ))}
                      </ul>
                    </CollapsibleContent>
                  </Collapsible>
                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <Button variant="default" type="button">Execuções por Fonte</Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <ul className="list-disc ml-6 mt-2 text-sm">
                        {(trace.executions || []).map((e: any, idx: number) => (
                          <li key={idx}><span className="font-semibold">{e.source}</span>: {e.found} itens</li>
                        ))}
                      </ul>
                    </CollapsibleContent>
                  </Collapsible>
                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <Button variant="default" type="button">Deduplicação & Qualidade</Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="mt-2 text-sm">
                        <div>Inicial: {trace.citesource?.initial ?? '-'}</div>
                        <div>Deduplicados: {trace.citesource?.deduplicated ?? '-'}</div>
                        <div>Removidos: {trace.citesource?.removed_duplicates ?? '-'}</div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <Button variant="default" type="button">Resumo (prévia)</Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="mt-2 text-sm whitespace-pre-wrap">{trace.summary_preview || '-'}</div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

