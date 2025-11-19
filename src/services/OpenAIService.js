// OpenAIService.js
class OpenAIService {
  constructor() {
    this.endpoint = import.meta.env.VITE_OPENAI_URL;
    this.apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    this.model = import.meta.env.VITE_OPENAI_MODEL;
  }

  /**
   * Send a question to OpenAI and get an answer
   * @param {string} question - The question to ask
   * @returns {Promise<string>} - The text response
   */
  async askQuestion(question) {
    if (!question || question.trim() === '') {
      throw new Error('Question cannot be empty');
    }

    if (!this.apiKey) {
      throw new Error('OpenAI API key not set in environment variables.');
    }

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: question }
          ],
          temperature: 0.7,
          max_tokens: 2048
        })
      });

      if (!response.ok) throw new Error(`OpenAI request failed: ${response.statusText}`);

      const data = await response.json();
      const answer = data?.choices?.[0]?.message?.content;
      if (!answer) throw new Error('No response from OpenAI');
      return answer;
    } catch (error) {
      console.error('OpenAI askQuestion error:', error);
      throw error;
    }
  }

  /**
   * Respond as a friend with emotion context
   * @param {string} speechText
   * @param {string} emotion
   * @returns {Promise<Object>} - { text, animation, emotion, rawResponse }
   */
  async respondAsFriend(speechText, emotion) {
    if (!speechText || speechText.trim() === '') {
      throw new Error('Speech text cannot be empty');
    }

    const friendPrompt = `You are a caring and supportive friend. The user just said: "${speechText}" and their facial expression shows they are feeling: ${emotion}. 

Please respond as a good friend would - be empathetic, understanding, and supportive. Match their emotional tone appropriately:
- If they seem happy, be cheerful and share their joy
- If they seem sad, be comforting and caring
- If they seem angry, be calming and understanding
- If they seem excited, match their energy
- If they seem confused, be helpful and clarifying
- If they seem surprised, be engaging
- Always be genuine, warm, and supportive like a real friend would be

Additional Rule:  
If the user asks you to tell a story, joke, or share something, 
Do not stop at introductions. 

IMPORTANT: Respond ONLY with a valid JSON object in this exact format:
{
    "response": "your actual response here", 
    "animation": "one of these: Cheering.fbx, comforting.fbx, dance.fbx, greet.fbx, Idle.fbx, thumbup.fbx", 
    "AI_emotion": "one of these: neutral, happy, sad, angry, surprised, disgusted, excited, thinking, confused"
}

Choose the animation and AI_emotion that best matches your response tone and the user's situation.`;

    try {
      const rawResponse = await this.askQuestion(friendPrompt);

      // Parse JSON safely
      try {
        const jsonResponse = JSON.parse(rawResponse);
        if (!jsonResponse.response || !jsonResponse.animation || !jsonResponse.AI_emotion) {
          throw new Error('Invalid JSON structure');
        }
        return {
          text: jsonResponse.response,
          animation: jsonResponse.animation,
          emotion: jsonResponse.AI_emotion,
          rawResponse
        };
      } catch (parseError) {
        const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const extracted = JSON.parse(jsonMatch[0]);
            return {
              text: extracted.response || rawResponse,
              animation: extracted.animation || 'Idle.fbx',
              emotion: extracted.AI_emotion || 'neutral',
              rawResponse
            };
          } catch {
            return {
              text: rawResponse,
              animation: 'Idle.fbx',
              emotion: 'neutral',
              rawResponse
            };
          }
        } else {
          return {
            text: rawResponse,
            animation: 'Idle.fbx',
            emotion: 'neutral',
            rawResponse
          };
        }
      }
    } catch (error) {
      console.error('OpenAI respondAsFriend error:', error);
      throw error;
    }
  }
}

// Export singleton
export const openAIService = new OpenAIService();
export default OpenAIService;
