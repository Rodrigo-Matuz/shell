export interface ChangeStore {
    addChangeListener(callback: () => void): void;
    removeChangeListener(callback: () => void): void;
}

export function observeVoiceState<T>(stores: ChangeStore[], read: () => T, publish: (snapshot: T) => void): () => void {
    let stopped = false;
    let queued = false;
    const changed = () => {
        if (stopped || queued) return;
        queued = true;
        queueMicrotask(() => {
            queued = false;
            if (!stopped) publish(read());
        });
    };
    for (const store of stores) store.addChangeListener(changed);
    publish(read());
    return () => {
        stopped = true;
        for (const store of stores) store.removeChangeListener(changed);
    };
}
