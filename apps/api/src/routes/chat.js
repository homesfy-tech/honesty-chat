import express from "express";
import { getWidgetConfig } from "../storage/widgetConfigStore.js";
import { sanitizeString, sanitizeProjectId, sanitizeMicrosite, sanitizeConversation } from "../utils/sanitize.js";
import { logger } from "../utils/logger.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    let { message, conversation, projectId, microsite, selectedCta, selectedBhk, propertyInfo: clientPropertyInfo } = req.body;

    // Sanitize inputs
    message = sanitizeString(message);
    projectId = sanitizeProjectId(projectId);
    microsite = sanitizeMicrosite(microsite);
    conversation = sanitizeConversation(conversation);

    if (!message || !projectId) {
      return res.status(400).json({ error: "Message and projectId are required" });
    }

    // Fetch widget config and property information
    const widgetConfig = await getWidgetConfig(projectId);
    // Use client-provided propertyInfo if available (auto-detected), otherwise use config
    const propertyInfo = clientPropertyInfo && Object.keys(clientPropertyInfo).length > 0 
      ? clientPropertyInfo 
      : (widgetConfig.propertyInfo || {});
    const agentName = widgetConfig.agentName || "Riya";
    
    logger.log("Chat API: Received propertyInfo:", propertyInfo ? Object.keys(propertyInfo) : 'none');
    logger.log("Chat API: Message:", message);
    logger.log("Chat API: Using keyword matching for responses");

    // Use property info to give a helpful response
    const hasPropertyInfo = propertyInfo && Object.keys(propertyInfo).length > 0;
    
    if (hasPropertyInfo && message) {
      const lowerMessage = message.toLowerCase().trim();
      const lastUserMessage = conversation && conversation.length > 0 
        ? conversation[conversation.length - 1]?.text?.toLowerCase() || ''
        : '';
      const contextMessage = lastUserMessage || lowerMessage;
      
      // Handle simple responses like "yes", "no", "ok", "sure"
      if (['yes', 'yeah', 'yep', 'sure', 'ok', 'okay', 'alright', 'fine', 'correct', 'right'].includes(lowerMessage)) {
        // Look at last AGENT message to understand what they're saying yes to
        const lastAgentMessage = conversation && conversation.length > 0
          ? conversation.filter(m => m.type === 'agent' || m.type === 'system').slice(-1)[0]?.text?.toLowerCase() || ''
          : '';
        
        // Check what the agent just asked about
        if (lastAgentMessage.includes('would you like to know about') && (lastAgentMessage.includes('pricing') || lastAgentMessage.includes('site visit'))) {
          const bhkText = propertyInfo.availableBhk && Array.isArray(propertyInfo.availableBhk) && propertyInfo.availableBhk.length > 0
            ? propertyInfo.availableBhk.join(' and ')
            : 'various configurations';
          const pricingText = propertyInfo.pricing && typeof propertyInfo.pricing === 'object' && Object.keys(propertyInfo.pricing).length > 0
            ? Object.entries(propertyInfo.pricing).map(([bhk, price]) => `${bhk}: ${price}`).join(', ')
            : 'Check with our team for current pricing';
          const response = `Great! We have ${bhkText} available. Our pricing: ${pricingText}. Would you like to schedule a site visit or get more details?`;
          return res.json({ response, aiUsed: false, fallback: true });
        }
        
        if (lastAgentMessage.includes('located in') || (lastAgentMessage.includes('location') && lastAgentMessage.includes('would you like'))) {
          const bhkText = propertyInfo.availableBhk && Array.isArray(propertyInfo.availableBhk) && propertyInfo.availableBhk.length > 0
            ? propertyInfo.availableBhk.join(' and ')
            : 'various configurations';
          const pricingInfo = propertyInfo.pricing && Object.keys(propertyInfo.pricing).length > 0
            ? `Pricing starts from ${Object.values(propertyInfo.pricing)[0]}. `
            : '';
          const response = `Great! We have ${bhkText} available. ${pricingInfo}Would you like to know more about the configurations or schedule a site visit?`;
          return res.json({ response, aiUsed: false, fallback: true });
        }
        
        if (lastAgentMessage.includes('pricing') && lastAgentMessage.includes('would you') && !lastAgentMessage.includes('location')) {
          const response = `Excellent! I'd love to help you with the best pricing and payment plans. Share your name and phone so our team can reach out with exclusive offers.`;
          return res.json({ response, aiUsed: false, fallback: true });
        }
        
        if (lastAgentMessage.includes('bhk') || lastAgentMessage.includes('configuration') || lastAgentMessage.includes('bedroom')) {
          const pricingText = propertyInfo.pricing && typeof propertyInfo.pricing === 'object' && Object.keys(propertyInfo.pricing).length > 0
            ? Object.entries(propertyInfo.pricing).map(([bhk, price]) => `${bhk}: ${price}`).join(', ')
            : 'Check with our team for current pricing';
          const response = `Perfect! Our pricing: ${pricingText}. Would you like to schedule a site visit or get more details? Share your name and phone.`;
          return res.json({ response, aiUsed: false, fallback: true });
        }
        
        // Generic yes response
        const response = `That's great! ${propertyInfo.pricing && Object.keys(propertyInfo.pricing).length > 0 
          ? `Would you like to know about our pricing or available configurations?` 
          : `Would you like to know more about ${propertyInfo.projectName || 'this project'}?`} Share your name and phone so I can assist you better.`;
        return res.json({ response, aiUsed: false, fallback: true });
      }
      
      // Handle "no" responses
      if (['no', 'nope', 'not', "don't", 'nah'].includes(lowerMessage)) {
        const response = `No worries! Is there anything else about ${propertyInfo.projectName || 'the project'} you'd like to know? I'm here to help!`;
        return res.json({ response, aiUsed: false, fallback: true });
      }
      
      // Handle greetings
      if (['hi', 'hello', 'hey', 'hello there', 'hi there'].includes(lowerMessage)) {
        const projectText = propertyInfo.projectName 
          ? `I'm here to help you with ${propertyInfo.projectName}.` 
          : "I'm here to help you find your dream home.";
        const response = `Hi! 👋 I'm ${agentName} from Homesfy. ${projectText} What would you like to know?`;
        return res.json({ response, aiUsed: false, fallback: true });
      }
      
      // Handle project name questions
      if (lowerMessage.includes('project name') || lowerMessage.includes('name of project') || lowerMessage.includes('what is this') || lowerMessage.includes('what project')) {
        const response = propertyInfo.projectName 
          ? `This is ${propertyInfo.projectName}${propertyInfo.developer ? ` by ${propertyInfo.developer}` : ''}${propertyInfo.location ? ` located in ${propertyInfo.location}` : ''}. Would you like to know more about pricing or available configurations?`
          : "I'd love to help you with that! Share your name and phone so I can assist you better.";
        return res.json({ response, aiUsed: false, fallback: true });
      }
      
      // Handle pricing questions
      if (lowerMessage.includes('cost') || lowerMessage.includes('price') || lowerMessage.includes('pricing') || lowerMessage.includes('how much')) {
        const pricingText = propertyInfo.pricing && typeof propertyInfo.pricing === 'object' && Object.keys(propertyInfo.pricing).length > 0
          ? Object.entries(propertyInfo.pricing).map(([bhk, price]) => `${bhk}: ${price}`).join(', ')
          : 'Check with our team for current pricing';
        const response = `Our pricing: ${pricingText}. Would you like to schedule a site visit or get more details? Share your name and phone.`;
        return res.json({ response, aiUsed: false, fallback: true });
      }
      
      // Handle location questions
      if (lowerMessage.includes('location') || lowerMessage.includes('where') || lowerMessage.includes('address') || lowerMessage.includes('situated')) {
        const response = propertyInfo.location
          ? `${propertyInfo.projectName || 'This project'} is located in ${propertyInfo.location}. ${propertyInfo.availableBhk && Array.isArray(propertyInfo.availableBhk) && propertyInfo.availableBhk.length > 0 
            ? `We have ${propertyInfo.availableBhk.join(' and ')} available. ` 
            : ''}Would you like to know about pricing or schedule a site visit?`
          : "I'd love to help you with that! Share your name and phone so I can assist you better.";
        return res.json({ response, aiUsed: false, fallback: true });
      }
      
      // Handle BHK questions
      if (lowerMessage.includes('bhk') || lowerMessage.includes('configuration') || lowerMessage.includes('bedroom') || lowerMessage.includes('room')) {
        const bhkText = propertyInfo.availableBhk && Array.isArray(propertyInfo.availableBhk) && propertyInfo.availableBhk.length > 0
          ? propertyInfo.availableBhk.join(' and ')
          : 'various configurations';
        const response = `We have ${bhkText} available. ${propertyInfo.pricing && Object.keys(propertyInfo.pricing).length > 0 
          ? `Would you like to know about pricing? ` 
          : ''}Share your name and phone so I can assist you better.`;
        return res.json({ response, aiUsed: false, fallback: true });
      }
      
      // Handle amenities questions
      if (lowerMessage.includes('amenit') || lowerMessage.includes('facilit') || lowerMessage.includes('feature') || lowerMessage.includes('what do you have')) {
        const amenitiesText = propertyInfo.amenities && Array.isArray(propertyInfo.amenities) && propertyInfo.amenities.length > 0
          ? propertyInfo.amenities.slice(0, 8).join(', ')
          : 'modern amenities';
        const response = `We offer ${amenitiesText}${propertyInfo.amenities && propertyInfo.amenities.length > 8 ? ' and more' : ''}. Would you like to know about pricing or schedule a site visit?`;
        return res.json({ response, aiUsed: false, fallback: true });
      }
      
      // Handle "brief details", "highlights", "overview" requests
      const isBriefRequest = lowerMessage.includes('brief') || 
                            lowerMessage.includes('breif') || 
                            lowerMessage.includes('detail') || 
                            lowerMessage.includes('highlight') || 
                            lowerMessage.includes('overview') || 
                            lowerMessage.includes('tell me about') || 
                            lowerMessage.includes('about the project') ||
                            lowerMessage.includes('about this project') ||
                            (lowerMessage.includes('can give') && (lowerMessage.includes('brief') || lowerMessage.includes('breif') || lowerMessage.includes('detail'))) ||
                            (lowerMessage.includes('give me') && (lowerMessage.includes('brief') || lowerMessage.includes('breif') || lowerMessage.includes('detail') || lowerMessage.includes('info')));
      
      if (isBriefRequest) {
        const highlights = [];
        if (propertyInfo.projectName) highlights.push(`${propertyInfo.projectName}`);
        if (propertyInfo.developer) highlights.push(`by ${propertyInfo.developer}`);
        if (propertyInfo.location) highlights.push(`located in ${propertyInfo.location}`);
        if (propertyInfo.availableBhk && Array.isArray(propertyInfo.availableBhk) && propertyInfo.availableBhk.length > 0) {
          highlights.push(`available in ${propertyInfo.availableBhk.join(' and ')} configurations`);
        }
        if (propertyInfo.pricing && typeof propertyInfo.pricing === 'object' && Object.keys(propertyInfo.pricing).length > 0) {
          const pricingList = Object.entries(propertyInfo.pricing).map(([bhk, price]) => `${bhk}: ${price}`).join(', ');
          highlights.push(`pricing ranges from ${pricingList}`);
        }
        if (propertyInfo.amenities && Array.isArray(propertyInfo.amenities) && propertyInfo.amenities.length > 0) {
          const topAmenities = propertyInfo.amenities.slice(0, 5).join(', ');
          highlights.push(`key amenities include ${topAmenities}`);
        }
        if (propertyInfo.specialOffers && propertyInfo.specialOffers !== 'None' && propertyInfo.specialOffers.trim()) {
          highlights.push(`special offer: ${propertyInfo.specialOffers}`);
        }
        
        if (highlights.length > 0) {
          let response = highlights.join('. ');
          if (propertyInfo.area && propertyInfo.area !== 'Not specified') {
            response += `. The project offers ${propertyInfo.area} of living space`;
          }
          response += '. Would you like to know more about pricing, configurations, or schedule a site visit?';
          return res.json({ response: response.replace(/\.\s*\./g, '.').replace(/\s+/g, ' ').trim(), aiUsed: false, fallback: true });
        }
      }
    }
    
    // Generic fallback response
    const fallbackResponse = conversation && conversation.length > 2
      ? "That's interesting! Share your name and phone so I can connect you with our team."
      : "I'd love to help you with that! What would you like to know about the project?";
    return res.json({ response: fallbackResponse, aiUsed: false, fallback: true });
    
  } catch (error) {
    logger.error("❌ Chat API: Error processing request:", error);
    
    // Generic fallback response on error
    res.status(500).json({ 
      response: "I'd love to help you with that! Share your name and phone so I can assist you better.",
      aiUsed: false,
      fallback: true,
      error: process.env.NODE_ENV !== 'production' && !process.env.VERCEL ? error.message : undefined
    });
  }
});

export default router;
