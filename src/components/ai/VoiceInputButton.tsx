import React, { useState, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  title?: string;
}

export const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({
  onTranscript,
  className = '',
  size = 'md',
  title = 'Click to dictate via voice input',
}) => {
  const [isListening, setIsListening] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-4.5 h-4.5',
  };

  const paddingSizes = {
    sm: 'p-1',
    md: 'p-1.5',
    lg: 'p-2',
  };

  const toggleListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      // Friendly fallback if SpeechRecognition is blocked in sandboxed iframe or unsupported browser
      const simulatedText = prompt('Voice Input (Browser Speech API unavailable, enter text or test prompt):');
      if (simulatedText && simulatedText.trim()) {
        onTranscript(simulatedText.trim());
      }
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      setStatusMessage(null);
    } else {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          setIsListening(true);
          setStatusMessage('Listening...');
        };

        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          if (event.results[0].isFinal) {
            if (currentTranscript.trim()) {
              onTranscript(currentTranscript.trim());
              setStatusMessage(`Captured: "${currentTranscript.trim()}"`);
              setTimeout(() => setStatusMessage(null), 2500);
            }
            setIsListening(false);
          } else {
            setStatusMessage(`"${currentTranscript}"`);
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition error:', event.error);
          setIsListening(false);
          if (event.error !== 'no-speech') {
            setStatusMessage(`Voice error: ${event.error}`);
            setTimeout(() => setStatusMessage(null), 2500);
          }
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err) {
        console.error('Speech recognition start failed:', err);
        setIsListening(false);
      }
    }
  };

  return (
    <div className="relative inline-flex items-center shrink-0">
      <button
        type="button"
        onClick={toggleListening}
        title={isListening ? 'Stop recording voice' : title}
        className={`relative inline-flex items-center justify-center rounded-[6px] transition-all cursor-pointer border ${paddingSizes[size]} ${
          isListening
            ? 'bg-rose-950 text-rose-300 border-rose-600 animate-pulse ring-2 ring-rose-500/40 shadow-lg'
            : 'bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-amber-300 border-stone-800 dark:bg-stone-900 dark:border-stone-800 dark:text-stone-300 light:bg-stone-100 light:border-stone-300 light:text-stone-700 light:hover:bg-stone-200'
        } ${className}`}
      >
        {isListening ? (
          <MicOff className={`${iconSizes[size]} text-rose-400`} />
        ) : (
          <Mic className={`${iconSizes[size]} text-amber-400`} />
        )}
        {isListening && (
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
        )}
      </button>

      {statusMessage && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1 bg-stone-900 dark:bg-stone-900 light:bg-stone-100 border border-stone-700 dark:border-stone-700 light:border-stone-300 text-amber-400 dark:text-amber-400 light:text-amber-700 text-[10px] font-mono rounded shadow-xl whitespace-nowrap z-50 animate-fade-in pointer-events-none">
          {statusMessage}
        </div>
      )}
    </div>
  );
};
