import React from 'react';

const LoadingSkeleton = ({ rows = 5 }) => {
    return (
        <div className="w-full space-y-4 animate-pulse">
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex gap-4">
                    <div className="h-10 bg-[var(--surface)] rounded flex-1 border border-[var(--border)]"></div>
                    <div className="h-10 bg-[var(--surface)] rounded flex-1 border border-[var(--border)] hidden sm:block"></div>
                    <div className="h-10 bg-[var(--surface)] rounded flex-1 border border-[var(--border)] hidden md:block"></div>
                </div>
            ))}
        </div>
    );
};
export default LoadingSkeleton;
