import React from 'react';
import { GiTennisCourt } from 'react-icons/gi';
import { HiUser } from 'react-icons/hi';
import { TbCursorText } from 'react-icons/tb';

type Message = { role: string; content: string };
type Court = {
    establishmentId: number;
    name: string;
    numberOfAvailableCourts: number;
    reservationLink: string;
};
type Props = {
    message: Message;
    courts?: Court[]; // Optional, you might not always have this information
};

const Message = (props: Props) => {
    const { message, courts } = props;
    const { role, content: text } = message;
    console.log(JSON.stringify(courts));

    const isUser = role === 'user';
    const isCourtList = role === 'courtList';

    return (
        <div
            className={`group w-full text-gray-800 dark:text-gray-100 border-b border-black/10 dark:border-gray-900/50 ${
                isUser ? 'dark:bg-gray-800' : 'bg-gray-50 dark:bg-[#444654]'
            }`}
        >
            <div className="text-base gap-4 md:gap-6 md:max-w-2xl lg:max-w-xl xl:max-w-3xl flex lg:px-0 m-auto w-full">
                <div className="flex flex-row gap-4 md:gap-6 md:max-w-2xl lg:max-w-xl xl:max-w-3xl p-4 md:py-6 lg:px-0 m-auto w-full">
                    <div className="w-8 flex flex-col relative items-end">
                        <div className="relative h-7 w-7 p-1 rounded-sm text-white flex items-center justify-center bg-black/75 text-opacity-100r">
                            {isUser ? (
                                <HiUser className="h-4 w-4 text-white" />
                            ) : (
                                <GiTennisCourt className="h-4 w-4 text-white" />
                            )}
                        </div>
                    </div>
                    <div className="relative flex flex-col gap-1 md:gap-3">
                        <div className="flex flex-grow flex-col gap-3">
                            <div className="min-h-20 flex flex-col items-start gap-4 whitespace-pre-wrap break-words">
                                <div className="prose dark:prose-invert w-full break-words">
                                    {courts &&
                                    courts.length > 0 &&
                                    isCourtList ? (
                                        <ul className="list-none p-0">
                                            {courts.map((court) => (
                                                <li
                                                    key={court.establishmentId}
                                                    className="mb-2"
                                                >
                                                    <a
                                                        href={
                                                            court.reservationLink
                                                        }
                                                        className="block p-2 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition duration-300"
                                                    >
                                                        {court.name} - Canchas
                                                        disponibles:{' '}
                                                        {
                                                            court.numberOfAvailableCourts
                                                        }
                                                    </a>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : !isUser && text === null ? (
                                        <TbCursorText className="h-6 w-6 animate-pulse" />
                                    ) : (
                                        <p>{text}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Message;
