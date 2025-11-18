import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User, Loader2, Mic, MicOff } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function AIChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hello! I'm your AI financial assistant. I can help you analyze your spending, provide savings tips, and answer questions about your finances. What would you like to know?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error !== 'aborted') {
          toast({
            title: "Voice Recognition Error",
            description: "Could not capture voice. Please try again.",
            variant: "destructive",
          });
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          console.log('Recognition cleanup error:', e);
        }
      }
    };
  }, [toast]);

  const toggleVoiceRecognition = () => {
    if (!recognitionRef.current) {
      toast({
        title: "Voice Recognition Unavailable",
        description: "Your browser doesn't support voice recognition. Try Chrome or Edge.",
        variant: "destructive",
      });
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.log('Stop recognition error:', e);
      }
      setIsListening(false);
    } else {
      try {
        setIsListening(true);
        recognitionRef.current.start();
      } catch (e) {
        console.error('Start recognition error:', e);
        setIsListening(false);
        toast({
          title: "Voice Recognition Error",
          description: "Could not start voice recognition. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const chatMutation = useMutation({
    mutationFn: async (chatMessages: Array<{ role: string; content: string }>) => {
      const response = await apiRequest("POST", "/api/ai/chat", { messages: chatMessages });
      return response.json();
    },
    onSuccess: (data: any) => {
      const aiMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: data.message || "I'm sorry, I couldn't generate a response.",
      };
      setMessages((prev) => [...prev, aiMessage]);
    },
    onError: (error: any) => {
      console.error("AI chat error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to get AI response. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSend = () => {
    if (!input.trim() || chatMutation.isPending) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    const chatHistory = [...messages, userMessage].map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    chatMutation.mutate(chatHistory);
  };

  return (
    <Card className="flex flex-col h-[600px]" data-testid="ai-chat-container">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold">AI Financial Assistant</h3>
            <p className="text-xs text-muted-foreground">Ask me anything about your finances</p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {message.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5" />
                </div>
              )}
              <div
                className={`rounded-2xl px-4 py-3 max-w-[80%] ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
                data-testid={`message-${message.role}`}
              >
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
              </div>
              {message.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5" />
                </div>
              )}
            </div>
          ))}
          {chatMutation.isPending && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5" />
              </div>
              <div className="rounded-2xl px-4 py-3 bg-muted">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <p className="text-sm">Thinking...</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Textarea
            placeholder="Ask me anything about your finances..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="resize-none min-h-[60px]"
            disabled={chatMutation.isPending}
            data-testid="input-chat-message"
          />
          <Button 
            onClick={toggleVoiceRecognition}
            size="icon"
            variant={isListening ? "destructive" : "outline"}
            className={isListening ? "animate-pulse" : ""}
            disabled={chatMutation.isPending}
            data-testid="button-voice-toggle"
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>
          <Button 
            onClick={handleSend} 
            size="icon"
            disabled={chatMutation.isPending || !input.trim()}
            data-testid="button-send-message"
          >
            {chatMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
