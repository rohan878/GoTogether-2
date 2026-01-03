import { useEffect, useState } from "react";

export function usePickupTimer(deadline?: string | null) {
  const [remaining, setRemaining] = useState<number>(0);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!deadline) return;

    const end = new Date(deadline).getTime();

    const tick = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((end - now) / 1000));
      setRemaining(diff);
      setExpired(diff <= 0);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline]);

  return { remaining, expired };
}
