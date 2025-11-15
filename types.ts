import type { SimulationNodeDatum, SimulationLinkDatum } from 'd3';

// FIX: Changed NodeData from an interface to a type to fix type resolution issues with d3.SimulationNodeDatum.
// This ensures that properties like `x`, `y`, `fx`, and `fy` are available on NodeData objects.
export type NodeData = SimulationNodeDatum & {
  id: string; // e.g. MAC Address
  name: string; // e.g. hostname
  role: string;
  ipAddress?: string;
  macAddress?: string;
  openPorts?: string[];
  ping?: string;
  vendor?: string;
};

export interface LinkData extends SimulationLinkDatum<NodeData> {
  source: string | NodeData;
  target: string | NodeData;
}

export interface GraphData {
  nodes: NodeData[];
  links: LinkData[];
}

export type AIConfig = {
  provider: 'google' | 'openai' | 'local';
  url?: string; // For local provider
  apiKey?: string; // For google and openai providers
  model?: string; // For openai provider
};