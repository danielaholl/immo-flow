/**
 * Universal Chat Component Types
 */

export type MessageSender = 'user' | 'bot' | 'ai' | 'system';

export interface ChatMessage {
  id: string;
  content: string;
  sender: MessageSender;
  timestamp?: Date;
  senderName?: string;
  extractedData?: Record<string, unknown>;
}

export interface ChatHeaderConfig {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  showBackButton?: boolean;
  onBackClick?: () => void;
}

export interface ChatInputConfig {
  placeholder?: string;
  disabled?: boolean;
  showFileUpload?: boolean;
  acceptedFileTypes?: string;
  multipleFiles?: boolean;
}

export interface ChatStyleConfig {
  /** User message bubble style */
  userBubble?: {
    bgColor?: string;
    textColor?: string;
    borderRadius?: string;
  };
  /** Bot/AI message bubble style */
  botBubble?: {
    bgColor?: string;
    textColor?: string;
    borderColor?: string;
    borderRadius?: string;
  };
  /** System message style */
  systemMessage?: {
    bgColor?: string;
    textColor?: string;
    borderColor?: string;
  };
}

export interface UniversalChatProps {
  /** Array of messages to display */
  messages: ChatMessage[];
  /** Header configuration */
  header: ChatHeaderConfig;
  /** Input configuration */
  input?: ChatInputConfig;
  /** Style configuration */
  style?: ChatStyleConfig;
  /** Current input value (controlled) */
  inputValue?: string;
  /** Callback when input changes */
  onInputChange?: (value: string) => void;
  /** Callback when message is sent */
  onSendMessage?: (message: string) => void;
  /** Callback when files are uploaded */
  onFileUpload?: (files: FileList) => void;
  /** Whether the bot/AI is currently typing/processing */
  isTyping?: boolean;
  /** Custom typing indicator text */
  typingText?: string;
  /** Whether message sending is in progress */
  isSending?: boolean;
  /** Whether file upload is in progress */
  isUploading?: boolean;
  /** Enable drag & drop for files */
  enableDragDrop?: boolean;
  /** Custom class name for the container */
  className?: string;
  /** Show timestamps on messages */
  showTimestamps?: boolean;
  /** Show sender names on bot messages */
  showSenderNames?: boolean;
  /** Ref for scrolling to bottom */
  messagesEndRef?: React.RefObject<HTMLDivElement>;
  /** Custom empty state content */
  emptyState?: React.ReactNode;
}
