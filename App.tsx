
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { analyzeNetworkLog } from './services/geminiService';
import type { GraphData, LinkData, NodeData, AIConfig } from './types';
import FileUpload from './components/FileUpload';
import NetworkGraph from './components/NetworkGraph';
import AnalysisPanel from './components/AnalysisPanel';
import Loader from './components/Loader';
import SettingsModal from './components/SettingsModal';
import PrivacyNoticeModal from './components/PrivacyNoticeModal';
import { UploadIcon, PlusIcon, DownloadIcon, PencilIcon, GearIcon, PrivacyIcon } from './components/Icons';

const App: React.FC = () => {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isPrivacyNoticeOpen, setIsPrivacyNoticeOpen] = useState<boolean>(false);
  const [aiConfig, setAiConfig] = useState<AIConfig>(() => {
    try {
      const savedConfig = localStorage.getItem('aiConfig');
      if (savedConfig) {
        return JSON.parse(savedConfig);
      }
    } catch (e) {
      console.error("Failed to parse AI config from localStorage", e);
    }
    return { provider: 'local' };
  });

  const mergeFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
        localStorage.setItem('aiConfig', JSON.stringify(aiConfig));
    } catch (e) {
        console.error("Failed to save AI config to localStorage", e);
    }
  }, [aiConfig]);

  const canvasStyle = {
    backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 0)',
    backgroundSize: '25px 25px',
  };

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setError("File is too large. Please upload a file smaller than 10MB.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setGraphData(null);
    setFileName(file.name);
    setIsEditMode(false);

    try {
      if (file.name.endsWith('.json')) {
        const fileContent = await file.text();
        const data = JSON.parse(fileContent);

        if (!data || !Array.isArray(data.nodes) || !Array.isArray(data.links)) {
          throw new Error("Invalid network map JSON. File must contain 'nodes' and 'links' arrays.");
        }
        
        setGraphData(data as GraphData);

      } else {
        const fileContent = await file.text();
        const data = await analyzeNetworkLog(fileContent, null, aiConfig);
        
        if (!data || !data.nodes || !data.links) {
          throw new Error("AI analysis returned an invalid format.");
        }
        
        const nodeIds = new Set(data.nodes.map(n => n.id));
        const validLinks = data.links.filter(link => {
          if (!link || !link.source || !link.target) return false;
          const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
          const targetId = typeof link.target === 'string' ? link.target : link.target.id;
          return nodeIds.has(sourceId) && nodeIds.has(targetId);
        });
        
        setGraphData({ nodes: data.nodes, links: validLinks });
      }

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred during analysis.');
      setGraphData(null);
    } finally {
      setIsLoading(false);
    }
  }, [aiConfig]);

  const handleMergeFileSelected = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !graphData) return;

    event.target.value = ''; // Clear the input to allow re-selecting the same file

    if (file.size > 10 * 1024 * 1024) {
      setError("File is too large. Please upload a file smaller than 10MB.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setFileName(prev => `${prev}, ${file.name}`);
    setIsEditMode(false);

    try {
      const fileContent = await file.text();
      const mergedGraphData = await analyzeNetworkLog(fileContent, graphData, aiConfig);
      
      if (!mergedGraphData || !mergedGraphData.nodes || !mergedGraphData.links) {
        throw new Error("AI analysis returned an invalid format for the merge operation.");
      }

      const nodeIds = new Set(mergedGraphData.nodes.map(n => n.id));
      const validLinks = mergedGraphData.links.filter(link => {
        if (!link || !link.source || !link.target) return false;
        const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
        const targetId = typeof link.target === 'string' ? link.target : link.target.id;
        return nodeIds.has(sourceId) && nodeIds.has(targetId);
      });
      
      setGraphData({ nodes: mergedGraphData.nodes, links: validLinks });

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred during merge analysis.');
    } finally {
      setIsLoading(false);
    }
  }, [graphData, aiConfig]);

  const handleNodeUpdate = useCallback((updatedNode: NodeData) => {
    setGraphData(prevData => {
      if (!prevData) return null;
      const newNodes = prevData.nodes.map(node => node.id === updatedNode.id ? updatedNode : node);
      return { ...prevData, nodes: newNodes };
    });
  }, []);

  const handleLinksUpdate = useCallback((sourceNodeId: string, newTargetIds: Set<string>) => {
    setGraphData(prevData => {
      if (!prevData) return null;
      
      const otherLinks = prevData.links.filter(link => {
        const sourceId = typeof link.source === 'string' ? link.source : (link.source as NodeData).id;
        const targetId = typeof link.target === 'string' ? link.target : (link.target as NodeData).id;
        return sourceId !== sourceNodeId && targetId !== sourceNodeId;
      });
      
      const newLinks: LinkData[] = Array.from(newTargetIds).map(targetId => ({
        source: sourceNodeId,
        target: targetId,
      }));

      return { ...prevData, links: [...otherLinks, ...newLinks] };
    });
  }, []);

  const handleReset = () => {
    setGraphData(null);
    setError(null);
    setIsLoading(false);
    setFileName(null);
    setIsEditMode(false);
  };

  const handleDownload = () => {
    if (!graphData) return;

    const dataToSave = JSON.parse(JSON.stringify(graphData));

    // Clean d3-injected properties from nodes
    const cleanedNodes = dataToSave.nodes.map((node: NodeData) => {
      const { x, y, vx, vy, fx, fy, index, ...rest } = node as any;
      return rest;
    });
    
    // Ensure links are just string IDs
    const cleanedLinks = dataToSave.links.map((link: any) => ({
      source: typeof link.source === 'object' ? link.source.id : link.source,
      target: typeof link.target === 'object' ? link.target.id : link.target,
    }));

    const cleanedData = { nodes: cleanedNodes, links: cleanedLinks };
    
    const jsonString = JSON.stringify(cleanedData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'network-map.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-screen w-screen bg-gray-900 text-gray-200 flex flex-col relative overflow-hidden" style={canvasStyle}>
      <header className="w-full max-w-6xl mx-auto flex items-center justify-between p-4 sm:p-6 z-30">
        <div className="flex items-center gap-3">
          <span className="font-nerd text-4xl bg-gradient-to-br from-accent to-ont text-transparent bg-clip-text inline-block w-10 text-center">
            󰫢
          </span>
          <h1 className="text-2xl font-bold text-gray-200">AI Network Visualizer</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPrivacyNoticeOpen(true)}
            className="p-2 rounded-full hover:bg-gray-700 transition-colors duration-200"
            aria-label="Open privacy notice"
          >
            <PrivacyIcon className="w-6 h-6 text-gray-300" />
          </button>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-full hover:bg-gray-700 transition-colors duration-200"
            aria-label="Open settings"
          >
            <GearIcon className="w-6 h-6 text-gray-300" />
          </button>
        </div>
      </header>
      
      {isSettingsOpen && <SettingsModal config={aiConfig} onConfigChange={setAiConfig} onClose={() => setIsSettingsOpen(false)} />}
      {isPrivacyNoticeOpen && <PrivacyNoticeModal onClose={() => setIsPrivacyNoticeOpen(false)} />}

      <main className="flex-grow relative">
        {graphData && (
            <div className="absolute inset-0 z-0">
                <NetworkGraph 
                    data={graphData} 
                    hoveredNodeId={hoveredNodeId}
                    setHoveredNodeId={setHoveredNodeId}
                />
            </div>
        )}
        
        {graphData && <AnalysisPanel 
            nodes={graphData.nodes} 
            links={graphData.links} 
            hoveredNodeId={hoveredNodeId} 
            setHoveredNodeId={setHoveredNodeId}
            isEditMode={isEditMode}
            onNodeUpdate={handleNodeUpdate}
            onLinksUpdate={handleLinksUpdate}
          />}

        <div className="absolute inset-0 flex items-center justify-center p-4 z-10 pointer-events-none">
            <div className="pointer-events-auto">
              {!graphData && !isLoading && !error && <FileUpload onFileSelect={handleFileSelect} />}
              
              {isLoading && <Loader fileName={fileName} />}

              {error && (
              <div className="text-center p-8 bg-gray-800 rounded-lg shadow-lg">
                  <h2 className="text-2xl font-bold text-red-500 mb-4">Analysis Failed</h2>
                  <p className="text-gray-400 max-w-md">{error}</p>
              </div>
              )}
            </div>
        </div>
      </main>
      
      {(graphData || error || fileName) && (
        <footer className="absolute bottom-0 left-1/2 -translate-x-1/2 p-4 z-20">
            <div className="flex items-center gap-4 bg-gray-800/70 backdrop-blur-md p-2 rounded-lg shadow-lg border border-gray-700/50">
                <button
                    onClick={handleReset}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors duration-200"
                >
                    <UploadIcon className="w-5 h-5" />
                    New File
                </button>
                {graphData && !isLoading && (
                  <>
                    <button
                        onClick={() => mergeFileInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-md transition-colors duration-200"
                    >
                        <PlusIcon className="w-5 h-5" />
                        Scan
                    </button>
                    <button
                        onClick={handleDownload}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors duration-200"
                    >
                        <DownloadIcon className="w-5 h-5" />
                        Download
                    </button>
                    <button
                        onClick={() => setIsEditMode(prev => !prev)}
                        className={`flex items-center gap-2 px-4 py-2 text-white rounded-md transition-colors duration-200 ${isEditMode ? 'bg-accent hover:bg-accent/90' : 'bg-gray-700 hover:bg-gray-600'}`}
                    >
                        <PencilIcon className="w-5 h-5" />
                        Edit
                    </button>
                  </>
                )}
            </div>
        </footer>
      )}

        <input 
            type="file"
            ref={mergeFileInputRef}
            onChange={handleMergeFileSelected}
            className="hidden"
            accept=".txt,.log"
        />
    </div>
  );
};

export default App;
