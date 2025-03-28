import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import './App.css';
import ipcData from './IPCLawBot.json';

function PoliceChatbot() {
  const [text, setText] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [apiKey] = useState('AIzaSyBiIqpSdEMxaBgEmaLwNUkJ1yaU3q77KRM');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [ipcSections, setIpcSections] = useState([]);

  const messagesEndRef = useRef(null);

  // Initialize Google Generative AI
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  // Load IPC data
  useEffect(() => {
    try {
      setIpcSections(ipcData);
    } catch (error) {
      console.error('Error loading IPC data:', error);
    }
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Emergency call function
  const handleEmergencyCall = () => {
    window.open('tel:100');
  };

  // Reset chat function
  const resetChat = () => {
    setMessages([]);
    setConversationHistory([]);
  };

  // Police-specific system prompt
  const policeSystemPrompt = `
    You are POLICE AI ASSISTANT, an official chatbot for law enforcement agencies. Follow these guidelines strictly:
    
    1. Provide concise, professional responses (2-5 sentences maximum)
    2. Only give factual information about police procedures
    3. Never use asterisks (*) or markdown formatting
    4. For emergencies, instruct to call 100 immediately
    5. Direct complex queries to local police stations
    6. Use simple, clear language
    7. Maintain context from previous messages in the conversation
    
    Your responses should be helpful but authoritative. Do not:
    - Give legal advice
    - Speculate
    - Use informal language
    - Provide personal opinions
    
    Example good response: 
    "To file a police complaint, visit your nearest police station with valid ID proof and details of the incident. The officer on duty will assist you with the formal process."
  `;

  // Format conversation history for the prompt
  const formatHistory = (history) => {
    return history.map(entry => 
      `${entry.role === 'user' ? 'User query' : 'Your response'}: ${entry.content}`
    ).join('\n');
  };

  // Predefined responses for common questions
  const getPredefinedResponse = (prompt) => {
    const complaintKeywords = [
      'register complaint',
      'file complaint',
      'lodge complaint',
      'how to complain',
      'report crime',
      'file fir',
      'register fir',
      'how to register a complaint',
      'complaint process',
      'police complaint procedure',
      'What is the process for filing a police complaint?',
      'File a Complaint',
      'How to check my complaint status?'
    ];

    const isComplaintQuery = complaintKeywords.some(keyword => 
      prompt.toLowerCase().includes(keyword)
    );

    if (isComplaintQuery) {
      return `
        Police Complaint Registration Process (India):

        1. Visit the Police Station:
        - Go to the police station nearest to where the incident occurred
        - Station timings are typically 24/7 for emergencies

        2. Required Documents:
        - Government-issued photo ID (Aadhaar, Voter ID, Passport, etc.)
        - Any evidence related to your complaint (photos, documents, etc.)
        - Contact details of witnesses (if available)

        3. FIR Registration:
        - Provide complete details to the duty officer
        - The officer will record your complaint in the FIR register
        - You have the right to get a free copy of the FIR

        4. Online Alternative:
        - Many states offer online complaint registration
        - Visit your state police website (eg: https://citizen.mahapolice.gov.in for Maharashtra)

        5. Important Notes:
        - FIR must be registered immediately for cognizable offenses
        - You can approach senior officers if your complaint isn't registered
        - For women-related complaints, approach the Women's Cell

        Emergency Contact: Always call 100 for immediate police response
        Non-Emergency Helpline: You can also dial 112 for assistance
      `.replace(/\n\s+/g, '\n').trim();
    }
    return null;
  };

  // Fetch response from AI
  const fetchPoliceResponse = async (prompt) => {
    try {
      // Check for predefined responses first
      const predefinedResponse = getPredefinedResponse(prompt);
      if (predefinedResponse) {
        const updatedHistory = [...conversationHistory, 
          { role: 'user', content: prompt },
          { role: 'assistant', content: predefinedResponse }
        ];
        setConversationHistory(updatedHistory);
        return predefinedResponse;
      }

      // Check if the query is about an IPC section
      const ipcMatch = prompt.match(/IPC (section )?(\d+)/i) || prompt.match(/(section )?(\d+) (of )?IPC/i);
      
      if (ipcMatch) {
        const sectionNumber = ipcMatch[2];
        const sectionData = ipcSections.find(section => section["IP Section"] === sectionNumber);
        
        if (sectionData) {
          let responseText = `IPC Section ${sectionNumber} Details:\n`;
          responseText += `Offense: ${sectionData.Offense}\n`;
          responseText += `Punishment: ${sectionData.Punishment}\n`;
          responseText += `Cognizable: ${sectionData.Cognizable}\n`;
          responseText += `Bailable: ${sectionData.Bailable}\n`;
          responseText += `Court: ${sectionData.Court}\n`;
          responseText += `Punishment Category: ${sectionData["Punishment Category"] || 'Not specified'}`;
          
          // Update conversation history
          const updatedHistory = [...conversationHistory, 
            { role: 'user', content: prompt },
            { role: 'assistant', content: responseText }
          ];
          setConversationHistory(updatedHistory);
          
          return responseText;
        } else {
          return `Information for IPC Section ${sectionNumber} is not available in our database. Please consult a legal expert or visit the nearest police station for details.`;
        }
      }

      // Original code for non-IPC queries
      const updatedHistory = [...conversationHistory, { role: 'user', content: prompt }];
      
      const fullPrompt = `
        ${policeSystemPrompt}
        
        Previous conversation context:
        ${formatHistory(updatedHistory)}
        
        Current user query: ${prompt}
        
        Provide only the direct response to the user without any additional commentary or formatting:
      `;
      
      const result = await model.generateContent(fullPrompt);
      const response = await result.response;
      const responseText = response.text();
      
      setConversationHistory([
        ...updatedHistory,
        { role: 'assistant', content: responseText }
      ]);
      
      return responseText;
    } catch (error) {
      console.error('API error:', error);
      return 'Unable to process your request. Please contact your local police station for assistance.';
    }
  };

  // Text-to-speech functions
  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const speakText = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-IN';
    utterance.pitch = 1;
    utterance.rate = 0.9;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  // Handle message submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    const inputText = text.trim();
    if (!inputText) return;

    const userMessage = { id: Date.now(), text: inputText, sender: 'user' };
    setMessages((prev) => [...prev, userMessage]);
    setText('');
    setLoading(true);

    const response = await fetchPoliceResponse(inputText);
    const cleanResponse = response.replace(/\*/g, '').trim();
    
    const assistantMessage = {
      id: Date.now() + 1,
      text: cleanResponse,
      sender: 'assistant'
    };

    setMessages((prev) => [...prev, assistantMessage]);
    speakText(cleanResponse);
    setLoading(false);
  };

  // Quick action buttons
  const quickActions = [
    { text: 'Report a Crime', prompt: 'How do I report a crime?' },
    { text: 'File a Complaint', prompt: 'What is the process for filing a police complaint?' },
    { text: 'Emergency Help', prompt: 'I need emergency assistance' },
    { text: 'Safety Tips', prompt: 'Provide personal safety tips' },
    { text: 'Check Complaint Status', prompt: 'How to check my complaint status?' },
    { text: 'Cyber Crime', prompt: 'How to report cyber crime?' },
    { text: 'IPC Section 140', prompt: 'Tell me about IPC Section 140' },
    { text: 'IPC Section 302', prompt: 'What is IPC Section 302?' }
  ];

  const handleQuickAction = (prompt) => {
    setText(prompt);
    setTimeout(() => {
      document.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }, 50);
  };

  return (
    <div className="chatbot-container police-theme">
      <header className="chatbot-header">
        <i className="fas fa-shield-alt header-icon"></i>
        <h1>Police AI Assistant</h1>
        <div className="header-controls">
          <div className="emergency-badge" onClick={handleEmergencyCall} style={{ cursor: 'pointer' }}>
            <i className="fas fa-phone-alt"></i> Emergency: Call 100
          </div>
          {messages.length > 0 && (
            <button className="reset-btn" onClick={resetChat} title="Reset chat">
              <i className="fas fa-redo"></i>
            </button>
          )}
        </div>
      </header>

      <div className="chatbot-body">
        {messages.length === 0 ? (
          <div className="welcome-screen">
            <div className="welcome-icon-container">
              <i className="fas fa-shield-alt welcome-icon"></i>
            </div>
            <h2>Police Department Assistance</h2>
            <p>How can we help you today?</p>
            <div className="quick-actions">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  className="quick-action-btn"
                  onClick={() => handleQuickAction(action.prompt)}
                >
                  {action.text}
                </button>
              ))}
            </div>
            <div className="emergency-notice">
              <i className="fas fa-exclamation-circle"></i>
              <span>For emergencies requiring immediate police response, call 100 without delay.</span>
            </div>
          </div>
        ) : (
          <div className="messages">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`message ${message.sender === 'user' ? 'user-message' : 'assistant-message'}`}
              >
                {message.sender === 'assistant' && (
                  <i className="fas fa-shield-alt message-icon"></i>
                )}
                <div className="message-content">
                  {message.text.split('\n').map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
                {message.sender === 'user' && (
                  <i className="fas fa-user message-icon"></i>
                )}
              </div>
            ))}
            {loading && (
              <div className="loading">
                <div className="spinner"></div>
                <span>Processing your request...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <form className="chatbot-input" onSubmit={handleSubmit}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ask about police services or IPC sections..."
          disabled={loading}
          aria-label="Type your message"
        />
        <div className="input-buttons">
          {isSpeaking ? (
            <button type="button" className="stop-btn" onClick={stopSpeaking} aria-label="Stop speaking">
              <i className="fas fa-stop"></i>
            </button>
          ) : (
            <button type="submit" className="send-btn" disabled={loading} aria-label="Send message">
              {loading ? <i className="fas fa-spinner fa-pulse"></i> : <i className="fas fa-paper-plane"></i>}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

export default PoliceChatbot; 
