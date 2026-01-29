import React from 'react';

// Новогодние снежинки (оптимизированные)
const SNOWFLAKES = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    left: `${(i * 8.3) % 100}%`,
    delay: `${i * 0.4}s`,
    duration: `${8 + (i % 5) * 2}s`,
    size: `${10 + (i % 4) * 4}px`,
}));

const Snowflakes = React.memo(() => (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        {SNOWFLAKES.map((flake) => (
            <div
                key={flake.id}
                className="absolute text-white/60 animate-fall will-change-transform"
                style={{
                    left: flake.left,
                    animationDelay: flake.delay,
                    animationDuration: flake.duration,
                    fontSize: flake.size,
                }}
            >
                ❄
            </div>
        ))}
        <style>{`
      @keyframes fall {
        0% { transform: translateY(-20px) rotate(0deg); opacity: 0.6; }
        100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
      }
      .animate-fall { animation: fall linear infinite; }
    `}</style>
    </div>
));

Snowflakes.displayName = 'Snowflakes';

export default Snowflakes;
