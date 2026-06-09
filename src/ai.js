const Groq = require("groq-sdk");
const { saveOrderToSheet } = require("./sheets");

// Initialize the Groq API client
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// In-memory store for conversation history (Maps senderId -> Array of messages)
const memoryDb = new Map();

// Define the system instructions based on the provided persona
const SYSTEM_INSTRUCTION = `
Business Overview:
We are a premier AI Automation Agency that builds intelligent, conversational systems for businesses. Our specialized agents automate customer engagement across Instagram DMs and WhatsApp DMs, streamlining lead generation and customer support.

What We Do:
1. Instagram DM Automation: Instantly replies to stories, comments, and direct messages to engage prospects 24/7.
2. WhatsApp DM Automation: Handles customer queries, books appointments, and nurtures leads natively inside WhatsApp.
3. Google Sheets Integration: For WhatsApp setups, our AI automatically extracts key customer data (e.g., Name, Phone Number, Email, Inquiry Details, Lead Status) during the chat and inputs it instantly into a Google Sheet CRM for the client.

AI Persona & Tone:
- Role: Elite AI Automation Consultant & Sales Representative.
- Tone: Professional, authoritative, confident, yet highly approachable and helpful. 
- Objective: Answer prospect questions about how our automation works, highlight the time and money saved by replacing manual chatting, and drive prospects to book a discovery call or purchase a setup.

Key Benefits to Emphasize:
- 24/7 Instant Responses: Never miss a lead or sale because of delayed replies.
- Automated CRM Tracking: No manual data entry; customer info goes straight from WhatsApp to Google Sheets instantly.
- High Scalability: Handle thousands of customer chats simultaneously without hiring extra staff.

Instructions:
Keep your responses concise, friendly, and tailored to the platform (Instagram DMs). Do not use excessive markdown or long paragraphs. Try to end with a clear call to action or a question to keep the conversation going.
If the customer says they want to place an order or buy a setup, ask for their Name, Phone Number, what they want to order, and what time they would like to book a call. Once you have all 4, use the save_order tool to save their details to the CRM.
\`;

const tools = [
  {
    type: "function",
    function: {
      name: "save_order",
      description: "Saves a customer's order to the CRM Google Sheet. Use this when you have collected the customer's name, phone number, order details, and requested call time.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "The customer's full name",
          },
          phone: {
            type: "string",
            description: "The customer's phone number",
          },
          orderDetails: {
            type: "string",
            description: "What the customer wants to order",
          },
          callTime: {
            type: "string",
            description: "When the customer wants to book their discovery call",
          },
        },
        required: ["name", "phone", "orderDetails", "callTime"],
      },
    },
  },
];

async function generateAIResponse(senderId, userMessage) {
    try {
        // Retrieve past messages for this user, or start a new array
        if (!memoryDb.has(senderId)) {
            memoryDb.set(senderId, []);
        }
        
        let userHistory = memoryDb.get(senderId);
        
        // Add the new user message to history
        userHistory.push({ role: "user", content: userMessage });

        // Keep only the last 10 messages to prevent token overflow
        if (userHistory.length > 10) {
            userHistory = userHistory.slice(userHistory.length - 10);
        }

        // Build the full prompt array
        const messages = [
            { role: "system", content: SYSTEM_INSTRUCTION },
            ...userHistory
        ];

        let chatCompletion = await groq.chat.completions.create({
            messages: messages,
            model: "llama-3.3-70b-versatile",
            temperature: 0.7,
            max_tokens: 1024,
            tools: tools,
            tool_choice: "auto",
        });

        const responseMessage = chatCompletion.choices[0]?.message;

        // Check if the AI wants to call a function
        if (responseMessage.tool_calls) {
            messages.push(responseMessage); // Add the assistant's tool call message

            for (const toolCall of responseMessage.tool_calls) {
                if (toolCall.function.name === "save_order") {
                    const args = JSON.parse(toolCall.function.arguments);
                    console.log("AI triggered save_order:", args);
                    
                    const success = await saveOrderToSheet(args.name, args.phone, args.orderDetails, args.callTime);
                    
                    messages.push({
                        tool_call_id: toolCall.id,
                        role: "tool",
                        name: "save_order",
                        content: success ? "Order saved successfully! Tell the customer their order is confirmed." : "Failed to save order to the database. Tell the user there was a glitch and you couldn't process the order.",
                    });
                }
            }

            // Call Groq again to get the final text response after the tool call
            chatCompletion = await groq.chat.completions.create({
                messages: messages,
                model: "llama-3.3-70b-versatile",
                temperature: 0.7,
                max_tokens: 1024,
            });
            
            const finalReply = chatCompletion.choices[0]?.message?.content || "Your order has been recorded!";
            
            // Save bot's reply to memory
            userHistory.push({ role: "assistant", content: finalReply });
            memoryDb.set(senderId, userHistory);
            
            return finalReply;
        }

        const standardReply = responseMessage?.content || "I apologize, but my AI system is currently undergoing a quick upgrade. Please try again in a moment.";
        
        // Save bot's reply to memory
        userHistory.push({ role: "assistant", content: standardReply });
        memoryDb.set(senderId, userHistory);
        
        return standardReply;
    } catch (error) {
        console.error('Error generating AI response via Groq:', error);
        return "I apologize, but my AI system is currently undergoing a quick upgrade. Please try again in a moment, or let me know if you'd like to book a discovery call right away!";
    }
}

module.exports = {
    generateAIResponse
};
