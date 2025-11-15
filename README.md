# Network Visualization - AI Powered Network Mapping tool
Visualize and Analyze Your Network with Intelligent Graph Mapping

This application leverages the power of AI to automatically analyze network logs or scan results, creating interactive visualizations that reveal device relationships and potential vulnerabilities.  It's designed for IT professionals, security analysts, and anyone needing a clear understanding of their network infrastructure.

## Key Features:

* **AI-Powered Network Mapping:** Automatically identifies devices within your network scans (logs or TXT files) and infers connections between them.

* **Graph Map Visualization:** Displays the discovered network topology as an intuitive, interactive graph map – similar to Obsidian's graph view.

* **Device Card Details:** Each device is represented by a card containing key information:
	* IP Address
	* MAC Address (ID)
	* Open Ports
	* PING Status
	* Hostname
	* Role (Automatically inferred, editable)

* **Editable Device Information:** A dedicated "Identified Devices Panel" allows you to manually adjust device roles, vendor information, and connections for greater accuracy.

* **Multi-Scan Support:** Upload multiple scan results; the AI will intelligently match devices with identical MAC addresses across scans, ensuring a comprehensive view of your network.

* **JSON Export:** Save your analysis as a JSON file for later review, modification, or integration into other tools.

* **Flexible LLM Integration:** By default, utilizes a Local LLM through LM Studio. You can also integrate with external APIs:
	* Gemini API (tested)
	* OpenAI API (not yet tested – experimental support)

## Technical Details:

- Dependencies: NodeJS, a locally installed AI model (Gemma 3 4B or Qwen VI 4B), LM Studio.
- Installation: `npm install`
- Running Locally: `npm run dev`
- LM Studio Setup:
	1. Install and launch LM Studio.
	2. Activate the server.
	3. Enable CORS (Cross-Origin Resource Sharing).
	4. Copy the local server address (usually http://127.0.0.1:1234) and paste it into the application's settings icon.

## Getting Started:

Installation:
- Clone the repository: git clone [https://github.com/AugustGray/AI-Network-Visualizer.git]
- Navigate to the project directory: cd AI-Network-Visualizer
- Navigate to the project directory in your terminal.
- Run `npm install`.
- Start the development server with `npm run dev`.
- Open your web browser and visit (Your App URL Here - usually http://127.0.0.1:3000).

- Or visit the web page at 
