import { useState, useEffect } from 'react';
import { getLocalFileUrl } from './db';

export function useLocalFile(url: string | undefined) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!url) {
      setResolvedUrl(null);
      return;
    }

    if (url.startsWith('local-file://')) {
      setIsLoading(true);
      getLocalFileUrl(url).then(resolved => {
        setResolvedUrl(resolved);
        setIsLoading(false);
      });
    } else {
      setResolvedUrl(url);
    }

    return () => {
      // Clean up blob URLs if they were created
      if (resolvedUrl && resolvedUrl.startsWith('blob:')) {
        URL.revokeObjectURL(resolvedUrl);
      }
    };
  }, [url]);

  return { resolvedUrl, isLoading };
}
