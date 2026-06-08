const axios = require('axios');
require('dotenv').config();

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const GRAPH_API_URL = 'https://graph.facebook.com/v20.0';

/**
 * Sends a Direct Message to a user.
 * @param {string} recipientId - The ID of the user to send the message to.
 * @param {string} text - The message text.
 */
async function sendDM(recipientId, text) {
    try {
        const response = await axios.post(
            `${GRAPH_API_URL}/me/messages`,
            {
                recipient: { id: recipientId },
                message: { text: text },
                messaging_type: "RESPONSE"
            },
            {
                params: { access_token: PAGE_ACCESS_TOKEN }
            }
        );
        console.log(`DM sent successfully to ${recipientId}`);
        return response.data;
    } catch (error) {
        console.error('Error sending DM:', error.response ? error.response.data : error.message);
    }
}

/**
 * Replies to a specific comment.
 * @param {string} commentId - The ID of the comment to reply to.
 * @param {string} text - The reply text.
 */
async function replyToComment(commentId, text) {
    try {
        const response = await axios.post(
            `${GRAPH_API_URL}/${commentId}/replies`,
            {
                message: text
            },
            {
                params: { access_token: PAGE_ACCESS_TOKEN }
            }
        );
        console.log(`Replied to comment ${commentId} successfully`);
        return response.data;
    } catch (error) {
        console.error('Error replying to comment:', error.response ? error.response.data : error.message);
    }
}

module.exports = {
    sendDM,
    replyToComment
};
