import { GoogleGenAI, Type } from "@google/genai";
import type { GraphData, NodeData, AIConfig } from '../types';

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        nodes: {
            type: Type.ARRAY,
            description: "A list of all identified network devices or entities.",
            items: {
                type: Type.OBJECT,
                properties: {
                    id: {
                        type: Type.STRING,
                        description: "A unique identifier for the device. CRITICAL: Use the MAC address for the ID if available. Otherwise, use the IP address as a fallback."
                    },
                    name: {
                        type: Type.STRING,
                        description: "A human-readable name for the device (e.g., 'Gateway Router', 'WebServer01')."
                    },
                    role: {
                        type: Type.STRING,
                        description: "The inferred role of the device. Possible roles: 'Router', 'Access Point', 'Switch', 'Server', 'Client', 'Smartphone', 'Tablet', 'Laptop', 'PC', 'Printer', 'Webcam', 'NAS', 'Firewall', 'ONT', 'Scanner', 'Other'."
                    },
                    ipAddress: {
                        type: Type.STRING,
                        description: "The IP address of the device, if available."
                    },
                    macAddress: {
                        type: Type.STRING,
                        description: "The MAC address of the device, if available."
                    },
                    vendor: {
                        type: Type.STRING,
                        description: "The manufacturer or vendor of the device, inferred from the MAC address if possible (e.g., 'Apple', 'Cisco')."
                    },
                    openPorts: {
                        type: Type.ARRAY,
                        description: "A list of open TCP/UDP ports discovered on the device as strings, if available.",
                        items: {
                            type: Type.STRING
                        }
                    },
                    ping: {
                        type: Type.STRING,
                        description: "The ping latency to the device, if available (e.g., '23ms')."
                    }
                },
                required: ["id", "name", "role"]
            },
        },
        links: {
            type: Type.ARRAY,
            description: "A list of connections between the identified devices.",
            items: {
                type: Type.OBJECT,
                properties: {
                    source: {
                        type: Type.STRING,
                        description: "The 'id' of the source node for the connection."
                    },
                    target: {
                        type: Type.STRING,
                        description: "The 'id' of the target node for the connection."
                    }
                },
                required: ["source", "target"]
            },
        }
    },
    required: ["nodes", "links"]
};

function buildPrompt(fileContent: string, existingGraphData: GraphData | null): string {
    const contextPrompt = existingGraphData
        ? `
You are an expert network analyst acting as a stateful engine. You have been given an EXISTING network map and a NEW log file. Your critical task is to UPDATE the existing map with information from the new log file and return a single, complete, merged network map.

**Crucial Rules for Merging & Device Identification:**
1.  **Primary Identifier is MAC Address:** The \`macAddress\` is the most reliable unique identifier for a physical device. If a device in the NEW log has the same \`macAddress\` as a device in the EXISTING MAP, you **MUST** treat them as the same device.
2.  **Use MAC for Node 'id':** When creating a node, if a MAC address is available, you **MUST** use the MAC address as the node's 'id'. If no MAC address is present for a device, you may use its IP address as a fallback 'id'.
3.  **Handle IP Addresses Carefully:** IP addresses can be duplicated. Do **NOT** assume two devices are the same solely based on their IP address if they have different MAC addresses or hostnames.
4.  **Merge, Don't Replace:** When you find a matching device (identified primarily by MAC address), update the existing node with any new information from the new log file (like a newly discovered IP address, open ports, vendor, or connections). Do **NOT** create a duplicate node.
5.  **Infer Connections Logically:** When connecting new devices, create only the most probable links. New client devices should likely connect to a central device from the new scan (like a router). **DO NOT** create a mesh network by connecting a new device to every existing device. Ensure every new device has at least one logical connection so it is not left floating.
6.  **Return a Single, Complete Map:** Your final output **MUST** be a single JSON object representing the **ENTIRE COMBINED NETWORK**. This includes all original nodes and links, plus any new, correctly deduplicated nodes and links from the new data.

--- EXISTING MAP ---
${JSON.stringify(existingGraphData, (key, value) => {
    // d3 adds circular references and extra properties; we clean them for the AI.
    if (['source', 'target'].includes(key) && typeof value === 'object' && value !== null) {
        return (value as NodeData).id; // Send only the ID for links
    }
    if (['x', 'y', 'vx', 'vy', 'fx', 'fy', 'index'].includes(key)) {
        return undefined; // Remove d3 simulation properties
    }
    return value;
}, 2)}
--- END EXISTING MAP ---

Now, analyze the following new log data based on these strict rules and provide the complete, merged JSON output.
`
        : `
You are an expert network analyst. Analyze the following network log file or text data. Your task is to identify all network devices, infer their connections, and determine their potential roles.
Based on your analysis, generate a network map.
`;

    return `
${contextPrompt}

Your output **MUST** be a valid JSON object that strictly adheres to the provided schema. The JSON object should contain two keys: 'nodes' and 'links'. Do not add any extra text, explanations, or markdown formatting around the JSON object.

The schema for the JSON object is as follows:
${JSON.stringify(responseSchema, null, 2)}

Data to analyze:
---
${fileContent.substring(0, 100000)}
---

Instructions for analysis:
1.  **Identify Nodes:** Scan the text for devices.
2.  **Assign IDs:** For each node's 'id', you **MUST** use its MAC address if available. If and only if the MAC address is not available, use its IP address as the 'id'. This rule is critical for correctly identifying unique devices.
3.  **Extract Details:** For each node, extract the following if available:
    - 'name': A descriptive hostname.
    - 'role': The device's function. Choose from: 'Router', 'Access Point', 'Switch', 'Server', 'Client', 'Smartphone', 'Tablet', 'Laptop', 'PC', 'Printer', 'Webcam', 'NAS', 'Firewall', 'ONT', 'Scanner', 'Other'. Be as specific as possible, especially for client types. If a client type cannot be determined, use 'Client'.
    - 'ipAddress': The device's IP address.
    - 'macAddress': The device's MAC address.
    - 'vendor': The manufacturer of the device, inferred from its MAC address.
    - 'openPorts': A list of open ports as strings.
    - 'ping': Ping latency if recorded (e.g., "15ms").
4.  **Identify Links with High Confidence:** Scan the logs for explicit evidence of connections (e.g., ARP tables, DHCP server logs, "connected to" statements).
5.  **Infer Logical Connections:** Create connections to form a realistic network topology. Typically, client devices (like phones, laptops, cameras) connect to a central device like a Router, Switch, or Access Point. **Crucially, DO NOT create a full mesh by connecting every device to every other device.** The goal is a plausible, hierarchical star or tree topology.
6.  **CRITICAL FALLBACK FOR CONNECTIVITY:** If the provided data is sparse and you cannot find explicit connection evidence for a device, you **MUST** connect it to the most logical central device in the network (e.g., the primary Router, Access Point, or ONT). This is a critical final step to ensure there are no floating, isolated nodes. **Every device must be connected to the graph.**
7.  **Format Output:** Return a single JSON object containing a 'nodes' array and a 'links' array.
`;
}

export async function analyzeNetworkLog(
    fileContent: string,
    existingGraphData: GraphData | null = null,
    config: AIConfig
): Promise<GraphData> {
    
    const prompt = buildPrompt(fileContent, existingGraphData);

    if (config.provider === 'local') {
        const url = config.url || 'http://localhost:1234/v1/chat/completions';
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: "local-model", // This is often a placeholder for LM Studio
                    messages: [
                        { "role": "system", "content": "You are an expert network analysis AI. Your output must be a single, valid JSON object matching the user's requested schema. Do not add any conversational text or markdown formatting." },
                        { "role": "user", "content": prompt }
                    ],
                    temperature: 0.1
                })
            });

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`Local LLM server returned an error: ${response.status} ${response.statusText}. \nDetails: ${errorBody}`);
            }

            const data = await response.json();
            let jsonText = data.choices[0].message.content;

            // Clean up potential markdown code blocks
            if (jsonText.startsWith("```json")) {
                jsonText = jsonText.substring(7, jsonText.length - 3).trim();
            } else if (jsonText.startsWith("```")) {
                 jsonText = jsonText.substring(3, jsonText.length - 3).trim();
            }

            return JSON.parse(jsonText) as GraphData;

        } catch (error) {
            console.error("Error calling Local LLM API:", error);
            if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
                 throw new Error("Connection to the local LLM server failed. Please ensure the server is running and CORS is configured correctly.");
            }
            throw error;
        }

    } else if (config.provider === 'openai') {
        const apiKey = config.apiKey;
        if (!apiKey) {
            throw new Error("OpenAI API key not provided. Please enter your key in the settings menu.");
        }
        const model = config.model || 'gpt-4o';
        const url = 'https://api.openai.com/v1/chat/completions';

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        { "role": "system", "content": "You are an expert network analysis AI. Your output must be a single, valid JSON object matching the user's requested schema. Do not add any conversational text or markdown formatting." },
                        { "role": "user", "content": prompt }
                    ],
                    temperature: 0.1,
                    response_format: { "type": "json_object" }
                })
            });

            if (!response.ok) {
                const errorBody = await response.json();
                const errorMessage = errorBody?.error?.message || JSON.stringify(errorBody);
                throw new Error(`OpenAI API returned an error: ${response.status} ${response.statusText}. \nDetails: ${errorMessage}`);
            }

            const data = await response.json();
            const jsonText = data.choices[0].message.content;
            
            return JSON.parse(jsonText) as GraphData;

        } catch (error) {
            console.error("Error calling OpenAI API:", error);
            if (error instanceof Error && (error.message.includes('API key') || error.message.includes('authentication'))) {
                throw new Error("The provided OpenAI API key appears to be invalid or has expired.");
            }
            throw error;
        }
    } else { // 'google' provider
        const apiKey = config.apiKey;
        if (!apiKey) {
            throw new Error("Google AI API key not provided. Please enter your key in the settings menu.");
        }
        const ai = new GoogleGenAI({ apiKey });

        try {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: responseSchema,
                    temperature: 0.1
                },
            });

            const jsonText = response.text.trim();
            const data = JSON.parse(jsonText);
            return data as GraphData;

        } catch (error) {
            console.error("Error calling Gemini API:", error);
            throw new Error("Failed to get a valid response from the AI. This could be due to an invalid API key, network issues, or the model returning an unexpected format.");
        }
    }
}