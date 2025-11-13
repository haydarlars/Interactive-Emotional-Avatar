import React, { useState, useEffect, useRef } from 'react';

// Vite environment variables
const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID = import.meta.env.VITE_ELEVENLABS_VOICE_ID;

const AIResponseDisplay = ({ responses = [], onSpeakingStateChange }) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const messagesEndRef = useRef(null);
  const audioRef = useRef(null);

  // --- Emotion mapping with prompts for natural pitch/intonation ---
  const emotionSettings = {
    happy: { stability: 0.8, similarity_boost: 0.8, prompt: "Say this happily, cheerful and energetic:" },
    excited: { stability: 0.85, similarity_boost: 0.9, prompt: "Say this with excitement and enthusiasm:" },
    sad: { stability: 0.6, similarity_boost: 0.7, prompt: "Say this sadly, with slow and soft tone:" },
    angry: { stability: 0.9, similarity_boost: 0.8, prompt: "Say this angrily, firm and intense:" },
    surprised: { stability: 0.75, similarity_boost: 0.85, prompt: "Say this with surprise, slightly faster and higher pitch:" },
    thinking: { stability: 0.7, similarity_boost: 0.75, prompt: "Say this thoughtfully, calm and reflective:" },
    neutral: { stability: 0.75, similarity_boost: 0.75, prompt: "" }
  };

  // --- Text-to-speech using ElevenLabs ---
  const speakText = async (text, emotion = 'neutral') => {
    if (!speechEnabled || !ELEVENLABS_API_KEY) return;

    stopSpeech(); // stop any current speech
    setIsSpeaking(true);
    if (onSpeakingStateChange) onSpeakingStateChange(true);

    try {
      const settings = emotionSettings[emotion] || emotionSettings['neutral'];
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': ELEVENLABS_API_KEY
          },
          body: JSON.stringify({
            text: settings.prompt + " " + text,
            voice_settings: {
              stability: settings.stability,
              similarity_boost: settings.similarity_boost
            }
          })
        }
      );

      if (!response.ok) throw new Error('TTS request failed');

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = audioUrl;
        audioRef.current.play();
      } else {
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        audio.play();
      }

      audioRef.current.onended = () => {
        setIsSpeaking(false);
        if (onSpeakingStateChange) onSpeakingStateChange(false);
      };
    } catch (error) {
      console.error('ElevenLabs TTS error:', error);
      setIsSpeaking(false);
      if (onSpeakingStateChange) onSpeakingStateChange(false);
    }
  };

  const stopSpeech = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsSpeaking(false);
    if (onSpeakingStateChange) onSpeakingStateChange(false);
  };

  // --- Auto-speak latest response ---
  useEffect(() => {
    if (responses.length > 0) {
      const latest = responses[responses.length - 1];
      if (latest && !latest.isError && latest.aiResponse) {
        setTimeout(() => speakText(latest.aiResponse, latest.aiEmotion), 500);
      }
    }
  }, [responses.length, speechEnabled]);

  // --- Cleanup on unmount ---
  useEffect(() => stopSpeech, []);

  // --- Auto-scroll to latest message ---
  useEffect(() => {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [responses]);

  // --- Auto-expand if minimized ---
  useEffect(() => {
    if (responses.length > 0 && isMinimized) setIsMinimized(false);
  }, [responses.length]);

  const clearResponses = () => {
    if (window.clearAIResponses) window.clearAIResponses();
  };

  const formatTime = (timestamp) =>
    new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // --- Minimized UI ---
  if (isMinimized) {
    return (
      <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 1001 }}>
        <button
          onClick={() => setIsMinimized(false)}
          style={{
            padding: '12px',
            background: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            cursor: 'pointer',
            fontSize: '20px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            width: '50px',
            height: '50px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Show AI Responses"
        >
          💬
        </button>
        {responses.length > 0 && (
          <div style={{
            position: 'absolute',
            top: '-5px',
            right: '-5px',
            background: '#f44336',
            color: 'white',
            borderRadius: '50%',
            width: '20px',
            height: '20px',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {responses.length}
          </div>
        )}
      </div>
    );
  }

  // --- Full UI ---
  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      width: '400px',
      maxHeight: '500px',
      background: 'rgba(0, 0, 0, 0.9)',
      borderRadius: '15px',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1001,
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      border: '1px solid rgba(255,255,255,0.1)'
    }}>
      {/* Header */}
      <div style={{
        padding: '15px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        color: 'white'
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '16px' }}>🤖 AI Friend Responses</h3>
          <div style={{ fontSize: '12px', opacity: 0.7 }}>
            {responses.length} conversation{responses.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setSpeechEnabled(!speechEnabled)}
            style={{
              padding: '4px 8px',
              background: speechEnabled ? '#4CAF50' : '#666',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
            title={speechEnabled ? 'Disable speech' : 'Enable speech'}
          >
            {speechEnabled ? '🔊' : '🔇'}
          </button>
          {isSpeaking && (
            <button
              onClick={stopSpeech}
              style={{
                padding: '4px 8px',
                background: '#ff9800',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
              title="Stop speaking"
            >
              ⏸️
            </button>
          )}
          <button
            onClick={clearResponses}
            style={{
              padding: '4px 8px',
              background: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
            title="Clear all responses"
          >
            🗑️
          </button>
          <button
            onClick={() => setIsMinimized(true)}
            style={{
              padding: '4px 8px',
              background: '#666',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
            title="Minimize"
          >
            ➖
          </button>
        </div>
      </div>

      {/* Messages Container */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '15px',
        display: 'flex',
        flexDirection: 'column',
        gap: '15px'
      }}>
        {responses.length === 0 ? (
          <div style={{
            color: 'rgba(255,255,255,0.6)',
            textAlign: 'center',
            fontStyle: 'italic',
            fontSize: '14px',
            padding: '20px'
          }}>
            Start talking to see your AI friend's responses here!
          </div>
        ) : (
          responses.map((response, index) => (
            <div key={index} style={{
              background: response.isError ? 'rgba(244, 67, 54, 0.1)' : 'rgba(76, 175, 80, 0.1)',
              border: response.isError ? '1px solid rgba(244, 67, 54, 0.3)' : '1px solid rgba(76, 175, 80, 0.3)',
              borderRadius: '12px',
              padding: '12px',
              color: 'white'
            }}>
              {/* User Speech */}
              <div style={{
                marginBottom: '8px',
                padding: '8px 12px',
                background: 'rgba(33, 150, 243, 0.2)',
                borderRadius: '8px',
                borderLeft: '3px solid #2196F3'
              }}>
                <div style={{
                  fontSize: '11px',
                  opacity: 0.7,
                  marginBottom: '4px',
                  display: 'flex',
                  justifyContent: 'space-between'
                }}>
                  <span>You said:</span>
                  <span>{formatTime(response.timestamp)}</span>
                </div>
                <div style={{ fontSize: '13px', fontStyle: 'italic' }}>
                  "{response.userSpeech}"
                </div>
              </div>

              {/* AI Response */}
              <div style={{
                padding: '8px 12px',
                background: response.isError ? 'rgba(244, 67, 54, 0.2)' : 'rgba(76, 175, 80, 0.2)',
                borderRadius: '8px',
                borderLeft: response.isError ? '3px solid #f44336' : '3px solid #4CAF50'
              }}>
                <div style={{
                  fontSize: '11px',
                  opacity: 0.7,
                  marginBottom: '4px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>AI Friend responds:</span>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {response.animation && <span>🎭 {response.animation.replace('.fbx', '')}</span>}
                    {isSpeaking && index === responses.length - 1 && (
                      <span style={{ color: '#4CAF50' }}>🗣️ Speaking...</span>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: '14px', lineHeight: '1.4', color: response.isError ? '#ffcdd2' : 'white' }}>
                  {response.aiResponse}
                </div>
                {response.aiEmotion && (
                  <div style={{ fontSize: '10px', opacity: 0.6, marginTop: '4px' }}>
                    AI Emotion: {response.aiEmotion}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Footer */}
      <div style={{ padding: '10px 15px', borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: '11px', color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>
        💡 Your AI friend responds with voice and emotions
      </div>
      <audio ref={audioRef} />
    </div>
  );
};

export default AIResponseDisplay;
