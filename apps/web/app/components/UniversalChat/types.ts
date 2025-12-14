/**
 * Universal Chat Component Types
 */

export type MessageSender = 'user' | 'bot' | 'ai' | 'system';

export interface MessageAttachment {
  url: string;
  type: string; // MIME type like 'image/jpeg', 'application/pdf'
  name: string;
  size?: number;
  /** Thumbnail URL for PDF first-page preview */
  thumbnailUrl?: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  sender: MessageSender;
  timestamp?: Date;
  senderName?: string;
  attachments?: MessageAttachment[];
}

export interface ChatHeaderConfig {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  showBackButton?: boolean;
  /** Only show back button on mobile (lg:hidden) */
  backButtonMobileOnly?: boolean;
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
  /** Callback when files are uploaded (receives FileList) */
  onFileUpload?: (files: FileList) => void;
  /** Alternative callback for file input change (receives full ChangeEvent) */
  onFileInputChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Whether the bot/AI is currently typing/processing */
  isTyping?: boolean;
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
  /** External file input ref for advanced control */
  fileInputRef?: React.RefObject<HTMLInputElement>;
  /** Custom drag enter handler */
  onDragEnter?: (e: React.DragEvent<HTMLDivElement>) => void;
  /** Custom drag leave handler */
  onDragLeave?: (e: React.DragEvent<HTMLDivElement>) => void;
  /** Custom drag over handler */
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void;
  /** Custom drop handler */
  onDrop?: (e: React.DragEvent<HTMLDivElement>) => void;
  /** External control of drag over state */
  isDragOver?: boolean;
}
