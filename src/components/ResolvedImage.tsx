import React from 'react';
import { useLocalFile } from '../lib/useLocalFile';

interface ResolvedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
}

export default function ResolvedImage({ src, ...props }: ResolvedImageProps) {
  const { resolvedUrl } = useLocalFile(src);

  if (!resolvedUrl) {
    return <div className={`animate-pulse bg-white/5 ${props.className}`} />;
  }

  return <img {...props} src={resolvedUrl} />;
}
