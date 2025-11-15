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

- Dependencies: NodeJS, a locally installed AI model (Like Gemma 3 4B or Qwen VI 4B), LM Studio.
- LM Studio Setup:
	1. Install and launch LM Studio.
	2. Activate the server.
	3. Enable CORS (Cross-Origin Resource Sharing).
	4. Copy the local server address (usually http://127.0.0.1:1234) and paste it into the application's settings icon.

## Getting Started:

Installation:
- Clone the repository: git clone [https://github.com/AugustGray/AI-Network-Visualizer.git]
- Navigate to the project directory: cd AI-Network-Visualizer.
- Run `npm install`.
- Start the development server with `npm run dev`.
- Open your web browser and visit (Your App URL Here - usually http://127.0.0.1:3000).

- Or visit the web page at [https://ai-network-visualizer.netlify.app/]

## Privacy Notice

We are committed to protecting your privacy and providing you with control over your data. This application is designed with a strong focus on user security and consent. Here's a breakdown of how we handle your information:

### Data Handling & Permissions:

* **API Keys:** Your API key (used for AI analysis) is only visible within your browser – this is a standard, secure approach. You are solely responsible for managing your key and any associated costs.

* **LocalStorage (AI Settings):** The app stores your preferred AI provider and API key in your browser’s local storage. This data remains on your computer and isn't automatically transmitted to us. **However, please be aware that any malicious browser extension or script running on the same origin can potentially read this data in plain text.**

* **File Upload:** When you upload a file, you grant the app explicit permission to access only that single selected file. The application cannot access any other files on your system.

* **AI Analysis – Data Transmission:** When you use the AI analysis feature, the content of your uploaded file is sent to your chosen AI service (either locally via LM Studio or externally through Google/OpenAI). For local LLM usage, this data remains within your network. When using external APIs, it’s transmitted for processing. **We strongly recommend utilizing Local LLMs through LM Studio whenever possible. While we don't collect any data directly, even in a web app, the user’s API key is stored in the browser’s localStorage – making it vulnerable to potential security risks like plain text access by malicious extensions or network sniffing.**

### Transparency & Control:

We strive to minimize data collection and provide you with control over how your information is used. However, please understand that the core functionality of our AI analysis relies on sending user-provided data to an external service.
