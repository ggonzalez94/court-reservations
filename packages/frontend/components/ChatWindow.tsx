import { FormEvent, useEffect, useRef, useState } from 'react';
import useAutoResizeTextArea from '@/hooks/useAutoResizeTextArea';
import { FiSend } from 'react-icons/fi';
import Message from './Message';
import { GenerateCourtsInputResponse, GetCourtsResponse } from '../utils/types';

const ChatWindow = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [showEmptyChat, setShowEmptyChat] = useState(true);
    const [conversation, setConversation] = useState<any[]>([]);
    const [message, setMessage] = useState('');
    const [courts, setCourts] = useState<any[]>([]);
    const [conversationDone, setConversationDone] = useState(false); // This is used to reset the chat when the conversation is done
    const textAreaRef = useAutoResizeTextArea();
    const bottomOfChatRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (textAreaRef.current) {
            textAreaRef.current.style.height = '24px';
            textAreaRef.current.style.height = `${textAreaRef.current.scrollHeight}px`;
        }
    }, [message, textAreaRef]);
    useEffect(() => {
        if (bottomOfChatRef.current) {
            bottomOfChatRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [conversation]);

    const requestCourtInput = async (
        message: string
    ): Promise<GenerateCourtsInputResponse | string> => {
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
        const response = await fetch(`${baseUrl}/courts-input`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify([
                ...conversation,
                { content: message, role: 'user' },
            ]),
        });

        if (response.ok) {
            const data = (await response.json()) as GenerateCourtsInputResponse;
            return data;
        } else {
            return response.statusText;
        }
    };

    const getAvailableCourts = async (
        date: string,
        duration: string
    ): Promise<GetCourtsResponse | string> => {
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
        const queryString = new URLSearchParams({ date, duration }).toString();
        const response = await fetch(`${baseUrl}/courts?${queryString}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (response.ok) {
            const data = (await response.json()) as GetCourtsResponse;
            return data;
        } else {
            console.error(response);
            return response.statusText;
        }
    };

    const clearData = () => {
        console.log('Clearing all data!');
        setShowEmptyChat(true);
        setConversation([]);
        setMessage('');
        setCourts([]);
        setConversationDone(false);
    };

    // If OpenAI was able to process the request and return parameters to call the function
    const isInputReady = (input: GenerateCourtsInputResponse): boolean => {
        return input.parameters !== null;
    };

    const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        // Don't send empty messages
        if (message.length < 1) {
            setErrorMessage('Por favor ingresa un mensaje.');
            return;
        } else {
            setErrorMessage('');
        }

        setIsLoading(true);

        // Add the message to the conversation
        setConversation([
            ...conversation,
            { content: message, role: 'user' },
            { content: null, role: 'assistant' },
        ]);

        // Clear the message & remove empty chat
        setMessage('');
        setShowEmptyChat(false);

        // Send the message to the our api
        const response = await requestCourtInput(message);

        if (typeof response === 'string') {
            setErrorMessage(response);
            setIsLoading(false);
            return;
        }

        if (!isInputReady(response)) {
            // Add the message to the conversation
            setConversation([
                ...conversation,
                { content: message, role: 'user' },
                { content: response.message, role: 'assistant' },
            ]);
            setIsLoading(false);
            return;
        }

        // Get the available courts
        const availableCourts = await getAvailableCourts(
            response.parameters.date,
            response.parameters.duration.toString()
        );

        if (typeof response === 'string') {
            setErrorMessage(response);
            setIsLoading(false);
            return;
        }
        setConversation([
            ...conversation,
            { content: message, role: 'user' },
            {
                // This message is displayed when no courts are available
                content:
                    'No encontré canchas disponibles a este horario. Por favor reiniciá la conversación e intentá nuevamente.',
                role: 'courtList',
            },
        ]);
        setCourts((availableCourts as GetCourtsResponse).courts);
        setConversationDone(true);
        setIsLoading(false);
    };

    const handleKeypress = (e: any) => {
        // It's triggers by pressing the enter key
        if (e.keyCode == 13 && !e.shiftKey) {
            sendMessage(e);
            e.preventDefault();
        }
    };

    return (
        <div className="flex fixed flex-col h-[100svh] w-full">
            {/* Chat messages area */}
            <div className="flex-1 overflow-y-auto bg-gray-800">
                {/* If the chat is empty, show a default message */}
                {showEmptyChat ? (
                    <div className="h-full flex items-center justify-center text-2xl sm:text-4xl font-semibold text-gray-200">
                        Reservá tu cancha de Padel
                    </div>
                ) : (
                    // Else, display the chat messages
                    <div className="flex flex-col items-center text-sm bg-gray-800">
                        {conversation.map((msg, index) => (
                            <Message
                                key={index}
                                message={msg}
                                courts={courts}
                            />
                        ))}
                        {/* Scroll-to-bottom reference */}
                        <div ref={bottomOfChatRef}></div>
                    </div>
                )}
            </div>

            {/* Chat input form */}
            <div className="border-t border-white/20 bg-gray-800">
                {!conversationDone ? (
                    <form
                        className="m-2 flex gap-3 last:mb-2 md:mx-4 md:last:mb-6 lg:mx-auto lg:max-w-2xl xl:max-w-3xl"
                        onSubmit={sendMessage}
                    >
                        <div className="relative flex flex-col h-full flex-1 items-stretch md:flex-col">
                            {/* Error message display */}
                            {errorMessage && (
                                <span className="text-red-500 text-sm mb-2">
                                    {errorMessage}
                                </span>
                            )}

                            {/* Textarea and button container */}
                            <div className="flex p-4 flex-row items-center w-full py-2 flex-grow md:py-3 md:pl-4 relative border border-black/10 border-gray-900/50 text-white bg-gray-700 rounded-md shadow-[0_0_15px_rgba(0,0,0,0.10)]">
                                {/* Textarea for chat input */}
                                <textarea
                                    ref={textAreaRef}
                                    value={message}
                                    placeholder="Enviá tu mensaje"
                                    className="flex-1 rounded-md dark:bg-gray-700 resize-none"
                                    onChange={(e) => setMessage(e.target.value)}
                                    onKeyDown={handleKeypress}
                                />

                                {/* Send message button */}
                                <button
                                    disabled={isLoading || message.length === 0}
                                    className="p-2 rounded-md bg-transparent disabled:bg-gray-500 disabled:opacity-40"
                                >
                                    <FiSend className="h-4 w-4 text-white" />
                                </button>
                            </div>
                        </div>
                    </form>
                ) : (
                    // Conversation is done. Reset the chat
                    <div className="m-2 md:mx-4 lg:mx-auto lg:max-w-2xl xl:max-w-3xl flex justify-center">
                        <button
                            onClick={clearData}
                            className="px-4 py-2 bg-gray-500 text-white rounded-md"
                        >
                            Reiniciar la conversación
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatWindow;
