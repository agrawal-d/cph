import React, { useState, useEffect, useRef, useCallback } from 'react';

// Props for the companion component.
// - enabled: whether the cat companion should run/animate
// - total / numPassed: used to detect when all tests passed (to spawn a trophy)
interface CatCompanionProps {
    enabled: boolean;
    total: number;
    numPassed: number;
}

// direction the cat is facing. Used to flip the emoji horizontally.
type CatDirection = 'left' | 'right';

// visual state for the cat's position and animation speed.
interface CatPosition {
    left: number; // percentage from left of container
    direction: CatDirection;
    speed: number; // seconds for transition animation
}

// represents a transient floating particle (emoji) that fades out.
interface FloatingEmoji {
    id: number; // unique identifier for removal
    left: number; // percentage from left where it appears
    emoji: string; // character to render
}

// default starting values for the cat visual.
const INITIAL_CAT_POSITION: CatPosition = {
    left: 50,
    direction: 'left',
    speed: 2,
};
const PARTICLE_LIFETIME_MS = 1500;
const INITIAL_MOVE_DELAY_MS = 1000;
const MIN_MOVE_DELAY_MS = 10000;
const MOVE_DELAY_RANGE_MS = 10000;
const WALK_DURATION_SECONDS = 5;
const MAX_CAT_LEFT_PERCENT = 85;
const MOUSE_SPAWN_CHANCE = 0.3;
const FOOD_OFFSET_PERCENT = 2;
const MEOW_VOLUME = 0.5;
const FOOD_EMOJIS = ['😋', '🧀', '🍖', '🍗'];
const HEART_EMOJIS = ['❤️', '💖', '💝', '💕', '💗'];

// pick a random element from an array.
const getRandomItem = <T,>(items: T[]): T =>
    items[Math.floor(Math.random() * items.length)];

// Clamp a numeric value to a 0-100 range (used for percentage positions).
const clampPercent = (value: number) => Math.max(0, Math.min(100, value));

// Reads an externally-provided audio URI from the global `window` object.
// The audio file is optional; callers should handle undefined.
const getMeowUri = () => {
    const meowUri = (window as any).meowAudioUri;
    return typeof meowUri === 'string' ? meowUri : undefined;
};

export const CatCompanion: React.FC<CatCompanionProps> = ({
    enabled,
    total,
    numPassed,
}) => {
    // Visual state and particles
    const [catPos, setCatPos] = useState(INITIAL_CAT_POSITION);
    const [mousePos, setMousePos] = useState<number | null>(null); // where a mouse appears
    const [isBounceWalking, setIsBounceWalking] = useState(false); // alternate walk animation
    const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);

    // Refs used to hold DOM, timers and values across renders without re-triggering effects
    const catRef = useRef<HTMLDivElement>(null);
    const catLeftRef = useRef(INITIAL_CAT_POSITION.left); // last-known numeric left percent
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const moveCatRef = useRef<(() => void) | null>(null); // holds scheduled move function
    const timeoutIdsRef = useRef<ReturnType<typeof setTimeout>[]>([]); // active timeouts to clear

    // Keep every delayed state update cancellable when the companion unmounts.
    const clearScheduledTimeouts = useCallback(() => {
        timeoutIdsRef.current.forEach(clearTimeout);
        timeoutIdsRef.current = [];
    }, []);

    // A small wrapper around `setTimeout` that remembers active timers so they
    // can be cleared when the component unmounts or when animations are stopped.
    const scheduleTimeout = useCallback(
        (callback: () => void, delay: number) => {
            const timeoutId = setTimeout(() => {
                // remove the id from the tracked list when it fires
                timeoutIdsRef.current = timeoutIdsRef.current.filter(
                    (id) => id !== timeoutId,
                );
                callback();
            }, delay);

            timeoutIdsRef.current.push(timeoutId);
            return timeoutId;
        },
        [],
    );

    // Play a short meow sound if a URI is provided on `window.meowAudioUri`.
    // This uses a single `HTMLAudioElement` instance cached in `audioRef`.
    const playMeow = useCallback(() => {
        const meowUri = getMeowUri();
        if (!meowUri) {
            return;
        }

        if (!audioRef.current || audioRef.current.src !== meowUri) {
            audioRef.current = new Audio(meowUri);
            audioRef.current.volume = MEOW_VOLUME;
        }

        audioRef.current.currentTime = 0;
        audioRef.current
            .play()
            .catch((err) => console.error('Failed to play audio:', err));
    }, []);

    // Particles (floating emojis) should start from the cat's current rendered
    // position. We compute the visual left percent by measuring the DOM.
    const getCatVisualLeft = useCallback(() => {
        if (!catRef.current || !catRef.current.parentElement) {
            return catLeftRef.current;
        }

        const catRect = catRef.current.getBoundingClientRect();
        const parentRect = catRef.current.parentElement.getBoundingClientRect();
        if (parentRect.width <= 0) {
            return catLeftRef.current;
        }

        return clampPercent(
            ((catRect.left - parentRect.left) / parentRect.width) * 100,
        );
    }, []);

    // Create a floating emoji particle at the given `left` percent
    // (defaults to the cat's visual left).
    // The particle will be removed after `PARTICLE_LIFETIME_MS`.
    const spawnFloatingEmoji = useCallback(
        (emoji: string, left = getCatVisualLeft()) => {
            const newFloatingEmoji = {
                id: Date.now() + Math.random(),
                left: clampPercent(left),
                emoji,
            };

            setFloatingEmojis((prev) => [...prev, newFloatingEmoji]);
            scheduleTimeout(() => {
                setFloatingEmojis((prev) =>
                    prev.filter((item) => item.id !== newFloatingEmoji.id),
                );
            }, PARTICLE_LIFETIME_MS);
        },
        [getCatVisualLeft, scheduleTimeout],
    );

    // convenience helpers for commonly spawned particles.
    const spawnTrophy = useCallback(() => {
        spawnFloatingEmoji('🏆');
    }, [spawnFloatingEmoji]);

    const spawnFoodEmoji = useCallback(
        (left: number) => {
            // offset a bit so the food appears slightly to the right of the mouse
            spawnFloatingEmoji(
                getRandomItem(FOOD_EMOJIS),
                left + FOOD_OFFSET_PERCENT,
            );
        },
        [spawnFloatingEmoji],
    );

    // Handler for user clicking the cat: spawn a heart and optionally play meow.
    const spawnHeart = (e: React.MouseEvent) => {
        e.stopPropagation();
        playMeow();
        spawnFloatingEmoji(getRandomItem(HEART_EMOJIS));
    };

    // Move the cat to a new random location after a randomized delay.
    // Sometimes a "mouse" spawns and the cat does a special bounce-walk,
    // after which a food emoji appears and the mouse disappears.
    const moveCat = useCallback(() => {
        const delayMs = Math.random() * MOVE_DELAY_RANGE_MS + MIN_MOVE_DELAY_MS;
        const nextLeft = Math.floor(Math.random() * MAX_CAT_LEFT_PERCENT);

        setCatPos((prev) => {
            const nextDirection: CatDirection =
                nextLeft > prev.left ? 'right' : 'left';
            const shouldSpawnMouse = Math.random() < MOUSE_SPAWN_CHANCE;
            catLeftRef.current = nextLeft;

            if (shouldSpawnMouse) {
                setMousePos(nextLeft);
                setIsBounceWalking(true);

                scheduleTimeout(() => {
                    spawnFoodEmoji(nextLeft);
                    setMousePos(null);
                    setIsBounceWalking(false);
                }, WALK_DURATION_SECONDS * 1000);
            } else {
                setMousePos(null);
                setIsBounceWalking(false);
            }

            return {
                left: nextLeft,
                direction: nextDirection,
                speed: WALK_DURATION_SECONDS,
            };
        });

        // schedule next move
        scheduleTimeout(() => moveCatRef.current?.(), delayMs);
    }, [scheduleTimeout, spawnFoodEmoji]);

    // Keep a ref pointing to the move function so scheduled timeouts can call
    // the latest version without needing to re-register effects.
    useEffect(() => {
        moveCatRef.current = moveCat;
    }, [moveCat]);

    // When all tests succeed (numPassed === total) spawn a trophy once.
    const prevSuccessRef = useRef(false);
    useEffect(() => {
        const isSuccess = total > 0 && numPassed === total;
        if (isSuccess && !prevSuccessRef.current) {
            spawnTrophy();
        }
        prevSuccessRef.current = isSuccess;
    }, [numPassed, spawnTrophy, total]);

    // Start or stop the companion based on `enabled` prop.
    // When enabled schedule the first cat movement; when disabled clear state
    // and cancel scheduled timeouts to avoid leaks.
    useEffect(() => {
        if (!enabled) {
            setMousePos(null);
            setIsBounceWalking(false);
            setFloatingEmojis([]);
            clearScheduledTimeouts();
            return;
        }

        scheduleTimeout(moveCat, INITIAL_MOVE_DELAY_MS);

        return clearScheduledTimeouts;
    }, [clearScheduledTimeouts, enabled, moveCat, scheduleTimeout]);

    const catStyle: React.CSSProperties = {
        left: `${catPos.left}%`,
        transition: `left ${catPos.speed}s ease-in-out`,
        cursor: 'pointer',
    };
    const catFlipStyle: React.CSSProperties = {
        display: 'inline-block',
        transform: catPos.direction === 'right' ? 'scaleX(-1)' : 'scaleX(1)',
        transition: 'transform 0.3s ease',
    };

    return (
        <>
            {floatingEmojis.map((floatingEmoji) => {
                return (
                    <div
                        key={floatingEmoji.id}
                        className="floating-heart"
                        style={{
                            left: `${floatingEmoji.left}%`,
                        }}
                    >
                        {floatingEmoji.emoji}
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
                style={catStyle}
                onClick={spawnHeart}
            >
                <span className="cat-flip" style={catFlipStyle}>
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
