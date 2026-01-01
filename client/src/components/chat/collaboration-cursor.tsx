
interface CollaborationCursorProps {
  userName: string;
  color: string;
  position: {
    line: number;
    column: number;
  };
}

export function CollaborationCursor({ userName, color, position }: CollaborationCursorProps) {
  return (
    <div 
      className="absolute pointer-events-none z-50"
      style={{
        top: `${position.line * 20}px`,
        left: `${position.column * 8}px`
      }}
    >
      <div 
        className="w-0.5 h-5 animate-pulse"
        style={{ backgroundColor: color }}
      />
      <div 
        className="text-xs px-1.5 py-0.5 rounded whitespace-nowrap mt-1"
        style={{ backgroundColor: color, color: 'white' }}
      >
        {userName}
      </div>
    </div>
  );
}
