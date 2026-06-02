import React, { useState, useEffect, useRef } from 'react';

interface CatCompanionProps {
    enabled: boolean;
    total: number;
    numPassed: number;
}

const playMeow = () => {
    const meowUri = (window as any).meowAudioUri;
    if (meowUri) {
        const audio = new Audio(meowUri);
        audio.volume = 0.5;
        audio
            .play()
            .catch((err) => console.error('Failed to play audio:', err));
    }
};

export const CatCompanion: React.FC<CatCompanionProps> = ({
    enabled,
    total,
    numPassed,
}) => {
    const [catPos, setCatPos] = useState({
        left: 50,
        direction: 'left',
        speed: 2,
    });
    const [mousePos, setMousePos] = useState<number | null>(null);
    const [isBounceWalking, setIsBounceWalking] = useState(false);
    const [hearts, setHearts] = useState<
        { id: number; left: number; emoji: string }[]
    >([]);

    const catRef = useRef<HTMLDivElement>(null);

    const spawnFloatingEmoji = (emoji: string) => {
        let visualLeft = catPos.left;
        if (catRef.current && catRef.current.parentElement) {
            const catRect = catRef.current.getBoundingClientRect();
            const parentRect =
                catRef.current.parentElement.getBoundingClientRect();
            if (parentRect.width > 0) {
                visualLeft =
                    ((catRect.left - parentRect.left) / parentRect.width) * 100;
            }
        }

        const newHeart = {
            id: Date.now() + Math.random(),
            left: visualLeft,
            emoji: emoji,
        };
        setHearts((prev) => [...prev, newHeart]);
        setTimeout(() => {
            setHearts((prev) => prev.filter((h) => h.id !== newHeart.id));
        }, 1500);
    };

    const spawnTrophy = () => {
        spawnFloatingEmoji('🏆');
    };

    const prevSuccessRef = useRef(false);
    useEffect(() => {
        const isSuccess = total > 0 && numPassed === total;
        if (isSuccess && !prevSuccessRef.current) {
            spawnTrophy();
        }
        prevSuccessRef.current = isSuccess;
    }, [numPassed, total]);

    useEffect(() => {
        if (!enabled) {
            setMousePos(null);
            setIsBounceWalking(false);
            return;
        }

        let timeoutId: any;
        let reachTimeoutId: any;

        const nextMove = () => {
            const delaySeconds = Math.random() * 10 + 10; // random 10 to 20 seconds
            const delayMs = delaySeconds * 1000;
            const walkDuration = 5; // slow walk takes 5 seconds
            const nextLeft = Math.floor(Math.random() * 85); // 0 to 85%

            setCatPos((prev) => {
                const nextDirection = nextLeft > prev.left ? 'right' : 'left';

                // 30% chance to spawn a mouse
                const spawnMouse = Math.random() < 0.3;
                if (spawnMouse) {
                    setMousePos(nextLeft);
                    setIsBounceWalking(true);

                    if (reachTimeoutId) clearTimeout(reachTimeoutId);
                    reachTimeoutId = setTimeout(() => {
                        // Spawn satiety/food emojis!
                        const foodEmojis = [
                            '🐟',
                            '😋',
                            '🧀',
                            '🍖',
                            '🍗',
                            '🍤',
                            '🥛',
                            '🤤',
                        ];
                        const newParticles = [
                            {
                                id: Date.now() + Math.random(),
                                left: nextLeft + 1,
                                emoji: foodEmojis[
                                    Math.floor(
                                        Math.random() * foodEmojis.length,
                                    )
                                ],
                            },
                            {
                                id: Date.now() + Math.random(),
                                left: nextLeft + 3,
                                emoji: foodEmojis[
                                    Math.floor(
                                        Math.random() * foodEmojis.length,
                                    )
                                ],
                            },
                        ];

                        setHearts((prevHearts) => [
                            ...prevHearts,
                            ...newParticles,
                        ]);

                        setTimeout(() => {
                            setHearts((prevHearts) =>
                                prevHearts.filter(
                                    (h) =>
                                        !newParticles.some(
                                            (np) => np.id === h.id,
                                        ),
                                ),
                            );
                        }, 1500);

                        setMousePos(null);
                        setIsBounceWalking(false);
                    }, walkDuration * 1000);
                } else {
                    setMousePos(null);
                    setIsBounceWalking(false);
                }

                return {
                    left: nextLeft,
                    direction: nextDirection,
                    speed: walkDuration,
                };
            });

            timeoutId = setTimeout(nextMove, delayMs);
        };

        timeoutId = setTimeout(nextMove, 1000);

        return () => {
            clearTimeout(timeoutId);
            if (reachTimeoutId) clearTimeout(reachTimeoutId);
        };
    }, [enabled]);

    const spawnHeart = (e: React.MouseEvent) => {
        e.stopPropagation();
        playMeow();

        const emojis = ['❤️', '💖', '💝', '💕', '💗'];
        const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
        spawnFloatingEmoji(randomEmoji);
    };

    return (
        <>
            {hearts.map((heart) => {
                return (
                    <div
                        key={heart.id}
                        className="floating-heart"
                        style={{
                            left: `${heart.left}%`,
                        }}
                    >
                        {heart.emoji}
                    </div>
                );
            })}
            {mousePos !== null && (
                <div
                    className="mouse-emoji"
                    style={{
                        left: `${mousePos}%`,
                    }}
                >
                    🐁
                </div>
            )}
            <div
                ref={catRef}
                className="cat-emoji"
                style={{
                    left: `${catPos.left}%`,
                    transition: `left ${catPos.speed}s ease-in-out`,
                    cursor: 'pointer',
                }}
                onClick={spawnHeart}
            >
                <span
                    className="cat-flip"
                    style={{
                        display: 'inline-block',
                        transform:
                            catPos.direction === 'right'
                                ? 'scaleX(-1)'
                                : 'scaleX(1)',
                        transition: 'transform 0.3s ease',
                    }}
                >
                    <span
                        className={`cat-bounce ${
                            isBounceWalking ? 'bounce-walk' : ''
                        }`}
                        style={{ display: 'inline-block' }}
                    >
                        🐈
                    </span>
                </span>
            </div>
        </>
    );
};
