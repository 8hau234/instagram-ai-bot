require('dotenv').config();
const express = require('express');
const { sendDM, replyToComment } = require('./instagram');
const { generateAIResponse } = require('./ai');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON
app.use(express.json());

// Removed hardcoded product details since AI handles it

// Webhook Verification (Meta requires this when setting up the webhook)
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
        console.log('Webhook verified successfully!');
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

// Handle incoming Webhook events
app.post('/webhook', async (req, res) => {
    const body = req.body;
    
    // DEBUG: Log everything that comes in
    console.log('--- INCOMING WEBHOOK EVENT ---');
    console.log('Object:', body.object);
    console.log('Full body:', JSON.stringify(body, null, 2));
    console.log('-----------------------------');

    // Check if it's an event from a page/instagram subscription
    if (body.object === 'instagram') {
        
        // Iterate over each entry (there may be multiple if batched)
        for (const entry of body.entry) {
            
            // Handle Messages (DMs)
            if (entry.messaging) {
                for (const webhookEvent of entry.messaging) {
                    const senderId = webhookEvent.sender.id;
                    
                    if (webhookEvent.message && webhookEvent.message.text) {
                        // Ignore echo messages (messages sent by the bot itself)
                        if (webhookEvent.message.is_echo) {
                            console.log(`Ignoring echo message sent to ${senderId}`);
                            continue;
                        }

                        const messageText = webhookEvent.message.text;
                        console.log(`Received DM from ${senderId}: ${messageText}`);
                        
                        // Generate intelligent response using Gemini
                        const aiResponse = await generateAIResponse(messageText);
                        
                        // Send the AI's response back to the user
                        await sendDM(senderId, aiResponse);
                    }
                }
            }
        }
        // Return a '200 OK' response to all requests
        res.status(200).send('EVENT_RECEIVED');
    } else {
        // Return a '404 Not Found' if event is not from a supported object
        res.sendStatus(404);
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Webhook endpoint: http://localhost:${PORT}/webhook`);
});
