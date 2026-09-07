import i18n from '@/i18n/config';
import { useState } from 'react';
import { ChatMessage } from '@/types';
import { Bot, User, ChevronDown, ChevronRight } from 'lucide-react';
import { isImageFile, type FileData } from '@/utils/fileUtils';
import { Image, FileText, File } from 'lucide-react';

interface AgentChatMessageProps {
  message: ChatMessage;
}

interface FunctionMessageContent {
  title: string;
  content: string;
  author?: string;
}

export function AgentChatMessage({ message }: AgentChatMessageProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isUser = message.author === 'user';
  // Safety check: ensure content exists and has parts
  const parts = message.content?.parts || [];

  const hasFunctionCall = parts.some((part: any) => part.functionCall || part.function_call);
  const hasFunctionResponse = parts.some(
    (part: any) => part.functionResponse || part.function_response,
  );
  const isFunctionMessage = hasFunctionCall || hasFunctionResponse;

  const getMessageContent = (): string | FunctionMessageContent => {
    if (!parts || parts.length === 0) return 'Empty content';

    const functionCallPart = parts.find((part: any) => part.functionCall || part.function_call);
    const functionResponsePart = parts.find(
      (part: any) => part.functionResponse || part.function_response,
    );

    if (functionCallPart) {
      const funcCall = (functionCallPart.functionCall ||
        functionCallPart.function_call ||
        {}) as Record<string, unknown>;
      const args = (funcCall.args || {}) as Record<string, unknown>;
      const name = (funcCall.name || 'unknown') as string;
      const id = (funcCall.id || 'no-id') as string;

      return {
        author: message.author,
        title: `📞 Function call: ${name}`,
        content: `ID: ${id}\nArgs: ${
          Object.keys(args).length > 0 ? `\n${JSON.stringify(args, null, 2)}` : '{}'
        }`,
      } as FunctionMessageContent;
    }

    if (functionResponsePart) {
      const funcResponse = (functionResponsePart.functionResponse ||
        functionResponsePart.function_response ||
        {}) as Record<string, unknown>;
      const response = (funcResponse.response || {}) as Record<string, unknown>;
      const name = (funcResponse.name || 'unknown') as string;
      const id = (funcResponse.id || 'no-id') as string;
      const status = (response.status || 'unknown') as string;
      const statusEmoji = status === 'error' ? '❌' : '✅';

      let resultText = '';
      if (status === 'error') {
        resultText = i18n.t("interface:messages.agentError", { error: response.error_message || i18n.t('common:error') });
      } else {
        resultText = `Result:\n${JSON.stringify(response, null, 2)}`;
      }

      return {
        author: message.author,
        title: `${statusEmoji} Function response: ${name}`,
        content: `ID: ${id}\n${resultText}`,
      } as FunctionMessageContent;
    }

    const textParts = parts
      .filter((part: any) => part.text)
      .map((part: any) => part.text)
      .filter((text: any) => text) as string[];

    if (textParts.length > 0) {
      return textParts.join('\n\n');
    }

    return 'Empty content';
  };

  const messageContent = getMessageContent();
  const inlineDataParts = parts.filter((part: any) => part.inline_data);

  return (
    <div className="flex w-full" style={{ justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
      <div
        className="flex gap-3 max-w-[90%]"
        style={{ flexDirection: isUser ? 'row-reverse' : 'row' }}
      >
        {/* Avatar */}
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
            isUser ? 'bg-primary' : 'bg-muted'
          }`}
        >
          {isUser ? (
            <User className="h-4 w-4 text-primary-foreground" />
          ) : (
            <Bot className="h-4 w-4 text-foreground" />
          )}
        </div>

        {/* Message */}
        <div
          className={`rounded-lg p-3 ${
            isFunctionMessage
              ? 'bg-muted border text-sm font-mono'
              : isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted border'
          }`}
        >
          {isFunctionMessage ? (
            <div className="w-full">
              <div
                className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {typeof messageContent === 'object' && 'title' in messageContent && (
                  <>
                    <div className="flex-1 font-semibold">{messageContent.title}</div>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </>
                )}
              </div>
              {isExpanded && typeof messageContent === 'object' && 'content' in messageContent && (
                <div className="mt-2 pt-2 border-t">
                  <pre className="whitespace-pre-wrap text-xs max-w-full overflow-x-auto">
                    {messageContent.content}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div className="break-words max-w-full whitespace-pre-wrap">
              {typeof messageContent === 'object' && 'content' in messageContent ? (
                <p>{messageContent.content}</p>
              ) : (
                <p>{messageContent}</p>
              )}
            </div>
          )}

          {/* Inline data attachments */}
          {inlineDataParts.length > 0 && (
            <div className="mt-2 space-y-2">
              {inlineDataParts.map((part: any, index: number) => {
                const inlineData = part.inline_data;
                if (!inlineData) return null;

                const fileData: FileData = {
                  filename: (inlineData.metadata?.filename as string) || 'file',
                  content_type: inlineData.mime_type,
                  data: inlineData.data,
                  size: 0,
                };

                return (
                  <div
                    key={index}
                    className="flex items-center gap-2 bg-background/50 rounded p-2 text-xs"
                  >
                    {isImageFile(fileData.content_type) ? (
                      <>
                        <Image className="h-4 w-4 text-primary" />
                        <span className="truncate">{fileData.filename}</span>
                      </>
                    ) : fileData.content_type === 'application/pdf' ? (
                      <>
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="truncate">{fileData.filename}</span>
                      </>
                    ) : (
                      <>
                        <File className="h-4 w-4 text-primary" />
                        <span className="truncate">{fileData.filename}</span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
