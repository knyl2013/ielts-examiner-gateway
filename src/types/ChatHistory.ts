export type HistoryItem = {
    role: string,
    content: string
};

export type HistoryEntry = {
    id: string;
    date: Date;
    overallScore: number;
    callDuration?: number;
};